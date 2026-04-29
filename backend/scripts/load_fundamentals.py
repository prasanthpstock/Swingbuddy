from __future__ import annotations

from pathlib import Path
from typing import Iterable

import pandas as pd

DEFAULT_OUTPUT_PATH = Path("output/fundamentals_quarterly.csv")


def normalize_symbol(symbol: str) -> str:
    return str(symbol).strip().upper()


def load_quarterly_fundamentals_csv(path: str | Path) -> pd.DataFrame:
    """
    Load and normalize a quarterly fundamentals CSV.

    Required columns:
        - symbol
        - report_date
        - promoter_holding_pct
        - debt_to_equity
    """
    csv_path = Path(path)
    if not csv_path.exists():
        raise FileNotFoundError(f"Fundamentals CSV not found: {csv_path}")

    df = pd.read_csv(csv_path)

    required = {"symbol", "report_date", "promoter_holding_pct", "debt_to_equity"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns in {csv_path}: {sorted(missing)}")

    df = df.copy()
    df["symbol"] = df["symbol"].map(normalize_symbol)
    df["report_date"] = pd.to_datetime(df["report_date"], errors="coerce")

    for col in ["promoter_holding_pct", "debt_to_equity"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=["symbol", "report_date"]).sort_values(["symbol", "report_date"]).reset_index(drop=True)
    return df


def save_quarterly_fundamentals(df: pd.DataFrame, path: str | Path = DEFAULT_OUTPUT_PATH) -> Path:
    out_path = Path(path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path, index=False)
    return out_path


def build_sample_quarterly_fundamentals(rows: Iterable[dict] | None = None) -> pd.DataFrame:
    """
    Helper for bootstrapping a valid CSV structure.
    """
    if rows is None:
        rows = [
            {"symbol": "RELIANCE", "report_date": "2025-06-30", "promoter_holding_pct": 50.3, "debt_to_equity": 0.42},
            {"symbol": "RELIANCE", "report_date": "2025-09-30", "promoter_holding_pct": 50.5, "debt_to_equity": 0.38},
            {"symbol": "TCS", "report_date": "2025-06-30", "promoter_holding_pct": 72.4, "debt_to_equity": 0.03},
            {"symbol": "TCS", "report_date": "2025-09-30", "promoter_holding_pct": 72.4, "debt_to_equity": 0.02},
        ]

    df = pd.DataFrame(list(rows))
    return load_quarterly_fundamentals_csv(save_quarterly_fundamentals(df, DEFAULT_OUTPUT_PATH))


if __name__ == "__main__":
    sample_df = pd.DataFrame([
        {"symbol": "RELIANCE", "report_date": "2025-06-30", "promoter_holding_pct": 50.3, "debt_to_equity": 0.42},
        {"symbol": "RELIANCE", "report_date": "2025-09-30", "promoter_holding_pct": 50.5, "debt_to_equity": 0.38},
        {"symbol": "TCS", "report_date": "2025-06-30", "promoter_holding_pct": 72.4, "debt_to_equity": 0.03},
        {"symbol": "TCS", "report_date": "2025-09-30", "promoter_holding_pct": 72.4, "debt_to_equity": 0.02},
    ])
    out = save_quarterly_fundamentals(sample_df, DEFAULT_OUTPUT_PATH)
    print(f"Wrote sample fundamentals CSV to {out}")
