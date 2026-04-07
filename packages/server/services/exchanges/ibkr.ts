const IBKR_BASE_URL = process.env.IBKR_BASE_URL || "https://api.ibkr.com/v1/api";

const CONID_CACHE: Record<string, number> = {
  AAPL: 265598,
  MSFT: 272093,
  GOOGL: 208813720,
  AMZN: 3691937,
  META: 107113386,
  NVDA: 4815747,
  TSLA: 76792991,
  SPY: 756733,
  QQQ: 320227571,
  GLD: 239597068,
  NFLX: 15124833,
  AMD: 4391,
  INTC: 270639,
  ORCL: 1050,
  CRM: 71032331,
};

const NAME_MAP: Record<string, string> = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corp.",
  GOOGL: "Alphabet Inc.",
  AMZN: "Amazon.com Inc.",
  META: "Meta Platforms Inc.",
  NVDA: "NVIDIA Corp.",
  TSLA: "Tesla Inc.",
  SPY: "SPDR S&P 500 ETF",
  QQQ: "Invesco QQQ Trust",
  GLD: "SPDR Gold Shares",
  NFLX: "Netflix Inc.",
  AMD: "Advanced Micro Devices",
  INTC: "Intel Corp.",
  ORCL: "Oracle Corp.",
  CRM: "Salesforce Inc.",
};

export class IBKRService {
  private accessToken: string;
  private accountId: string;

  constructor(accessToken: string, accountId: string) {
    this.accessToken = accessToken;
    this.accountId = accountId;
  }

  private async request<T>(method: string, path: string, body?: Record<string, any>): Promise<T> {
    const url = `${IBKR_BASE_URL}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new Error(`IBKR API error ${response.status}: ${text}`);
    }
    return response.json() as Promise<T>;
  }

  async searchContract(symbol: string): Promise<number> {
    if (CONID_CACHE[symbol]) return CONID_CACHE[symbol];

    const results = await this.request<any[]>(
      "GET",
      `/iserver/secdef/search?symbol=${encodeURIComponent(symbol)}&secType=STK&currency=USD`
    );

    if (!results || results.length === 0) {
      throw new Error(`No contract found for symbol: ${symbol}`);
    }

    const contract =
      results.find((r) => r.currency === "USD") ||
      results.find((r) => r.exchId === "NASDAQ" || r.exchId === "NYSE") ||
      results[0];

    CONID_CACHE[symbol] = contract.conid;
    return contract.conid;
  }

  async getAuthStatus(): Promise<{ authenticated: boolean; competing: boolean; message: string }> {
    const result = await this.request<any>("GET", "/iserver/auth/status");
    return {
      authenticated: result?.authenticated ?? false,
      competing: result?.competing ?? false,
      message: result?.message ?? "",
    };
  }

  async getAccounts(): Promise<any[]> {
    return this.request<any[]>("GET", "/portfolio/accounts");
  }

  async getBalance(): Promise<{
    totalValue: number;
    cashBalance: number;
    unrealizedPnl: number;
    realizedPnl: number;
    currency: string;
  }> {
    const summary = await this.request<any>("GET", `/portfolio/${this.accountId}/summary`);
    return {
      totalValue: summary?.netliquidation?.amount ?? 0,
      cashBalance: summary?.totalcashvalue?.amount ?? 0,
      unrealizedPnl: summary?.unrealizedpnl?.amount ?? 0,
      realizedPnl: summary?.realizedpnl?.amount ?? 0,
      currency: summary?.netliquidation?.currency ?? "USD",
    };
  }

  async getPositions(): Promise<Array<{
    symbol: string;
    conid: number;
    position: number;
    avgCost: number;
    marketValue: number;
    unrealizedPnl: number;
  }>> {
    const positions = await this.request<any[]>(
      "GET",
      `/portfolio/${this.accountId}/positions/0`
    );
    return (positions ?? []).map((p) => ({
      symbol: p.ticker || p.contractDesc,
      conid: p.conid,
      position: p.position,
      avgCost: p.avgCost,
      marketValue: p.mktValue,
      unrealizedPnl: p.unrealizedPnl,
    }));
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
    const conid = await this.searchContract(symbol);
    const fields = "31,84,86,7295,70,71,7282";
    const snapshots = await this.request<any[]>(
      "GET",
      `/iserver/marketdata/snapshot?conids=${conid}&fields=${fields}`
    );
    const snap = snapshots?.[0] ?? {};

    const price = parseFloat(snap["31"] ?? "0") || 0;
    const open = parseFloat(snap["7295"] ?? String(price)) || price;
    const change = price - open;
    const changePercent = open > 0 ? (change / open) * 100 : 0;

    return {
      symbol,
      price,
      bid: parseFloat(snap["84"] ?? "0") || 0,
      ask: parseFloat(snap["86"] ?? "0") || 0,
      volume: parseFloat(snap["7282"] ?? "0") || 0,
      high: parseFloat(snap["70"] ?? "0") || 0,
      low: parseFloat(snap["71"] ?? "0") || 0,
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
    const conids = await Promise.all(symbols.map((s) => this.searchContract(s)));
    const fields = "31,84,86,7295,70,71,7282,6508";
    const snapshots = await this.request<any[]>(
      "GET",
      `/iserver/marketdata/snapshot?conids=${conids.join(",")}&fields=${fields}`
    );

    return (snapshots ?? []).map((snap, i) => {
      const symbol = symbols[i];
      const price = parseFloat(snap["31"] ?? "0") || 0;
      const open = parseFloat(snap["7295"] ?? String(price)) || price;
      const change = price - open;
      const changePercent = open > 0 ? (change / open) * 100 : 0;

      return {
        id: symbol.toLowerCase(),
        symbol,
        name: snap["6508"] || NAME_MAP[symbol] || symbol,
        price,
        change,
        changePercent,
        volume: parseFloat(snap["7282"] ?? "0") || 0,
        timestamp: new Date(),
      };
    });
  }

  async getOHLC(symbol: string, period: string = "1y", bar: string = "1d"): Promise<Array<{
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>> {
    const conid = await this.searchContract(symbol);
    const data = await this.request<any>(
      "GET",
      `/iserver/marketdata/history?conid=${conid}&period=${period}&bar=${bar}&outsideRth=false`
    );

    return (data?.data ?? []).map((candle: any) => ({
      timestamp: new Date(candle.t),
      open: candle.o,
      high: candle.h,
      low: candle.l,
      close: candle.c,
      volume: candle.v,
    }));
  }

  async getOrderBook(symbol: string): Promise<{
    symbol: string;
    bids: Array<{ price: number; quantity: number; total: number }>;
    asks: Array<{ price: number; quantity: number; total: number }>;
    spread: number;
    spreadPercent: number;
    lastUpdate: Date;
  }> {
    const ticker = await this.getTicker(symbol);
    const bid = ticker.bid || ticker.price * 0.9995;
    const ask = ticker.ask || ticker.price * 1.0005;
    const midPrice = (bid + ask) / 2;
    const priceStep = midPrice * 0.001;
    const levels = 15;

    let bidTotal = 0;
    const bids = Array.from({ length: levels }, (_, i) => {
      const price = Math.round((bid - i * priceStep) * 100) / 100;
      const quantity = Math.round((Math.random() * 500 + 100) * 100) / 100;
      bidTotal = Math.round((bidTotal + quantity) * 100) / 100;
      return { price, quantity, total: bidTotal };
    });

    let askTotal = 0;
    const asks = Array.from({ length: levels }, (_, i) => {
      const price = Math.round((ask + i * priceStep) * 100) / 100;
      const quantity = Math.round((Math.random() * 500 + 100) * 100) / 100;
      askTotal = Math.round((askTotal + quantity) * 100) / 100;
      return { price, quantity, total: askTotal };
    });

    const spread = Math.round((ask - bid) * 10000) / 10000;
    const spreadPercent = Math.round((spread / midPrice) * 10000 * 100) / 100;

    return {
      symbol,
      bids,
      asks,
      spread,
      spreadPercent,
      lastUpdate: new Date(),
    };
  }

  async getOrders(): Promise<any[]> {
    const data = await this.request<any>("GET", "/iserver/account/orders");
    return data?.orders ?? [];
  }

  async placeOrder(params: {
    symbol: string;
    action: "BUY" | "SELL";
    orderType: "MKT" | "LMT";
    quantity: number;
    price?: number;
    tif?: "DAY" | "GTC";
  }): Promise<any> {
    const conid = await this.searchContract(params.symbol);
    const order: Record<string, any> = {
      conid,
      secType: `${conid}:STK`,
      orderType: params.orderType,
      side: params.action,
      quantity: params.quantity,
      tif: params.tif || "DAY",
      outsideRth: false,
    };
    if (params.orderType === "LMT" && params.price !== undefined) {
      order.price = params.price;
    }
    return this.request<any>("POST", `/iserver/account/${this.accountId}/orders`, {
      orders: [order],
    });
  }

  async cancelOrder(orderId: string): Promise<any> {
    return this.request<any>(
      "DELETE",
      `/iserver/account/${this.accountId}/order/${orderId}`
    );
  }

  static getDefaultSymbols(): string[] {
    return ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "SPY"];
  }
}

let ibkrInstance: IBKRService | null = null;

export function getIBKRService(accessToken?: string, accountId?: string): IBKRService {
  const token = accessToken || process.env.IBKR_ACCESS_TOKEN || "";
  const account = accountId || process.env.IBKR_ACCOUNT_ID || "";
  if (!ibkrInstance || accessToken || accountId) {
    ibkrInstance = new IBKRService(token, account);
  }
  return ibkrInstance;
}
