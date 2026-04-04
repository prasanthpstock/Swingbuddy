from datetime import date

import pandas as pd
from fastapi import APIRouter

from app.core.supabase import get_supabase_admin
from app.services.indicators import IndicatorService
from app.services.recommendation_engine import RecommendationEngine, StrategyConfig
from app.services.yahoo_finance import YahooFinanceService
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/v2", tags=["recommendations"])


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
        df = YahooFinanceService.fetch_daily_bars(inst["yahoo_symbol"], period="6mo")
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
                    "open": float(row["open"]),
                    "high": float(row["high"]),
                    "low": float(row["low"]),
                    "close": float(row["close"]),
                    "adj_close": None if pd.isna(row["adj_close"]) else float(row["adj_close"]),
                    "volume": int(row["volume"]),
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
                    "breakout_tolerance": 0.99,
                },
            }
        )
        .execute()
    )

    run_id = run_response.data[0]["id"]
    cfg = StrategyConfig(
        target_rr=2.0,
        max_recommendations=5,
        breakout_tolerance=0.99,
    )

    generated = []
    instruments_seen = 0
    snapshots_upserted = 0

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
        last = ind_df.iloc[-1]

        supabase.table("indicator_snapshots").upsert(
            {
                "instrument_id": inst["id"],
                "trade_date": run_date,
                "sma_20": None if pd.isna(last["sma_20"]) else float(last["sma_20"]),
                "sma_50": None if pd.isna(last["sma_50"]) else float(last["sma_50"]),
                "ema_20": None if pd.isna(last["ema_20"]) else float(last["ema_20"]),
                "rsi_14": None if pd.isna(last["rsi_14"]) else float(last["rsi_14"]),
                "atr_14": None if pd.isna(last["atr_14"]) else float(last["atr_14"]),
                "volume_avg_20": None if pd.isna(last["volume_avg_20"]) else float(last["volume_avg_20"]),
                "breakout_20_high_prev": None if pd.isna(last["breakout_20_high_prev"]) else float(last["breakout_20_high_prev"]),
                "momentum_20d": None if pd.isna(last["momentum_20d"]) else float(last["momentum_20d"]),
                "payload": {},
            },
            on_conflict="instrument_id,trade_date",
        ).execute()
        snapshots_upserted += 1

        rec = RecommendationEngine.build_recommendation(
            last,
            capital=500000,
            risk_pct=0.01,
            cfg=cfg,
        )
        if not rec:
            continue

        generated.append((inst, last, rec))

    generated.sort(key=lambda x: x[2]["score"], reverse=True)
    generated = generated[: cfg.max_recommendations]

    created = []

    for rank, (inst, last, rec) in enumerate(generated, start=1):
        supabase.table("recommendations").insert(
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
        ).execute()

        created.append(
            {
                "symbol": inst["symbol"],
                "score": rec["score"],
                "entry_price": rec["entry_price"],
                "stop_loss": rec["stop_loss"],
                "target_price": rec["target_price"],
                "position_qty": rec["position_qty"],
            }
        )

    supabase.table("recommendation_runs").update(
        {"status": "completed"}
    ).eq("id", run_id).execute()

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

    inserted = (
        supabase.table("recommendation_actions")
        .insert(row)
        .execute()
    )

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

        close = float(latest["close"]) if latest["close"] is not None else None
        breakout = snap["breakout_20_high_prev"]
        sma_50 = snap["sma_50"]
        momentum = snap["momentum_20d"]
        volume_avg_20 = snap["volume_avg_20"]
        latest_volume = float(latest["volume"]) if latest["volume"] is not None else 0

        if close is None or breakout is None:
            continue

        distance_pct = round(((close / float(breakout)) - 1) * 100, 2)

        vol_ratio = None
        if volume_avg_20 not in (None, 0):
            vol_ratio = round(latest_volume / float(volume_avg_20), 2)

        is_near_breakout = close >= float(breakout) * 0.97
        trend_ok = sma_50 is not None and close > float(sma_50)
        momentum_ok = momentum is not None and float(momentum) > -2.0

        if is_near_breakout and (trend_ok or momentum_ok):
            watchlist.append(
                {
                    "symbol": symbol_map.get(inst_id),
                    "trade_date": snap["trade_date"],
                    "close": round(close, 2),
                    "breakout_20_high_prev": float(breakout),
                    "distance_to_breakout_pct": distance_pct,
                    "sma_50": sma_50,
                    "momentum_20d": momentum,
                    "volume_avg_20": volume_avg_20,
                    "latest_volume": latest_volume,
                    "volume_ratio": vol_ratio,
                    "watchlist_reason": "Near breakout with acceptable trend/momentum",
                }
            )

    watchlist.sort(key=lambda x: x["distance_to_breakout_pct"], reverse=True)

    return watchlist
