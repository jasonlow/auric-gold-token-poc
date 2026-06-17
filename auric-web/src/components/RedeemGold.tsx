import { useState } from "react";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { fetchQuote, postRedeem, sgd, type Quote, type RedeemResult } from "../lib/api";

export function RedeemGold() {
  const { address } = useAccount();
  const qc = useQueryClient();
  const [grams, setGrams] = useState("");
  const [bankAccount, setBankAccount] = useState("DBS-0001");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setGrams("");
    setQuote(null);
    setResult(null);
    setError(null);
  };

  const getQuote = async () => {
    setError(null);
    try {
      setQuote(await fetchQuote(Number(grams), "REDEEM"));
    } catch (e) {
      setError(`Could not get a quote (${(e as Error).message}).`);
    }
  };

  const redeem = async () => {
    if (!address || !quote) return;
    setBusy(true);
    setError(null);
    try {
      const r = await postRedeem({
        walletAddress: address,
        grams: Number(grams),
        bankAccount,
        idempotencyKey: crypto.randomUUID(),
      });
      setResult(r);
      if (r.state === "COMPLETE") qc.invalidateQueries();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    const ok = result.state === "COMPLETE";
    return (
      <div className="panel">
        <h3>{ok ? "✅ Redemption complete" : "Redemption status"}</h3>
        <p>
          State: <strong>{result.state}</strong>
          {result.failureReason && <span className="err"> — {result.failureReason}</span>}
        </p>
        {result.fiatAmountSgd != null && <p>You receive: <strong>{sgd(result.fiatAmountSgd)}</strong></p>}
        {result.txnHash && <p className="small muted">burn tx: {result.txnHash}</p>}
        <button className="btn" onClick={reset}>
          Redeem again
        </button>
      </div>
    );
  }

  return (
    <div className="panel">
      <h3>Redeem for SGD</h3>
      <p className="muted small">⚠ Tokens are locked, gold is sold, then SGD is paid — only then are they burned.</p>
      <input
        className="inp"
        placeholder="Grams to redeem"
        inputMode="decimal"
        value={grams}
        onChange={(e) => {
          setGrams(e.target.value);
          setQuote(null);
        }}
      />
      <input className="inp" placeholder="Bank account" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
      {!quote && (
        <button className="btn" disabled={!(Number(grams) > 0)} onClick={getQuote}>
          Get quote
        </button>
      )}
      {quote && (
        <div className="quote">
          <div className="qrow">
            <span>Gold value ({quote.grams}g)</span>
            <span>{sgd(quote.goldValueSgd)}</span>
          </div>
          <div className="qrow">
            <span>Redemption fee (0.5%)</span>
            <span>−{sgd(quote.feeSgd)}</span>
          </div>
          <div className="qrow total">
            <span>You receive</span>
            <span>{sgd(quote.totalSgd)}</span>
          </div>
          <button className="btn" disabled={busy} onClick={redeem}>
            {busy ? "Processing…" : "Confirm redemption"}
          </button>
        </div>
      )}
      {error && <p className="err">{error}</p>}
    </div>
  );
}
