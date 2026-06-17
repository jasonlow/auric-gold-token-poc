export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
export const SIM_BASE = import.meta.env.VITE_SIM_BASE_URL || "http://localhost:9090";

async function jsonGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
async function jsonPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ---- pricing ----
export interface Spot {
  pricePerGramSgd: number;
  xauUsdPerOunce: number;
  usdSgdRate: number;
  stale: boolean;
}
export const fetchSpot = () => jsonGet<Spot>(`${API_BASE}/api/v1/price/spot`);

export interface Quote {
  quoteId: string;
  grams: number;
  side: string;
  pricePerGramSgd: number;
  goldValueSgd: number;
  feeSgd: number;
  totalSgd: number;
}
export const fetchQuote = (grams: number, side: "MINT" | "REDEEM") =>
  jsonGet<Quote>(`${API_BASE}/api/v1/price/quote?grams=${grams}&side=${side}`);

// ---- sagas ----
export interface MintResult {
  transactionId: number | null;
  state: string;
  txnHash: string | null;
  grams: number;
  fiatAmountSgd: number | null;
  failureReason: string | null;
}
export const postMint = (b: {
  walletAddress: string;
  grams: number;
  paymentReference: string;
  idempotencyKey: string;
}) => jsonPost<MintResult>(`${API_BASE}/api/v1/mint`, b);

export interface RedeemResult {
  transactionId: number | null;
  state: string;
  txnHash: string | null;
  grams: number;
  fiatAmountSgd: number | null;
  failureReason: string | null;
}
export const postRedeem = (b: {
  walletAddress: string;
  grams: number;
  bankAccount: string;
  idempotencyKey: string;
}) => jsonPost<RedeemResult>(`${API_BASE}/api/v1/redeem`, b);

// ---- admin / POC helpers ----
export const onboardWallet = (walletAddress: string) =>
  jsonPost<unknown>(`${API_BASE}/api/v1/admin/whitelist`, { walletAddress });

/** POC: simulate the investor's SGD payment landing at the bank. */
export const simCredit = (reference: string, amountSgd: number) =>
  jsonPost<unknown>(`${SIM_BASE}/bank/_credit`, { reference, amountSgd });

// ---- history ----
export interface Txn {
  id: number;
  type: string;
  state: string;
  grams: number | null;
  fiatAmountSgd: number | null;
  txnHash: string | null;
  createdAt: string | null;
}
export const fetchTransactions = (wallet: string) =>
  jsonGet<Txn[]>(`${API_BASE}/api/v1/transactions?wallet=${wallet}`);

// ---- admin / reconciliation ----
export interface ReconStatus {
  mintingPaused: boolean;
  pauseReason: string | null;
  latest: {
    onchainSupplyGrams: number;
    vaultGrams: number;
    pendingMintsGrams: number;
    pendingBurnsGrams: number;
    netDeltaGrams: number;
    status: string;
    breach: boolean;
    checkedAt?: string;
  } | null;
}
export const fetchReconStatus = () => jsonGet<ReconStatus>(`${API_BASE}/api/v1/recon/status`);
export const triggerRecon = () => jsonPost<unknown>(`${API_BASE}/api/v1/recon/trigger`, {});
export const resumeMinting = () => jsonPost<unknown>(`${API_BASE}/api/v1/recon/resume`, {});

export interface AdminTxn extends Txn {
  counterparty: string | null;
}
export const fetchRecentTxns = () => jsonGet<AdminTxn[]>(`${API_BASE}/api/v1/transactions/recent`);

export interface AuditRow {
  id: number;
  actor: string;
  action: string;
  target: string;
  details: string;
  createdAt: string | null;
}
export const fetchAudit = () => jsonGet<AuditRow[]>(`${API_BASE}/api/v1/audit`);

export const sgd = (n: number) =>
  `S$${n.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
