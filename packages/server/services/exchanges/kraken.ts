import crypto from "crypto";

const KRAKEN_API_URL = "https://api.kraken.com";

interface KrakenTickerData {
  a: [string, string, string]; // Ask [price, whole lot volume, lot volume]
  b: [string, string, string]; // Bid [price, whole lot volume, lot volume]
  c: [string, string]; // Last trade closed [price, lot volume]
  v: [string, string]; // Volume [today, last 24 hours]
  p: [string, string]; // Volume weighted average price [today, last 24 hours]
  t: [number, number]; // Number of trades [today, last 24 hours]
  l: [string, string]; // Low [today, last 24 hours]
  h: [string, string]; // High [today, last 24 hours]
  o: string; // Today's opening price
}

interface KrakenOHLCData {
  time: number;
  open: string;
  high: string;
  low: string;
  close: string;
  vwap: string;
  volume: string;
  count: number;
}

interface KrakenOrderBookEntry {
  price: string;
  volume: string;
  timestamp: number;
}

interface KrakenAssetPair {
  altname: string;
  wsname: string;
  base: string;
  quote: string;
}

const SYMBOL_MAP: Record<string, string> = {
  "BTC/USD": "XXBTZUSD",
  "ETH/USD": "XETHZUSD",
  "SOL/USD": "SOLUSD",
  "ADA/USD": "ADAUSD",
  "XRP/USD": "XXRPZUSD",
  "DOT/USD": "DOTUSD",
  "AVAX/USD": "AVAXUSD",
  "LINK/USD": "LINKUSD",
  "MATIC/USD": "MATICUSD",
  "DOGE/USD": "XDGUSD",
};

const REVERSE_SYMBOL_MAP: Record<string, string> = Object.entries(SYMBOL_MAP).reduce(
  (acc, [key, value]) => ({ ...acc, [value]: key }),
  {}
);

export class KrakenService {
  private apiKey?: string;
  private apiSecret?: string;

  constructor(apiKey?: string, apiSecret?: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  private getKrakenSymbol(symbol: string): string {
    return SYMBOL_MAP[symbol] || symbol.replace("/", "");
  }

  private getStandardSymbol(krakenSymbol: string): string {
    return REVERSE_SYMBOL_MAP[krakenSymbol] || krakenSymbol;
  }

  private async publicRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    const queryString = new URLSearchParams(params).toString();
    const url = `${KRAKEN_API_URL}/0/public/${endpoint}${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Kraken API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken API error: ${data.error.join(", ")}`);
    }

    return data.result;
  }

  private createSignature(path: string, nonce: number, postData: string): string {
    if (!this.apiSecret) throw new Error("API secret required for private requests");

    const message = nonce + postData;
    const hash = crypto.createHash("sha256").update(message).digest();
    const secret = Buffer.from(this.apiSecret, "base64");
    const hmac = crypto.createHmac("sha512", secret);
    hmac.update(path);
    hmac.update(hash);
    return hmac.digest("base64");
  }

  private async privateRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error("API key and secret required for private requests");
    }

    const path = `/0/private/${endpoint}`;
    const nonce = Date.now() * 1000;
    const postData = new URLSearchParams({ nonce: nonce.toString(), ...params }).toString();

    const signature = this.createSignature(path, nonce, postData);

    const response = await fetch(`${KRAKEN_API_URL}${path}`, {
      method: "POST",
      headers: {
        "API-Key": this.apiKey,
        "API-Sign": signature,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: postData,
    });

    if (!response.ok) {
      throw new Error(`Kraken API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken API error: ${data.error.join(", ")}`);
    }

    return data.result;
  }

  async getTicker(symbol: string): Promise<{
    symbol: string;
    price: number;
    bid: number;
    ask: number;
    volume: number;
    high: number;
    low: number;
    change: number;
    changePercent: number;
  }> {
    const krakenSymbol = this.getKrakenSymbol(symbol);
    const result = await this.publicRequest("Ticker", { pair: krakenSymbol });

    const tickerKey = Object.keys(result)[0];
    const ticker: KrakenTickerData = result[tickerKey];

    const currentPrice = parseFloat(ticker.c[0]);
    const openPrice = parseFloat(ticker.o);
    const change = currentPrice - openPrice;
    const changePercent = openPrice > 0 ? (change / openPrice) * 100 : 0;

    return {
      symbol,
      price: currentPrice,
      bid: parseFloat(ticker.b[0]),
      ask: parseFloat(ticker.a[0]),
      volume: parseFloat(ticker.v[1]),
      high: parseFloat(ticker.h[1]),
      low: parseFloat(ticker.l[1]),
      change,
      changePercent,
    };
  }

  async getMultipleTickers(symbols: string[]): Promise<Array<{
    id: string;
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    timestamp: Date;
  }>> {
    const krakenSymbols = symbols.map((s) => this.getKrakenSymbol(s)).join(",");
    const result = await this.publicRequest("Ticker", { pair: krakenSymbols });

    const nameMap: Record<string, string> = {
      "BTC/USD": "Bitcoin",
      "ETH/USD": "Ethereum",
      "SOL/USD": "Solana",
      "ADA/USD": "Cardano",
      "XRP/USD": "Ripple",
      "DOT/USD": "Polkadot",
      "AVAX/USD": "Avalanche",
      "LINK/USD": "Chainlink",
      "MATIC/USD": "Polygon",
      "DOGE/USD": "Dogecoin",
    };

    return Object.entries(result).map(([krakenSymbol, ticker]: [string, any]) => {
      const symbol = this.getStandardSymbol(krakenSymbol);
      const currentPrice = parseFloat(ticker.c[0]);
      const openPrice = parseFloat(ticker.o);
      const change = currentPrice - openPrice;
      const changePercent = openPrice > 0 ? (change / openPrice) * 100 : 0;

      return {
        id: krakenSymbol.toLowerCase(),
        symbol,
        name: nameMap[symbol] || symbol,
        price: currentPrice,
        change,
        changePercent,
        volume: parseFloat(ticker.v[1]) * currentPrice,
        timestamp: new Date(),
      };
    });
  }

  async getOHLC(symbol: string, interval: number = 1440, since?: number): Promise<Array<{
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>> {
    const krakenSymbol = this.getKrakenSymbol(symbol);
    const params: Record<string, string> = {
      pair: krakenSymbol,
      interval: interval.toString(),
    };
    if (since) params.since = since.toString();

    const result = await this.publicRequest("OHLC", params);
    const ohlcKey = Object.keys(result).find((k) => k !== "last");

    if (!ohlcKey || !result[ohlcKey]) return [];

    return result[ohlcKey].map((candle: any[]) => ({
      timestamp: new Date(candle[0] * 1000),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[6]),
    }));
  }

  async getOrderBook(symbol: string, count: number = 15): Promise<{
    symbol: string;
    bids: Array<{ price: number; quantity: number; total: number }>;
    asks: Array<{ price: number; quantity: number; total: number }>;
    spread: number;
    spreadPercent: number;
    lastUpdate: Date;
  }> {
    const krakenSymbol = this.getKrakenSymbol(symbol);
    const result = await this.publicRequest("Depth", {
      pair: krakenSymbol,
      count: count.toString(),
    });

    const bookKey = Object.keys(result)[0];
    const book = result[bookKey];

    let bidTotal = 0;
    const bids = book.bids.slice(0, count).map((entry: any[]) => {
      const price = parseFloat(entry[0]);
      const quantity = parseFloat(entry[1]);
      bidTotal += quantity;
      return { price, quantity, total: bidTotal };
    });

    let askTotal = 0;
    const asks = book.asks.slice(0, count).map((entry: any[]) => {
      const price = parseFloat(entry[0]);
      const quantity = parseFloat(entry[1]);
      askTotal += quantity;
      return { price, quantity, total: askTotal };
    });

    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    const spread = bestAsk - bestBid;
    const midPrice = (bestBid + bestAsk) / 2;
    const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;

    return {
      symbol,
      bids,
      asks,
      spread,
      spreadPercent,
      lastUpdate: new Date(),
    };
  }

  async getAssetPairs(): Promise<Record<string, KrakenAssetPair>> {
    return this.publicRequest("AssetPairs");
  }

  async getBalance(): Promise<Record<string, string>> {
    return this.privateRequest("Balance");
  }

  async getOpenOrders(): Promise<any> {
    return this.privateRequest("OpenOrders");
  }

  async placeOrder(params: {
    pair: string;
    type: "buy" | "sell";
    ordertype: "market" | "limit";
    volume: string;
    price?: string;
  }): Promise<any> {
    return this.privateRequest("AddOrder", params);
  }

  async cancelOrder(txid: string): Promise<any> {
    return this.privateRequest("CancelOrder", { txid });
  }
}

let krakenServiceInstance: KrakenService | null = null;

export function getKrakenService(apiKey?: string, apiSecret?: string): KrakenService {
  if (!krakenServiceInstance || apiKey || apiSecret) {
    krakenServiceInstance = new KrakenService(apiKey, apiSecret);
  }
  return krakenServiceInstance;
}
