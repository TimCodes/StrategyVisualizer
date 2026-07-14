#!/usr/bin/env python3
"""
Praxis LEAN data pipeline — Tier 1-3 free daily data.

Downloads and converts to LEAN local-data format:
  Tier 1: US ETFs (daily)  -> data/equity/usa/daily/{sym}.zip (+ map/factor files)
  Tier 2: VIX history      -> data/index/usa/daily/vix.zip + data/alternative/vix/vix_history.csv
  Tier 3: Crypto (BTC/ETH) -> data/crypto/coinbase/daily/{pair}_trade.zip

Sources (all free, no API keys):
  - Equities/ETFs and crypto: Yahoo Finance via the `yfinance` package
  - VIX: CBOE published history CSV

Data-quality notes (recorded in data/PROVENANCE.md — Davey Ch 11 discipline):
  - Yahoo OHLC is SPLIT-adjusted at source but NOT dividend-adjusted. We
    therefore write the split-adjusted series as LEAN "raw" data with
    splitFactor == 1, and factor files carry DIVIDEND adjustments only.
    Backtest math is internally consistent; nominal pre-split price levels
    for symbols that ever split (e.g. USO 2020 reverse split) will not
    match historical tape prints. Fine for strategy research; do not use
    for tax or execution reconciliation.
  - ETFs only (no delisted-stock universe): single-name survivorship bias
    does not apply to asset-class research, but DO NOT use this set for
    single-stock cross-sectional studies and pretend it is a universe.

Usage:
  python download_data.py            # refresh everything
  python download_data.py SPY QQQ    # refresh a subset (equity symbols)
"""

import io
import json
import os
import sys
import zipfile
from datetime import datetime, timezone

import requests

try:
    import yfinance as yf
except ImportError:
    sys.exit("Missing dependency: pip install yfinance")

# ── locations ────────────────────────────────────────────────
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
DATA = os.environ.get(
    "LEAN_DATA_DIR", os.path.join(REPO, "lean-workspace", "data")
)

# ── universe ─────────────────────────────────────────────────
# symbol -> primary exchange code for the map file (P=ARCA, Q=NASDAQ, Z=BATS)
EQUITIES = {
    # broad market / regions
    "SPY": "P", "QQQ": "Q", "IWM": "P", "DIA": "P", "EFA": "P", "EEM": "P",
    # bonds / cash
    "TLT": "Q", "IEF": "Q", "SHY": "Q", "AGG": "P", "HYG": "P", "BIL": "P",
    # commodities / real assets
    "GLD": "P", "SLV": "P", "DBC": "P", "USO": "P", "UNG": "P", "VNQ": "P",
    # sector SPDRs
    "XLK": "P", "XLE": "P", "XLF": "P", "XLV": "P", "XLI": "P", "XLP": "P",
    "XLU": "P", "XLB": "P", "XLY": "P", "XLC": "P", "XLRE": "P",
}

CRYPTO = {"BTCUSD": "BTC-USD", "ETHUSD": "ETH-USD"}  # LEAN pair -> Yahoo ticker

# FX majors (LEAN forex pair -> Yahoo ticker). Written to the oanda market.
FX = {
    "EURUSD": "EURUSD=X", "GBPUSD": "GBPUSD=X", "USDJPY": "USDJPY=X",
    "USDCHF": "USDCHF=X", "AUDUSD": "AUDUSD=X", "USDCAD": "USDCAD=X",
    "NZDUSD": "NZDUSD=X", "EURGBP": "EURGBP=X",
}

VIX_URL = "https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv"

FAR_FUTURE = "20501231"


def log(msg: str) -> None:
    print(msg, flush=True)


def zip_write(path: str, inner_name: str, text: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(inner_name, text)


# ── Tier 1: equities/ETFs ────────────────────────────────────

def build_factor_file(df, dividends) -> str:
    """LEAN factor file: date,priceFactor,splitFactor,referencePrice.

    Row date = last CUM-dividend trading day (the day before ex-date);
    factors apply to all dates <= row date. Built backwards from 1.
    Splits are already folded into the Yahoo price series -> splitFactor 1.
    """
    closes = df["Close"]
    trading_days = df.index
    rows = []  # (yyyymmdd, price_factor, ref_close)
    pf = 1.0
    for ex_date, div in sorted(dividends.items(), reverse=True):
        if div <= 0:
            continue
        prior = trading_days[trading_days < ex_date]
        if len(prior) == 0:
            continue
        cum_day = prior[-1]
        ref = float(closes.loc[cum_day])
        if ref <= 0:
            continue
        pf *= (ref - float(div)) / ref
        rows.append((cum_day.strftime("%Y%m%d"), pf, ref))
    rows.reverse()

    first_day = trading_days[0].strftime("%Y%m%d")
    earliest_pf = rows[0][1] if rows else 1.0
    lines = [f"{first_day},{earliest_pf:.7f},1,1"]
    for d, factor, ref in rows:
        if d == first_day:
            continue
        lines.append(f"{d},{factor:.7f},1,{round(ref, 2)}")
    lines.append(f"{FAR_FUTURE},1,1,0")
    return "\n".join(lines) + "\n"


def write_equity(symbol: str, exchange: str, provenance: dict) -> None:
    t = yf.Ticker(symbol)
    df = t.history(period="max", auto_adjust=False, actions=True)
    if df.empty:
        log(f"  !! {symbol}: no data returned, skipped")
        return
    df = df[df["Volume"].notna() & df["Close"].notna()]
    df.index = df.index.tz_localize(None)

    sym = symbol.lower()
    csv_lines = []
    for ts, row in df.iterrows():
        # LEAN equity daily: deci-cent prices (x10000), integer volume
        csv_lines.append(
            f"{ts.strftime('%Y%m%d')} 00:00,"
            f"{round(row['Open'] * 10000)},{round(row['High'] * 10000)},"
            f"{round(row['Low'] * 10000)},{round(row['Close'] * 10000)},"
            f"{int(row['Volume'])}"
        )
    zip_write(
        os.path.join(DATA, "equity", "usa", "daily", f"{sym}.zip"),
        f"{sym}.csv",
        "\n".join(csv_lines) + "\n",
    )

    first_day = df.index[0].strftime("%Y%m%d")
    map_dir = os.path.join(DATA, "equity", "usa", "map_files")
    os.makedirs(map_dir, exist_ok=True)
    with open(os.path.join(map_dir, f"{sym}.csv"), "w", newline="\n") as f:
        f.write(f"{first_day},{sym},{exchange}\n{FAR_FUTURE},{sym},{exchange}\n")

    dividends = {
        ts.tz_localize(None) if ts.tzinfo else ts: float(v)
        for ts, v in t.dividends.items()
        if float(v) > 0
    }
    factor_dir = os.path.join(DATA, "equity", "usa", "factor_files")
    os.makedirs(factor_dir, exist_ok=True)
    with open(os.path.join(factor_dir, f"{sym}.csv"), "w", newline="\n") as f:
        f.write(build_factor_file(df, dividends))

    provenance[symbol] = {
        "type": "equity",
        "source": "Yahoo Finance (yfinance, auto_adjust=False)",
        "adjustment": "split-adjusted at source (splitFactor=1); dividends via factor file",
        "rows": len(df),
        "first": df.index[0].strftime("%Y-%m-%d"),
        "last": df.index[-1].strftime("%Y-%m-%d"),
        "dividend_events": len(dividends),
    }
    log(f"  ok {symbol}: {len(df)} rows {df.index[0].date()} -> {df.index[-1].date()}, {len(dividends)} dividends")


# ── Tier 2: VIX ──────────────────────────────────────────────

def write_vix(provenance: dict) -> None:
    r = requests.get(VIX_URL, timeout=60)
    r.raise_for_status()
    raw = r.text

    alt_dir = os.path.join(DATA, "alternative", "vix")
    os.makedirs(alt_dir, exist_ok=True)
    with open(os.path.join(alt_dir, "vix_history.csv"), "w", newline="\n") as f:
        f.write(raw)

    lines = raw.strip().splitlines()
    out, first, last, n = [], None, None, 0
    for line in lines[1:]:  # skip header DATE,OPEN,HIGH,LOW,CLOSE
        parts = line.split(",")
        if len(parts) < 5:
            continue
        d = datetime.strptime(parts[0].strip(), "%m/%d/%Y")
        o, h, lo, c = (float(x) for x in parts[1:5])
        # LEAN index daily files carry unscaled values, volume 0
        out.append(f"{d.strftime('%Y%m%d')} 00:00,{o},{h},{lo},{c},0")
        last = d
        first = first or d
        n += 1
    zip_write(
        os.path.join(DATA, "index", "usa", "daily", "vix.zip"),
        "vix.csv",
        "\n".join(out) + "\n",
    )
    provenance["VIX"] = {
        "type": "index + raw csv",
        "source": f"CBOE ({VIX_URL})",
        "adjustment": "none (index level)",
        "rows": n,
        "first": first.strftime("%Y-%m-%d"),
        "last": last.strftime("%Y-%m-%d"),
        "note": "index zip written unscaled; validate via a LEAN log before first use",
    }
    log(f"  ok VIX: {n} rows {first.date()} -> {last.date()}")


# ── Tier 3: crypto ───────────────────────────────────────────

def write_crypto(pair: str, yahoo: str, provenance: dict) -> None:
    df = yf.Ticker(yahoo).history(period="max", auto_adjust=False)
    if df.empty:
        log(f"  !! {pair}: no data returned, skipped")
        return
    df = df[df["Close"].notna()]
    df.index = df.index.tz_localize(None)
    sym = pair.lower()
    csv_lines = [
        f"{ts.strftime('%Y%m%d')} 00:00,"
        f"{row['Open']},{row['High']},{row['Low']},{row['Close']},{row['Volume']}"
        for ts, row in df.iterrows()
    ]
    zip_write(
        os.path.join(DATA, "crypto", "coinbase", "daily", f"{sym}_trade.zip"),
        f"{sym}.csv",
        "\n".join(csv_lines) + "\n",
    )
    provenance[pair] = {
        "type": "crypto (market: coinbase)",
        "source": f"Yahoo Finance ({yahoo})",
        "adjustment": "none",
        "rows": len(df),
        "first": df.index[0].strftime("%Y-%m-%d"),
        "last": df.index[-1].strftime("%Y-%m-%d"),
    }
    log(f"  ok {pair}: {len(df)} rows {df.index[0].date()} -> {df.index[-1].date()}")


# ── FX (forex, oanda market) ─────────────────────────────────

def write_fx(pair: str, yahoo: str, provenance: dict) -> None:
    df = yf.Ticker(yahoo).history(period="max", auto_adjust=False)
    if df.empty:
        log(f"  !! {pair}: no data returned, skipped")
        return
    df = df[df["Close"].notna()]
    df.index = df.index.tz_localize(None)
    sym = pair.lower()
    # LEAN forex daily: "yyyyMMdd HH:mm,open,high,low,close" (no volume)
    csv_lines = [
        f"{ts.strftime('%Y%m%d')} 00:00,"
        f"{row['Open']:.6f},{row['High']:.6f},{row['Low']:.6f},{row['Close']:.6f}"
        for ts, row in df.iterrows()
    ]
    zip_write(
        os.path.join(DATA, "forex", "oanda", "daily", f"{sym}.zip"),
        f"{sym}.csv",
        "\n".join(csv_lines) + "\n",
    )
    provenance[pair] = {
        "type": "forex (market: oanda)",
        "source": f"Yahoo Finance ({yahoo})",
        "adjustment": "none",
        "rows": len(df),
        "first": df.index[0].strftime("%Y-%m-%d"),
        "last": df.index[-1].strftime("%Y-%m-%d"),
    }
    log(f"  ok {pair}: {len(df)} rows {df.index[0].date()} -> {df.index[-1].date()}")


# ── provenance ───────────────────────────────────────────────

def write_provenance(provenance: dict) -> None:
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    md = [
        "# Data Provenance",
        "",
        f"Last refreshed: {stamp} by `packages/lean-engine/pipeline/download_data.py`.",
        "",
        "Free daily data for strategy research. Split adjustments are folded into",
        "equity price series at source (Yahoo); factor files carry dividends only.",
        "ETF set only — not a survivorship-safe single-stock universe.",
        "",
        "| Symbol | Type | Source | Rows | Coverage | Notes |",
        "|---|---|---|---|---|---|",
    ]
    for sym in sorted(provenance):
        p = provenance[sym]
        md.append(
            f"| {sym} | {p['type']} | {p['source']} | {p['rows']} "
            f"| {p['first']} -> {p['last']} | {p.get('note', p['adjustment'])} |"
        )
    with open(os.path.join(DATA, "PROVENANCE.md"), "w", newline="\n") as f:
        f.write("\n".join(md) + "\n")
    with open(os.path.join(DATA, "provenance.json"), "w", newline="\n") as f:
        json.dump({"refreshed": stamp, "symbols": provenance}, f, indent=2)


# ── main ─────────────────────────────────────────────────────

def main() -> None:
    subset = {s.upper() for s in sys.argv[1:]}
    provenance = {}
    if os.path.exists(os.path.join(DATA, "provenance.json")):
        try:
            with open(os.path.join(DATA, "provenance.json")) as f:
                provenance = json.load(f).get("symbols", {})
        except Exception:
            provenance = {}

    log(f"LEAN data dir: {DATA}")
    log("Tier 1 — equities/ETFs")
    for sym, exch in EQUITIES.items():
        if subset and sym not in subset:
            continue
        try:
            write_equity(sym, exch, provenance)
        except Exception as e:
            log(f"  !! {sym}: {e}")

    if not subset or "VIX" in subset:
        log("Tier 2 — VIX")
        try:
            write_vix(provenance)
        except Exception as e:
            log(f"  !! VIX: {e}")

    log("Tier 3 — crypto")
    for pair, yahoo in CRYPTO.items():
        if subset and pair not in subset:
            continue
        try:
            write_crypto(pair, yahoo, provenance)
        except Exception as e:
            log(f"  !! {pair}: {e}")

    log("Tier 3 — FX")
    for pair, yahoo in FX.items():
        if subset and pair not in subset:
            continue
        try:
            write_fx(pair, yahoo, provenance)
        except Exception as e:
            log(f"  !! {pair}: {e}")

    write_provenance(provenance)
    log("provenance written: data/PROVENANCE.md")


if __name__ == "__main__":
    main()
