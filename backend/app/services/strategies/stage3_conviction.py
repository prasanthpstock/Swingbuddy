from __future__ import annotations

import numpy as np
import pandas as pd


def _safe_div(a, b):
    if pd.isna(a) or pd.isna(b) or b == 0:
        return np.nan
    return a / b


def compute_candle_strength(row: pd.Series) -> float:
    """
    Close position inside candle range.
    1.0 = close at high
    0.0 = close at low
    """
    high = row.get("high")
    low = row.get("low")
    close = row.get("close")

    if pd.isna(high) or pd.isna(low) or pd.isna(close):
        return np.nan

    candle_range = high - low
    if candle_range <= 0:
        return np.nan

    return (close - low) / candle_range


def compute_body_strength(row: pd.Series) -> float:
    """
    Body size relative to full candle range.
    Bigger bullish body = stronger buying pressure.
    """
    open_ = row.get("open")
    close = row.get("close")
    high = row.get("high")
    low = row.get("low")

    if any(pd.isna(v) for v in [open_, close, high, low]):
        return np.nan

    candle_range = high - low
    if candle_range <= 0:
        return np.nan

    body = abs(close - open_)
    return body / candle_range


def compute_upper_wick_ratio(row: pd.Series) -> float:
    """
    Large upper wick often means breakout rejection / seller pressure.
    """
    open_ = row.get("open")
    close = row.get("close")
    high = row.get("high")
    low = row.get("low")

    if any(pd.isna(v) for v in [open_, close, high, low]):
        return np.nan

    candle_range = high - low
    if candle_range <= 0:
        return np.nan

    upper_wick = high - max(open_, close)
    return upper_wick / candle_range


def compute_lower_wick_ratio(row: pd.Series) -> float:
    """
    Larger lower wick can indicate demand/support intraday.
    """
    open_ = row.get("open")
    close = row.get("close")
    high = row.get("high")
    low = row.get("low")

    if any(pd.isna(v) for v in [open_, close, high, low]):
        return np.nan

    candle_range = high - low
    if candle_range <= 0:
        return np.nan

    lower_wick = min(open_, close) - low
    return lower_wick / candle_range


def compute_volume_ratio(row: pd.Series) -> float:
    volume = row.get("volume")
    volume_avg = row.get("volume_avg_20")

    return _safe_div(volume, volume_avg)


def compute_range_expansion(row: pd.Series) -> float:
    """
    Today's range relative to ATR.
    Measures whether breakout candle has meaningful expansion.
    """
    high = row.get("high")
    low = row.get("low")
    atr = row.get("atr_14")

    if any(pd.isna(v) for v in [high, low, atr]) or atr <= 0:
        return np.nan

    return (high - low) / atr


def compute_breakout_acceptance(row: pd.Series) -> float:
    """
    How far above breakout level price closed.
    Positive = accepted above breakout.
    Negative = failed breakout.
    """
    close = row.get("close")
    breakout = row.get("breakout_20_high_prev")

    if pd.isna(close) or pd.isna(breakout) or breakout == 0:
        return np.nan

    return (close - breakout) / breakout


def compute_pressure_score(row: pd.Series) -> int:
    """
    Proxy for buy vs sell pressure using daily OHLCV.
    Higher score = buyers clearly controlled breakout candle.
    """
    score = 0

    candle_strength = row.get("candle_strength", np.nan)
    body_strength = row.get("body_strength", np.nan)
    upper_wick_ratio = row.get("upper_wick_ratio", np.nan)
    lower_wick_ratio = row.get("lower_wick_ratio", np.nan)
    volume_ratio = row.get("volume_ratio", np.nan)
    range_expansion = row.get("range_expansion", np.nan)
    breakout_acceptance = row.get("breakout_acceptance", np.nan)

    open_ = row.get("open")
    close = row.get("close")

    # 1. Close location: close near high = buyer control
    if pd.notna(candle_strength):
        if candle_strength >= 0.80:
            score += 12
        elif candle_strength >= 0.65:
            score += 8
        elif candle_strength >= 0.55:
            score += 4
        elif candle_strength < 0.40:
            score -= 8

    # 2. Real body strength
    if pd.notna(body_strength):
        if body_strength >= 0.60:
            score += 8
        elif body_strength >= 0.40:
            score += 5
        elif body_strength < 0.20:
            score -= 5

    # 3. Bullish close vs open
    if pd.notna(open_) and pd.notna(close):
        if close > open_:
            score += 4
        else:
            score -= 6

    # 4. Upper wick rejection: big upper wick is bad for breakout continuation
    if pd.notna(upper_wick_ratio):
        if upper_wick_ratio <= 0.15:
            score += 6
        elif upper_wick_ratio >= 0.35:
            score -= 10

    # 5. Lower wick support: mild positive, but don't over-weight
    if pd.notna(lower_wick_ratio):
        if 0.10 <= lower_wick_ratio <= 0.35:
            score += 2

    # 6. Volume conviction
    if pd.notna(volume_ratio):
        if volume_ratio >= 1.8:
            score += 12
        elif volume_ratio >= 1.4:
            score += 8
        elif volume_ratio >= 1.2:
            score += 4
        elif volume_ratio < 0.9:
            score -= 8

    # 7. Range expansion: breakout candle should have some energy
    if pd.notna(range_expansion):
        if range_expansion >= 1.2:
            score += 8
        elif range_expansion >= 0.8:
            score += 4
        elif range_expansion < 0.5:
            score -= 4

    # 8. Breakout acceptance: close should actually hold above breakout
    if pd.notna(breakout_acceptance):
        if breakout_acceptance >= 0.003:
            score += 8
        elif breakout_acceptance >= 0:
            score += 4
        else:
            score -= 12

    return int(score)


def stage3_conviction_pass(row: pd.Series, min_pressure_score: int = 15) -> bool:
    """
    Hard filter so weak breakouts are rejected.
    """
    pressure_score = row.get("stage3_conviction_score", np.nan)
    if pd.isna(pressure_score):
        return False
    return pressure_score >= min_pressure_score


def add_stage3_conviction_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()

    out["candle_strength"] = out.apply(compute_candle_strength, axis=1)
    out["body_strength"] = out.apply(compute_body_strength, axis=1)
    out["upper_wick_ratio"] = out.apply(compute_upper_wick_ratio, axis=1)
    out["lower_wick_ratio"] = out.apply(compute_lower_wick_ratio, axis=1)
    out["volume_ratio"] = out.apply(compute_volume_ratio, axis=1)
    out["range_expansion"] = out.apply(compute_range_expansion, axis=1)
    out["breakout_acceptance"] = out.apply(compute_breakout_acceptance, axis=1)

    out["stage3_conviction_score"] = out.apply(compute_pressure_score, axis=1)
    out["stage3_conviction_pass"] = out.apply(stage3_conviction_pass, axis=1)

    return out
