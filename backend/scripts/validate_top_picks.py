from __future__ import annotations

from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Optional

import pandas as pd

from app.core.supabase import get_supabase_admin
from app.services.indicators import IndicatorService
from app.services.strategies.stage3_conviction import add_stage3_conviction_features
from app.services.strategies.stage3_fundamentals import (
    prepare_quarterly_fundamentals,
    merge_fundamentals_into_daily,
    add_stage3_fundamental_features,
)


CAPITAL = 500000
RISK_PCT = 0.01
LOOKAHEAD_DAYS = 10
MIN_HISTORY_BARS = 60
TOP_PICKS_LIMIT = 3

# Sweep ranges
STOP_ATR_MULTIPLES = [1.5, 2.0]
TARGET_R_MULTIPLES = [1.5]
MIN_SCORE_VALUES = [65]

MIN_RISK_REWARD = 1.3
MAX_RISK_PCT = 5.0

# Fundamentals CSV search paths
FUNDAMENTALS_CSV_CANDIDATES = [
    Path("output/fundamentals_quarterly.csv"),
    Path("app/data/fundamentals_quarterly.csv"),
    Path("app/data/fundamentals.csv"),
]


def _safe_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except Exception:
        pass
    return float(value)


def _safe_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except Exception:
        pass
    return int(value)


def load_prepared_fundamentals() -> pd.DataFrame:
    """
    Loads quarterly fundamentals from CSV if available.

    Expected columns:
        - symbol
        - report_date
        - promoter_holding_pct
        - debt_to_equity

    Returns prepared fundamentals with change columns.
    If file is missing, returns empty prepared dataframe.
    """
    csv_path = next((p for p in FUNDAMENTALS_CSV_CANDIDATES if p.exists()), None)

    if csv_path is None:
        print("No fundamentals CSV found. Stage 3 fundamentals will remain neutral.")
        return prepare_quarterly_fundamentals(
            pd.DataFrame(columns=["symbol", "report_date", "promoter_holding_pct", "debt_to_equity"])
        )

    fund_df = pd.read_csv(csv_path)
    required_cols = {"symbol", "report_date", "promoter_holding_pct", "debt_to_equity"}
    missing = required_cols - set(fund_df.columns)
    if missing:
        raise ValueError(
            f"Fundamentals file {csv_path} is missing columns: {sorted(missing)}"
        )

    print(f"Loaded fundamentals from: {csv_path}")
    return prepare_quarterly_fundamentals(fund_df)


def _build_simple_recommendation(
    last_row: dict,
    capital: int = CAPITAL,
    risk_pct: float = RISK_PCT,
    stop_atr_multiple: float = 1.5,
    target_r_multiple: float = 2.0,
):
    close = _safe_float(last_row.get("close"))
    breakout = _safe_float(last_row.get("breakout_20_high_prev"))
    sma_20 = _safe_float(last_row.get("sma_20"))
    sma_50 = _safe_float(last_row.get("sma_50"))
    ema_20 = _safe_float(last_row.get("ema_20"))
    rsi_14 = _safe_float(last_row.get("rsi_14"))
    atr_14 = _safe_float(last_row.get("atr_14"))
    volume = _safe_float(last_row.get("volume"))
    volume_avg_20 = _safe_float(last_row.get("volume_avg_20"))
    momentum_20d = _safe_float(last_row.get("momentum_20d"))

    # Stage 3 fields
    promoter_holding_pct = _safe_float(last_row.get("promoter_holding_pct"))
    promoter_holding_change = _safe_float(last_row.get("promoter_holding_change"))
    debt_to_equity = _safe_float(last_row.get("debt_to_equity"))
    debt_to_equity_change = _safe_float(last_row.get("debt_to_equity_change"))
    stage3_fundamental_score = _safe_float(last_row.get("stage3_fundamental_score")) or 0
    stage3_fundamental_pass = bool(last_row.get("stage3_fundamental_pass", True))
    conviction_score = _safe_float(last_row.get("stage3_conviction_score")) or 0
    conviction_pass = bool(last_row.get("stage3_conviction_pass", False))

    if close is None or breakout is None or atr_14 is None or atr_14 <= 0:
        return None

    if not stage3_fundamental_pass:
        return None

    near_breakout = close >= breakout * 0.99
    above_breakout = close >= breakout

    breakout_extension_pct = (close - breakout) / breakout if breakout else 0
    if breakout_extension_pct > 0.02:
        return None

    trend_ok = sma_20 is not None and sma_50 is not None and close > sma_20 > sma_50
    ema_ok = ema_20 is not None and close > ema_20
    rsi_ok = rsi_14 is not None and 55 <= rsi_14 <= 70
    momentum_ok = momentum_20d is not None and momentum_20d > 0
    volume_ok = (
        volume is not None
        and volume_avg_20 is not None
        and volume_avg_20 > 0
        and volume >= volume_avg_20 * 1.5
    )
    compression_ok = (
        sma_20 is not None
        and sma_50 is not None
        and sma_50 != 0
        and abs(sma_20 - sma_50) / sma_50 < 0.05
    )

    if not above_breakout or not trend_ok or not ema_ok or not rsi_ok or not momentum_ok:
        return None

    if not compression_ok:
        return None

    # Stage 3A hard filter: reject weak breakout candles.
    if not conviction_pass:
        return None

    base_score = 0
    rationale_parts: list[str] = []
    factor_breakdown: dict[str, int | float] = {}

    if near_breakout:
        base_score += 25
        factor_breakdown["near_breakout"] = 25
        rationale_parts.append("Near breakout")

    if above_breakout:
        base_score += 20
        factor_breakdown["above_breakout"] = 20
        rationale_parts.append("Above breakout")

    if trend_ok:
        base_score += 20
        factor_breakdown["trend_alignment"] = 20
        rationale_parts.append("Trend aligned")

    if ema_ok:
        base_score += 10
        factor_breakdown["ema_support"] = 10
        rationale_parts.append("Above EMA20")

    if rsi_ok:
        base_score += 10
        factor_breakdown["rsi_support"] = 10
        rationale_parts.append("RSI 55-70")

    if momentum_ok:
        base_score += 10
        factor_breakdown["momentum_support"] = 10
        rationale_parts.append("Positive momentum")

    if volume_ok:
        base_score += 5
        factor_breakdown["volume_support"] = 5
        rationale_parts.append("Volume > 1.2x avg")

    total_score = base_score + stage3_fundamental_score + conviction_score

    if stage3_fundamental_score:
        factor_breakdown["stage3_fundamentals"] = round(stage3_fundamental_score, 2)
        rationale_parts.append(f"Stage3 fundamentals {round(stage3_fundamental_score, 2)}")

    if conviction_score:
        factor_breakdown["stage3_conviction"] = round(conviction_score, 2)
        rationale_parts.append(f"Conviction {round(conviction_score, 2)}")

    if promoter_holding_change is not None:
        rationale_parts.append(f"Promoter Δ {round(promoter_holding_change, 2)}")

    if debt_to_equity_change is not None:
        rationale_parts.append(f"D/E Δ {round(debt_to_equity_change, 2)}")

    if total_score < 45:
        return None

    entry_price = round(breakout, 2)
    stop_loss = round(entry_price - atr_14 * stop_atr_multiple, 2)

    risk_per_share = entry_price - stop_loss
    if risk_per_share <= 0:
        return None

    target_price = round(entry_price + risk_per_share * target_r_multiple, 2)

    risk_capital = capital * risk_pct
    position_qty = max(int(risk_capital / risk_per_share), 1)
    risk_reward = round((target_price - entry_price) / risk_per_share, 2)

    return {
        "signal_type": "BREAKOUT",
        "score": round(total_score, 2),
        "base_score": round(base_score, 2),
        "stage3_fundamental_score": round(stage3_fundamental_score, 2),
        "stage3_conviction_score": round(conviction_score, 2),
        "stage3_conviction_pass": conviction_pass,
        "entry_price": entry_price,
        "stop_loss": stop_loss,
        "target_price": target_price,
        "risk_reward": risk_reward,
        "position_qty": position_qty,
        "rationale": "; ".join(rationale_parts),
        "factor_breakdown": factor_breakdown,
        "promoter_holding_pct": promoter_holding_pct,
        "promoter_holding_change": promoter_holding_change,
        "debt_to_equity": debt_to_equity,
        "debt_to_equity_change": debt_to_equity_change,
    }


def _select_top_picks(
    recommendations: list[tuple[dict, dict]],
    min_score: int,
) -> list[tuple[dict, dict]]:
    top_picks: list[tuple[dict, dict]] = []

    for inst, rec in recommendations:
        entry = rec.get("entry_price")
        stop = rec.get("stop_loss")
        target = rec.get("target_price")

        if not entry or not stop or not target:
            continue

        risk = entry - stop
        reward = target - entry

        if risk <= 0 or reward <= 0:
            continue

        risk_pct = (risk / entry) * 100
        reward_pct = (reward / entry) * 100
        risk_reward = reward / risk

        if rec["score"] < min_score:
            continue
        if risk_reward < MIN_RISK_REWARD:
            continue
        if risk_pct > MAX_RISK_PCT:
            continue
        if rec["signal_type"] not in ["BUY", "BREAKOUT"]:
            continue

        rec_with_metrics = {
            **rec,
            "risk_pct": round(risk_pct, 2),
            "reward_pct": round(reward_pct, 2),
            "risk_reward": round(risk_reward, 2),
        }

        if rec["score"] >= 80:
            reason = "High score with strong setup"
        elif rec["signal_type"] == "BREAKOUT":
            reason = "Breakout setup with momentum"
        else:
            reason = "Low risk buy setup"

        rec_with_metrics["top_pick_reason"] = reason
        top_picks.append((inst, rec_with_metrics))

    top_picks.sort(
        key=lambda x: (
            -x[1]["score"],
            -x[1]["risk_reward"],
            x[1]["risk_pct"],
        )
    )
    return top_picks[:TOP_PICKS_LIMIT]


@dataclass
class TradeResult:
    config_name: str
    stop_atr_multiple: float
    target_r_multiple: float
    min_score: int
    as_of_date: str
    symbol: str
    signal_type: str
    score: float
    base_score: Optional[float]
    stage3_fundamental_score: Optional[float]
    stage3_conviction_score: Optional[float]
    stage3_conviction_pass: Optional[bool]
    promoter_holding_pct: Optional[float]
    promoter_holding_change: Optional[float]
    debt_to_equity: Optional[float]
    debt_to_equity_change: Optional[float]
    entry_price: float
    stop_loss: float
    target_price: float
    risk_pct: float
    reward_pct: float
    risk_reward: float
    position_qty: int
    top_pick_reason: str
    rationale: str
    outcome: str
    days_to_outcome: Optional[int]
    outcome_date: Optional[str]
    return_pct_at_exit: Optional[float]


def fetch_active_instruments() -> list[dict]:
    supabase = get_supabase_admin()
    rows = (
        supabase.table("instruments")
        .select("id,symbol")
        .eq("is_active", True)
        .order("symbol")
        .execute()
    ).data or []
    return rows


def fetch_bars_for_instrument(instrument_id: str) -> pd.DataFrame:
    supabase = get_supabase_admin()
    rows = (
        supabase.table("daily_bars")
        .select("trade_date,open,high,low,close,adj_close,volume")
        .eq("instrument_id", instrument_id)
        .order("trade_date")
        .execute()
    ).data or []

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    df["trade_date"] = pd.to_datetime(df["trade_date"])
    for col in ["open", "high", "low", "close", "adj_close", "volume"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df.sort_values("trade_date").reset_index(drop=True)


def evaluate_trade_outcome(
    future_bars: pd.DataFrame,
    entry_price: float,
    stop_loss: float,
    target_price: float,
) -> tuple[str, Optional[int], Optional[str], Optional[float]]:
    if future_bars.empty:
        return "OPEN", None, None, None

    for idx, (_, row) in enumerate(future_bars.iterrows(), start=1):
        low = _safe_float(row.get("low"))
        high = _safe_float(row.get("high"))
        trade_date = row["trade_date"].date().isoformat()

        stop_hit = low is not None and low <= stop_loss
        target_hit = high is not None and high >= target_price

        if stop_hit and target_hit:
            return "STOP_HIT", idx, trade_date, round(((stop_loss - entry_price) / entry_price) * 100, 2)
        if stop_hit:
            return "STOP_HIT", idx, trade_date, round(((stop_loss - entry_price) / entry_price) * 100, 2)
        if target_hit:
            return "TARGET_HIT", idx, trade_date, round(((target_price - entry_price) / entry_price) * 100, 2)

    last_close = _safe_float(future_bars.iloc[-1].get("close"))
    open_return = None
    if last_close is not None:
        open_return = round(((last_close - entry_price) / entry_price) * 100, 2)

    return "OPEN", len(future_bars), future_bars.iloc[-1]["trade_date"].date().isoformat(), open_return


def build_asof_top_picks(
    instruments: list[dict],
    instrument_bars: dict[str, pd.DataFrame],
    prepared_fund_df: pd.DataFrame,
    as_of_date: pd.Timestamp,
    stop_atr_multiple: float,
    target_r_multiple: float,
    min_score: int,
) -> list[tuple[dict, dict]]:
    generated: list[tuple[dict, dict]] = []

    for inst in instruments:
        df = instrument_bars.get(inst["id"])
        if df is None or df.empty:
            continue

        hist = df[df["trade_date"] <= as_of_date].copy()
        if len(hist) < MIN_HISTORY_BARS:
            continue

        ind_df = IndicatorService.compute(hist)

        # Prepare for stage3 daily/quarterly alignment
        ind_df = ind_df.rename(columns={"trade_date": "date"})
        ind_df["symbol"] = inst["symbol"]

        # Stage 3B: fundamentals
        ind_df = merge_fundamentals_into_daily(
            stock_df=ind_df,
            prepared_fund_df=prepared_fund_df,
            symbol=inst["symbol"],
        )
        ind_df = add_stage3_fundamental_features(ind_df)

        # Stage 3A: conviction
        ind_df = add_stage3_conviction_features(ind_df)

        last = ind_df.iloc[-1].to_dict()
        rec = _build_simple_recommendation(
            last,
            stop_atr_multiple=stop_atr_multiple,
            target_r_multiple=target_r_multiple,
        )
        if rec:
            generated.append((inst, rec))

    generated.sort(key=lambda x: x[1]["score"], reverse=True)
    generated = generated[:5]
    return _select_top_picks(generated, min_score=min_score)


def summarize_config(results_df: pd.DataFrame, config_name: str) -> dict[str, Any]:
    group = results_df[results_df["config_name"] == config_name].copy()

    if group.empty:
        return {
            "config_name": config_name,
            "total_trades": 0,
            "target_hit_rate_pct": 0,
            "stop_hit_rate_pct": 0,
            "open_rate_pct": 0,
            "avg_return_pct": 0,
            "median_return_pct": 0,
            "avg_days_to_outcome": 0,
            "avg_stage3_fundamental_score": 0,
            "avg_conviction_score": 0,
            "conviction_pass_rate_pct": 0,
            "avg_promoter_holding_change": 0,
            "avg_debt_to_equity_change": 0,
            "breakout_count": 0,
            "breakout_avg_return_pct": 0,
            "buy_count": 0,
            "buy_avg_return_pct": 0,
        }

    total = len(group)
    target_hits = (group["outcome"] == "TARGET_HIT").sum()
    stop_hits = (group["outcome"] == "STOP_HIT").sum()
    open_count = (group["outcome"] == "OPEN").sum()

    breakout_group = group[group["signal_type"] == "BREAKOUT"]
    buy_group = group[group["signal_type"] == "BUY"]

    return {
        "config_name": config_name,
        "stop_atr_multiple": group["stop_atr_multiple"].iloc[0],
        "target_r_multiple": group["target_r_multiple"].iloc[0],
        "min_score": group["min_score"].iloc[0],
        "total_trades": total,
        "target_hit_rate_pct": round(target_hits / total * 100, 2),
        "stop_hit_rate_pct": round(stop_hits / total * 100, 2),
        "open_rate_pct": round(open_count / total * 100, 2),
        "avg_return_pct": round(group["return_pct_at_exit"].dropna().mean(), 2),
        "median_return_pct": round(group["return_pct_at_exit"].dropna().median(), 2),
        "avg_days_to_outcome": round(group["days_to_outcome"].dropna().mean(), 2),
        "avg_stage3_fundamental_score": round(group["stage3_fundamental_score"].dropna().mean(), 2),
        "avg_conviction_score": round(group["stage3_conviction_score"].dropna().mean(), 2),
        "conviction_pass_rate_pct": round(group["stage3_conviction_pass"].fillna(False).mean() * 100, 2),
        "avg_promoter_holding_change": round(group["promoter_holding_change"].dropna().mean(), 4),
        "avg_debt_to_equity_change": round(group["debt_to_equity_change"].dropna().mean(), 4),
        "breakout_count": len(breakout_group),
        "breakout_avg_return_pct": round(
            breakout_group["return_pct_at_exit"].dropna().mean(), 2
        ) if not breakout_group.empty else 0,
        "buy_count": len(buy_group),
        "buy_avg_return_pct": round(
            buy_group["return_pct_at_exit"].dropna().mean(), 2
        ) if not buy_group.empty else 0,
    }


def main():
    instruments = fetch_active_instruments()
    if not instruments:
        raise RuntimeError("No active instruments found.")

    prepared_fund_df = load_prepared_fundamentals()

    instrument_bars: dict[str, pd.DataFrame] = {}
    all_trade_dates = set()

    print(f"Loading bars for {len(instruments)} instruments...")
    for inst in instruments:
        df = fetch_bars_for_instrument(inst["id"])
        if df.empty:
            continue
        instrument_bars[inst["id"]] = df
        all_trade_dates.update(df["trade_date"].dt.date.tolist())

    if not all_trade_dates:
        raise RuntimeError("No daily_bars data found.")

    sorted_dates = sorted(all_trade_dates)
    validation_dates = sorted_dates[-60:]

    results: list[TradeResult] = []

    configs = []
    for stop_mult in STOP_ATR_MULTIPLES:
        for target_mult in TARGET_R_MULTIPLES:
            for min_score in MIN_SCORE_VALUES:
                configs.append((stop_mult, target_mult, min_score))

    print(f"Running {len(configs)} configurations across {len(validation_dates)} trading days...")

    for stop_mult, target_mult, min_score in configs:
        config_name = f"stop_{stop_mult}_target_{target_mult}_score_{min_score}"
        print(f"Testing {config_name}")

        for as_of_day in validation_dates:
            as_of_ts = pd.Timestamp(as_of_day)
            selected = build_asof_top_picks(
                instruments=instruments,
                instrument_bars=instrument_bars,
                prepared_fund_df=prepared_fund_df,
                as_of_date=as_of_ts,
                stop_atr_multiple=stop_mult,
                target_r_multiple=target_mult,
                min_score=min_score,
            )

            for inst, rec in selected:
                df = instrument_bars.get(inst["id"])
                if df is None or df.empty:
                    continue

                future = df[df["trade_date"] > as_of_ts].head(LOOKAHEAD_DAYS).copy()

                outcome, days_to_outcome, outcome_date, return_pct = evaluate_trade_outcome(
                    future_bars=future,
                    entry_price=rec["entry_price"],
                    stop_loss=rec["stop_loss"],
                    target_price=rec["target_price"],
                )

                results.append(
                    TradeResult(
                        config_name=config_name,
                        stop_atr_multiple=stop_mult,
                        target_r_multiple=target_mult,
                        min_score=min_score,
                        as_of_date=as_of_day.isoformat(),
                        symbol=inst["symbol"],
                        signal_type=rec["signal_type"],
                        score=rec["score"],
                        base_score=_safe_float(rec.get("base_score")),
                        stage3_fundamental_score=_safe_float(rec.get("stage3_fundamental_score")),
                        stage3_conviction_score=_safe_float(rec.get("stage3_conviction_score")),
                        stage3_conviction_pass=rec.get("stage3_conviction_pass"),
                        promoter_holding_pct=_safe_float(rec.get("promoter_holding_pct")),
                        promoter_holding_change=_safe_float(rec.get("promoter_holding_change")),
                        debt_to_equity=_safe_float(rec.get("debt_to_equity")),
                        debt_to_equity_change=_safe_float(rec.get("debt_to_equity_change")),
                        entry_price=rec["entry_price"],
                        stop_loss=rec["stop_loss"],
                        target_price=rec["target_price"],
                        risk_pct=rec["risk_pct"],
                        reward_pct=rec["reward_pct"],
                        risk_reward=rec["risk_reward"],
                        position_qty=rec["position_qty"],
                        top_pick_reason=rec["top_pick_reason"],
                        rationale=rec["rationale"],
                        outcome=outcome,
                        days_to_outcome=days_to_outcome,
                        outcome_date=outcome_date,
                        return_pct_at_exit=return_pct,
                    )
                )

    results_df = pd.DataFrame([asdict(r) for r in results])

    summary_rows = []
    for stop_mult, target_mult, min_score in configs:
        config_name = f"stop_{stop_mult}_target_{target_mult}_score_{min_score}"
        summary_rows.append(summarize_config(results_df, config_name))

    summary_df = pd.DataFrame(summary_rows)
    summary_df = summary_df.sort_values(
        by=["avg_return_pct", "target_hit_rate_pct", "total_trades"],
        ascending=[False, False, False],
    ).reset_index(drop=True)

    output_dir = Path("output")
    output_dir.mkdir(parents=True, exist_ok=True)

    trades_path = output_dir / "top_picks_validation_trades.csv"
    summary_path = output_dir / "top_picks_parameter_sweep_summary.csv"

    results_df.to_csv(trades_path, index=False)
    summary_df.to_csv(summary_path, index=False)

    print(f"Done. Trades written to: {trades_path}")
    print(f"Done. Sweep summary written to: {summary_path}")
    print(summary_df.to_string(index=False))


if __name__ == "__main__":
    main()


