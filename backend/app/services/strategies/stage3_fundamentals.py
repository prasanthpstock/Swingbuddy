from __future__ import annotations

import numpy as np
import pandas as pd


# =========================================================
# 1. Quarterly fundamentals preparation
# =========================================================

def prepare_quarterly_fundamentals(fund_df: pd.DataFrame) -> pd.DataFrame:
    """
    Prepare quarterly fundamentals per symbol.

    Expected input columns:
        - symbol
        - report_date
        - promoter_holding_pct
        - debt_to_equity

    Optional extra columns can exist and will be preserved.

    Output adds:
        - promoter_holding_prev
        - promoter_holding_change
        - debt_to_equity_prev
        - debt_to_equity_change
    """
    required_cols = {
        "symbol",
        "report_date",
        "promoter_holding_pct",
        "debt_to_equity",
    }
    missing = required_cols - set(fund_df.columns)
    if missing:
        raise ValueError(f"Missing required fundamentals columns: {sorted(missing)}")

    df = fund_df.copy()
    df["report_date"] = pd.to_datetime(df["report_date"])
    df = df.sort_values(["symbol", "report_date"]).reset_index(drop=True)

    df["promoter_holding_prev"] = (
        df.groupby("symbol")["promoter_holding_pct"].shift(1)
    )
    df["promoter_holding_change"] = (
        df["promoter_holding_pct"] - df["promoter_holding_prev"]
    )

    df["debt_to_equity_prev"] = (
        df.groupby("symbol")["debt_to_equity"].shift(1)
    )
    df["debt_to_equity_change"] = (
        df["debt_to_equity"] - df["debt_to_equity_prev"]
    )

    return df


# =========================================================
# 2. Daily + quarterly merge without look-ahead
# =========================================================

def merge_fundamentals_into_daily(
    stock_df: pd.DataFrame,
    prepared_fund_df: pd.DataFrame,
    symbol: str | None = None,
) -> pd.DataFrame:
    """
    Merge latest known quarterly fundamentals into daily candles using backward asof merge.

    Expected stock_df columns:
        - date
        - symbol (optional if `symbol` arg is provided)

    Expected prepared_fund_df columns:
        - symbol
        - report_date
        - promoter_holding_pct
        - promoter_holding_change
        - debt_to_equity
        - debt_to_equity_change
    """
    if "date" not in stock_df.columns:
        raise ValueError("stock_df must contain 'date' column")

    if "symbol" not in stock_df.columns and symbol is None:
        raise ValueError("Provide symbol arg if stock_df does not contain 'symbol' column")

    price = stock_df.copy()
    price["date"] = pd.to_datetime(price["date"])
    price = price.sort_values("date").reset_index(drop=True)

    if "symbol" not in price.columns:
        price["symbol"] = symbol

    symbols = price["symbol"].dropna().unique()
    if len(symbols) != 1:
        raise ValueError("merge_fundamentals_into_daily expects exactly one symbol per call")

    symbol_value = symbols[0]

    fund = prepared_fund_df.copy()
    fund["report_date"] = pd.to_datetime(fund["report_date"])
    fund = fund[fund["symbol"] == symbol_value].sort_values("report_date").reset_index(drop=True)

    if fund.empty:
        # no fundamentals available -> return daily unchanged with empty fundamental columns
        out = price.copy()
        for col in [
            "report_date",
            "promoter_holding_pct",
            "promoter_holding_prev",
            "promoter_holding_change",
            "debt_to_equity",
            "debt_to_equity_prev",
            "debt_to_equity_change",
        ]:
            out[col] = np.nan
        return out

    merged = pd.merge_asof(
        price,
        fund,
        left_on="date",
        right_on="report_date",
        direction="backward",
    )

    return merged


# =========================================================
# 3. Stage 3 scoring
# =========================================================

def stage3_fundamental_score(row: pd.Series) -> int:
    """
    Stage 3 score:
    - promoter trend matters more than promoter level
    - debt trend matters more than debt level
    """
    score = 0

    promoter_holding_pct = row.get("promoter_holding_pct", np.nan)
    promoter_holding_change = row.get("promoter_holding_change", np.nan)

    debt_to_equity = row.get("debt_to_equity", np.nan)
    debt_to_equity_change = row.get("debt_to_equity_change", np.nan)

    # -----------------------------
    # Promoter behavior (trend > level)
    # -----------------------------
    if pd.notna(promoter_holding_change):
        if promoter_holding_change > 0.5:
            score += 12
        elif promoter_holding_change > 0:
            score += 8
        elif promoter_holding_change < -0.5:
            score -= 12
        elif promoter_holding_change < 0:
            score -= 4

    if pd.notna(promoter_holding_pct):
        if promoter_holding_pct < 25:
            score -= 8
        elif promoter_holding_pct > 50:
            score += 3

    # -----------------------------
    # Debt behavior (trend > level)
    # -----------------------------
    if pd.notna(debt_to_equity_change):
        if debt_to_equity_change < -0.10:
            score += 8
        elif debt_to_equity_change < 0:
            score += 4
        elif debt_to_equity_change > 0.10:
            score -= 8

    if pd.notna(debt_to_equity):
        if debt_to_equity <= 0.5:
            score += 6
        elif debt_to_equity <= 1.0:
            score += 2
        elif debt_to_equity > 2.0:
            score -= 10

    return int(score)


def stage3_fundamental_pass(row: pd.Series) -> bool:
    """
    Minimal hard filter for fundamentals.
    Use only extreme debt rejection for now.
    Missing data stays neutral.
    """
    debt_to_equity = row.get("debt_to_equity", np.nan)

    if pd.notna(debt_to_equity) and debt_to_equity > 2.5:
        return False

    return True


# =========================================================
# 4. Attach Stage 3 columns to daily dataframe
# =========================================================

def add_stage3_fundamental_features(
    daily_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Adds:
        - stage3_fundamental_score
        - stage3_fundamental_pass
    """
    df = daily_df.copy()

    df["stage3_fundamental_score"] = df.apply(stage3_fundamental_score, axis=1)
    df["stage3_fundamental_pass"] = df.apply(stage3_fundamental_pass, axis=1)

    return df


# =========================================================
# 5. Final score integration helper
# =========================================================

def combine_total_score(
    df: pd.DataFrame,
    base_score_col: str = "score",
    out_col: str = "total_score",
) -> pd.DataFrame:
    """
    Combine existing strategy score with Stage 3 fundamental score.

    Example:
        existing score column = score
        final score column = total_score
    """
    out = df.copy()

    if base_score_col not in out.columns:
        raise ValueError(f"Missing base score column: {base_score_col}")

    if "stage3_fundamental_score" not in out.columns:
        raise ValueError("Missing stage3_fundamental_score column")

    out[out_col] = out[base_score_col].fillna(0) + out["stage3_fundamental_score"].fillna(0)
    return out


# =========================================================
# 6. Final eligibility helper
# =========================================================

def add_final_v32_eligibility(
    df: pd.DataFrame,
    technical_eligibility_col: str = "eligible_v31",
    out_col: str = "eligible_v32",
) -> pd.DataFrame:
    """
    Combine V3.1 eligibility with Stage 3 fundamentals pass.
    """
    out = df.copy()

    if technical_eligibility_col not in out.columns:
        raise ValueError(f"Missing technical eligibility column: {technical_eligibility_col}")

    if "stage3_fundamental_pass" not in out.columns:
        raise ValueError("Missing stage3_fundamental_pass column")

    out[out_col] = (
        out[technical_eligibility_col].fillna(False) &
        out["stage3_fundamental_pass"].fillna(True)
    )

    return out


# =========================================================
# 7. One-shot convenience pipeline
# =========================================================

def enrich_daily_with_stage3_fundamentals(
    stock_df: pd.DataFrame,
    prepared_fund_df: pd.DataFrame,
    symbol: str | None = None,
    base_score_col: str = "score",
    technical_eligibility_col: str = "eligible_v31",
) -> pd.DataFrame:
    """
    One-shot pipeline:
        1. merge quarterly fundamentals into daily
        2. add stage 3 score / pass
        3. combine final score
        4. add eligible_v32
    """
    df = merge_fundamentals_into_daily(
        stock_df=stock_df,
        prepared_fund_df=prepared_fund_df,
        symbol=symbol,
    )

    df = add_stage3_fundamental_features(df)
    df = combine_total_score(df, base_score_col=base_score_col, out_col="total_score")
    df = add_final_v32_eligibility(
        df,
        technical_eligibility_col=technical_eligibility_col,
        out_col="eligible_v32",
    )

    return df


# =========================================================
# 8. Debug / inspection helpers
# =========================================================

def summarize_fundamental_context(df: pd.DataFrame) -> pd.DataFrame:
    """
    Useful for debugging what Stage 3 is doing.
    """
    cols = [
        "date",
        "symbol",
        "report_date",
        "promoter_holding_pct",
        "promoter_holding_change",
        "debt_to_equity",
        "debt_to_equity_change",
        "stage3_fundamental_score",
        "stage3_fundamental_pass",
    ]
    existing = [c for c in cols if c in df.columns]
    return df[existing].copy()