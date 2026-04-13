from datetime import date

import pandas as pd
from fastapi import APIRouter, HTTPException

from app.core.supabase import get_supabase_admin
from app.services.indicators import IndicatorService
from app.services.yahoo_finance import YahooFinanceService

router = APIRouter(prefix="/api/v2", tags=["recommendations"])


def _safe_float(value):
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except Exception:
        pass
    return float(value)


def _safe_int(value):
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except Exception:
        pass
    return int(value)


def _build_simple_recommendation(last_row, capital=500000, risk_pct=0.01):
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

    if close is None or breakout is None or atr_14 is None or atr_14 <= 0:
        return None

    score = 0
    rationale_parts = []
    factor_breakdown = {}

    near_breakout = close >= breakout * 0.99
    above_breakout = close >= breakout
    trend_ok = sma_20 is not None and sma_50 is not None and close > sma_20 > sma_50
    ema_ok = ema_20 is not None and close > ema_20
    rsi_ok = rsi_14 is not None and 50 <= rsi_14 <= 75
    momentum_ok = momentum_20d is not None and momentum_20d > -2
    volume_ok = (
        volume is not None
        and volume_avg_20 is not None
        and volume_avg_20 > 0
        and volume >= volume_avg_20 * 1.0
    )

    if near_breakout:
        score += 25
        factor_breakdown["near_breakout"] = 25
        rationale_parts.append("Price is near breakout range")

    if above_breakout:
        score += 20
        factor_breakdown["above_breakout"] = 20
        rationale_parts.append("Price is above breakout level")

    if trend_ok:
        score += 20
        factor_breakdown["trend_alignment"] = 20
        rationale_parts.append("Trend alignment above SMA20 and SMA50")

    if ema_ok:
        score += 10
        factor_breakdown["ema_support"] = 10
        rationale_parts.append("Price is above EMA20")

    if rsi_ok:
        score += 10
        factor_breakdown["rsi_support"] = 10
        rationale_parts.append("RSI is in bullish range")

    if momentum_ok:
        score += 10
        factor_breakdown["momentum_support"] = 10
        rationale_parts.append("Momentum is supportive")

    if volume_ok:
        score += 5
        factor_breakdown["volume_support"] = 5
        rationale_parts.append("Volume is above average")

    if score < 45:
        return None

    entry_price = round(close, 2)
    stop_loss = round(close - atr_14 * 1.5, 2)
    target_price = round(close + (close - stop_loss) * 2.0, 2)

    risk_per_share = entry_price - stop_loss
    if risk_per_share <= 0:
        return None

    risk_capital = capital * risk_pct
    position_qty = max(int(risk_capital / risk_per_share), 1)
    risk_reward = round((target_price - entry_price) / risk_per_share, 2)

    signal_type = "BREAKOUT" if above_breakout else "BUY"

    return {
        "signal_type": signal_type,
        "score": round(score, 2),
        "entry_price": entry_price,
        "stop_loss": stop_loss,
        "target_price": target_price,
        "risk_reward": risk_reward,
        "position_qty": position_qty,
        "rationale": "; ".join(rationale_parts) if rationale_parts else "Rule-based setup",
        "factor_breakdown": factor_breakdown,
    }

def _select_top_picks(recommendations):
    top_picks = []

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
        risk_reward = reward / risk

        # Apply filters
        if rec["score"] < 75:
            continue
        if risk_reward < 1.5:
            continue
        if risk_pct > 3:
            continue
        if rec["signal_type"] not in ["BUY", "BREAKOUT"]:
            continue

        # Add derived values
        rec["risk_pct"] = round(risk_pct, 2)
        rec["reward_pct"] = round((reward / entry) * 100, 2)
        rec["risk_reward"] = round(risk_reward, 2)

        # Add simple reason
        if rec["score"] >= 80:
            reason = "High score with strong setup"
        elif rec["signal_type"] == "BREAKOUT":
            reason = "Breakout setup with momentum"
        else:
            reason = "Low risk buy setup"

        rec["top_pick_reason"] = reason

        top_picks.append((inst, rec))

    # Sort
    top_picks.sort(
        key=lambda x: (
            -x[1]["score"],
            -x[1]["risk_reward"],
            x[1]["risk_pct"],
        )
    )

    return top_picks[:3]
    
@router.post("/market-data/sync")
def sync_market_data():
    supabase = get_supabase_admin()

    instruments = (
        supabase.table("instruments")
        .select("id,symbol,yahoo_symbol")
        .eq("is_nifty50", True)
        .eq("is_active", True)
        .execute()
    ).data or []

    inserted = 0

    for inst in instruments:
        yahoo_symbol = inst.get("yahoo_symbol") or inst.get("symbol")
        df = YahooFinanceService.fetch_daily_bars(yahoo_symbol, period="6mo")
        if df.empty:
            continue

        rows = []
        for _, row in df.iterrows():
            trade_date = row["trade_date"]
            if hasattr(trade_date, "date"):
                trade_date = trade_date.date().isoformat()
            else:
                trade_date = str(trade_date)

            rows.append(
                {
                    "instrument_id": inst["id"],
                    "trade_date": trade_date,
                    "open": _safe_float(row.get("open")),
                    "high": _safe_float(row.get("high")),
                    "low": _safe_float(row.get("low")),
                    "close": _safe_float(row.get("close")),
                    "adj_close": _safe_float(row.get("adj_close")),
                    "volume": _safe_int(row.get("volume")),
                    "source": "yahoo_finance",
                }
            )

        if rows:
            supabase.table("daily_bars").upsert(
                rows,
                on_conflict="instrument_id,trade_date",
            ).execute()
            inserted += len(rows)

    return {
        "status": "success",
        "symbols_processed": len(instruments),
        "rows_upserted": inserted,
    }


@router.post("/recommendations/generate")
def generate_recommendations():
    supabase = get_supabase_admin()

    instruments = (
        supabase.table("instruments")
        .select("id,symbol")
        .eq("is_nifty50", True)
        .eq("is_active", True)
        .execute()
    ).data or []

    run_date = date.today().isoformat()

    run_response = (
        supabase.table("recommendation_runs")
        .insert(
            {
                "run_date": run_date,
                "strategy_code": "breakout_v2",
                "universe_code": "NIFTY50",
                "source": "yahoo_finance",
                "status": "running",
                "config": {
                    "capital": 500000,
                    "risk_pct": 0.01,
                    "max_recommendations": 5,
                },
            }
        )
        .execute()
    )

    run_id = run_response.data[0]["id"]

    generated = []
    instruments_seen = 0
    snapshots_upserted = 0

    supabase.table("recommendations").delete().eq("trade_date", run_date).eq(
        "strategy_code", "breakout_v2"
    ).execute()

    for inst in instruments:
        bars = (
            supabase.table("daily_bars")
            .select("trade_date,open,high,low,close,adj_close,volume")
            .eq("instrument_id", inst["id"])
            .order("trade_date")
            .execute()
        ).data or []

        if len(bars) < 60:
            continue

        instruments_seen += 1

        df = pd.DataFrame(bars)
        for col in ["open", "high", "low", "close", "volume"]:
            df[col] = pd.to_numeric(df[col], errors="coerce")

        ind_df = IndicatorService.compute(df)
        last = ind_df.iloc[-1].to_dict()

        supabase.table("indicator_snapshots").upsert(
            {
                "instrument_id": inst["id"],
                "trade_date": run_date,
                "sma_20": _safe_float(last.get("sma_20")),
                "sma_50": _safe_float(last.get("sma_50")),
                "ema_20": _safe_float(last.get("ema_20")),
                "rsi_14": _safe_float(last.get("rsi_14")),
                "atr_14": _safe_float(last.get("atr_14")),
                "volume_avg_20": _safe_float(last.get("volume_avg_20")),
                "breakout_20_high_prev": _safe_float(last.get("breakout_20_high_prev")),
                "momentum_20d": _safe_float(last.get("momentum_20d")),
                "payload": {},
            },
            on_conflict="instrument_id,trade_date",
        ).execute()
        snapshots_upserted += 1

        rec = _build_simple_recommendation(last)
        if not rec:
            continue

        generated.append((inst, rec))

    generated.sort(key=lambda x: x[1]["score"], reverse=True)
    generated = generated[:5]

    created = []

    for rank, (inst, rec) in enumerate(generated, start=1):
        inserted = (
            supabase.table("recommendations")
            .insert(
                {
                    "run_id": run_id,
                    "instrument_id": inst["id"],
                    "trade_date": run_date,
                    "signal_type": rec["signal_type"],
                    "strategy_code": "breakout_v2",
                    "score": rec["score"],
                    "rank_no": rank,
                    "confidence": round(rec["score"] / 100, 4),
                    "entry_price": rec["entry_price"],
                    "stop_loss": rec["stop_loss"],
                    "target_price": rec["target_price"],
                    "risk_reward": rec["risk_reward"],
                    "position_qty": rec["position_qty"],
                    "capital_assumed": 500000,
                    "rationale": rec["rationale"],
                    "factor_breakdown": rec["factor_breakdown"],
                    "status": "new",
                }
            )
            .execute()
        )

        row = inserted.data[0] if inserted.data else None
        created.append(
            {
                "id": row["id"] if row else None,
                "symbol": inst["symbol"],
                "score": rec["score"],
                "signal_type": rec["signal_type"],
                "entry_price": rec["entry_price"],
                "stop_loss": rec["stop_loss"],
                "target_price": rec["target_price"],
                "position_qty": rec["position_qty"],
            }
        )

    supabase.table("recommendation_runs").update({"status": "completed"}).eq(
        "id", run_id
    ).execute()

    return {
        "status": "success",
        "run_id": run_id,
        "instruments_seen": instruments_seen,
        "snapshots_upserted": snapshots_upserted,
        "generated_count": len(created),
        "recommendations": created,
    }


@router.get("/recommendations")
def list_recommendations():
    supabase = get_supabase_admin()
    run_date = date.today().isoformat()

    rows = (
        supabase.table("recommendations")
        .select(
            "id,trade_date,signal_type,score,rank_no,entry_price,stop_loss,target_price,position_qty,rationale,factor_breakdown,instrument_id,strategy_code"
        )
        .eq("trade_date", run_date)
        .eq("strategy_code", "breakout_v2")
        .order("score", desc=True)
        .execute()
    ).data or []

    instruments = (
        supabase.table("instruments")
        .select("id,symbol")
        .eq("is_nifty50", True)
        .execute()
    ).data or []

    symbol_map = {row["id"]: row["symbol"] for row in instruments}

    return [
        {
            "id": row["id"],
            "symbol": symbol_map.get(row["instrument_id"]),
            "trade_date": row["trade_date"],
            "signal_type": row["signal_type"],
            "score": row["score"],
            "rank_no": row["rank_no"],
            "entry_price": row["entry_price"],
            "stop_loss": row["stop_loss"],
            "target_price": row["target_price"],
            "position_qty": row["position_qty"],
            "rationale": row["rationale"],
            "factor_breakdown": row["factor_breakdown"],
            "strategy_code": row["strategy_code"],
        }
        for row in rows
    ]

@router.get("/top-picks")
def get_top_picks():
    supabase = get_supabase_admin()
    run_date = date.today().isoformat()

    rows = (
        supabase.table("recommendations")
        .select(
            "id,trade_date,signal_type,score,entry_price,stop_loss,target_price,position_qty,instrument_id,rationale"
        )
        .eq("trade_date", run_date)
        .eq("strategy_code", "breakout_v2")
        .execute()
    ).data or []

    instruments = (
        supabase.table("instruments")
        .select("id,symbol")
        .execute()
    ).data or []

    symbol_map = {row["id"]: row["symbol"] for row in instruments}

    enriched = []

    for row in rows:
        entry = _safe_float(row.get("entry_price"))
        stop = _safe_float(row.get("stop_loss"))
        target = _safe_float(row.get("target_price"))

        if not entry or not stop or not target:
            continue

        risk = entry - stop
        reward = target - entry

        if risk <= 0 or reward <= 0:
            continue

        risk_pct = (risk / entry) * 100
        reward_pct = (reward / entry) * 100
        risk_reward = reward / risk

        # 🔥 RELAXED FILTERS (important)
        if row["score"] < 70:
            continue
        if risk_reward < 1.3:
            continue
        if risk_pct > 4:
            continue

        # Add reason
        if row["score"] >= 80:
            reason = "High score with strong setup"
        elif row["signal_type"] == "BREAKOUT":
            reason = "Breakout setup with momentum"
        else:
            reason = "Low risk buy setup"

        enriched.append(
            {
                "id": row["id"],
                "symbol": symbol_map.get(row["instrument_id"]),
                "signal_type": row["signal_type"],
                "score": row["score"],
                "entry_price": entry,
                "stop_loss": stop,
                "target_price": target,
                "risk_pct": round(risk_pct, 2),
                "reward_pct": round(reward_pct, 2),
                "risk_reward": round(risk_reward, 2),
                "position_qty": row.get("position_qty"),
                "rationale": row.get("rationale"),
                "top_pick_reason": reason,
            }
        )

    # Sort
    enriched.sort(
        key=lambda x: (-x["score"], -x["risk_reward"], x["risk_pct"])
    )

    return {
        "count": len(enriched[:3]),
        "items": enriched[:3],
    }
@router.get("/indicators")
def list_indicators():
    supabase = get_supabase_admin()
    run_date = date.today().isoformat()

    snapshots = (
        supabase.table("indicator_snapshots")
        .select(
            "instrument_id,trade_date,sma_20,sma_50,ema_20,rsi_14,atr_14,volume_avg_20,breakout_20_high_prev,momentum_20d"
        )
        .eq("trade_date", run_date)
        .execute()
    ).data or []

    instruments = (
        supabase.table("instruments")
        .select("id,symbol")
        .eq("is_nifty50", True)
        .execute()
    ).data or []

    symbol_map = {row["id"]: row["symbol"] for row in instruments}

    return [
        {
            "symbol": symbol_map.get(row["instrument_id"]),
            "trade_date": row["trade_date"],
            "sma_20": row["sma_20"],
            "sma_50": row["sma_50"],
            "ema_20": row["ema_20"],
            "rsi_14": row["rsi_14"],
            "atr_14": row["atr_14"],
            "volume_avg_20": row["volume_avg_20"],
            "breakout_20_high_prev": row["breakout_20_high_prev"],
            "momentum_20d": row["momentum_20d"],
        }
        for row in snapshots
    ]


@router.get("/stocks/{symbol}/bars")
def get_stock_bars(symbol: str, limit: int = 60):
    supabase = get_supabase_admin()

    instrument_rows = (
        supabase.table("instruments")
        .select("id,symbol")
        .eq("symbol", symbol.upper())
        .limit(1)
        .execute()
    ).data or []

    if not instrument_rows:
        raise HTTPException(status_code=404, detail="Symbol not found")

    instrument_id = instrument_rows[0]["id"]

    rows = (
        supabase.table("daily_bars")
        .select("trade_date,open,high,low,close,volume")
        .eq("instrument_id", instrument_id)
        .order("trade_date", desc=True)
        .limit(limit)
        .execute()
    ).data or []

    rows.reverse()

    return [
        {
            "trade_date": row["trade_date"],
            "open": _safe_float(row.get("open")),
            "high": _safe_float(row.get("high")),
            "low": _safe_float(row.get("low")),
            "close": _safe_float(row.get("close")),
            "volume": _safe_int(row.get("volume")),
        }
        for row in rows
    ]


@router.post("/recommendations/{recommendation_id}/actions")
def create_recommendation_action(recommendation_id: str, payload: dict):
    supabase = get_supabase_admin()

    recommendation_rows = (
        supabase.table("recommendations")
        .select("id")
        .eq("id", recommendation_id)
        .limit(1)
        .execute()
    ).data or []

    if not recommendation_rows:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    action_type = payload.get("action_type")
    if not action_type:
        raise HTTPException(status_code=400, detail="action_type is required")

    row = {
        "recommendation_id": recommendation_id,
        "action_type": action_type,
        "action_price": payload.get("action_price"),
        "action_qty": payload.get("action_qty"),
        "notes": payload.get("notes"),
    }

    inserted = supabase.table("recommendation_actions").insert(row).execute()

    return {
        "status": "success",
        "action": inserted.data[0] if inserted.data else row,
    }


@router.get("/watchlist")
def get_watchlist():
    supabase = get_supabase_admin()
    run_date = date.today().isoformat()

    snapshots = (
        supabase.table("indicator_snapshots")
        .select(
            "instrument_id,trade_date,sma_20,sma_50,ema_20,rsi_14,atr_14,volume_avg_20,breakout_20_high_prev,momentum_20d"
        )
        .eq("trade_date", run_date)
        .execute()
    ).data or []

    instruments = (
        supabase.table("instruments")
        .select("id,symbol")
        .eq("is_nifty50", True)
        .eq("is_active", True)
        .execute()
    ).data or []

    bars = (
        supabase.table("daily_bars")
        .select("instrument_id,trade_date,close,volume")
        .order("trade_date", desc=True)
        .execute()
    ).data or []

    symbol_map = {row["id"]: row["symbol"] for row in instruments}

    latest_bar_map = {}
    for row in bars:
        inst_id = row["instrument_id"]
        if inst_id not in latest_bar_map:
            latest_bar_map[inst_id] = row

    watchlist = []

    for snap in snapshots:
        inst_id = snap["instrument_id"]
        latest = latest_bar_map.get(inst_id)
        if not latest:
            continue

        close = _safe_float(latest.get("close"))
        breakout = _safe_float(snap.get("breakout_20_high_prev"))
        sma_50 = _safe_float(snap.get("sma_50"))
        momentum = _safe_float(snap.get("momentum_20d"))
        volume_avg_20 = _safe_float(snap.get("volume_avg_20"))
        latest_volume = _safe_float(latest.get("volume")) or 0

        if close is None or breakout is None:
            continue

        distance_pct = round(((close / breakout) - 1) * 100, 2)

        vol_ratio = None
        if volume_avg_20 not in (None, 0):
            vol_ratio = round(latest_volume / volume_avg_20, 2)

        is_near_breakout = close >= breakout * 0.97
        trend_ok = sma_50 is not None and close > sma_50
        momentum_ok = momentum is not None and momentum > -2.0

        if is_near_breakout and (trend_ok or momentum_ok):
            watchlist.append(
                {
                    "symbol": symbol_map.get(inst_id),
                    "trade_date": snap["trade_date"],
                    "close": round(close, 2),
                    "breakout_20_high_prev": breakout,
                    "distance_to_breakout_pct": distance_pct,
                    "sma_50": sma_50,
                    "momentum_20d": momentum,
                    "volume_avg_20": volume_avg_20,
                    "latest_volume": latest_volume,
                    "volume_ratio": vol_ratio,
                    "watchlist_reason": "Near breakout with acceptable trend/momentum",
                }
            )

    watchlist.sort(key=lambda x: abs(x["distance_to_breakout_pct"]))
    return watchlist
