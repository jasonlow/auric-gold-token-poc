import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { fetchQuote, onboardWallet, postMint, sgd, simCredit, type MintResult, type Quote } from "../lib/api";
import { identityRegistryAbi, identityRegistryAddress } from "../contracts";

type Step = "input" | "pay" | "done";

export function BuyGold() {
  const { address } = useAccount();
  const qc = useQueryClient();
  const [grams, setGrams] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [reference, setReference] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MintResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live on-chain onboarding (whitelist) status for the connected wallet.
  const { data: onboarded, refetch: refetchOnboarded } = useReadContract({
    address: identityRegistryAddress,
    abi: identityRegistryAbi,
    functionName: "isVerified",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const reset = () => {
    setGrams("");
    setQuote(null);
    setResult(null);
    setError(null);
    setStep("input");
  };

  const getQuote = async () => {
    setError(null);
    try {
      setQuote(await fetchQuote(Number(grams), "MINT"));
    } catch (e) {
      setError(`Could not get a quote (${(e as Error).message}). Is the engine running?`);
    }
  };

  const confirm = () => {
    setReference(`GOLD-${Date.now()}`);
    setStep("pay");
  };

  const payAndMint = async () => {
    if (!address || !quote) return;
    setBusy(true);
    setError(null);
    try {
      await simCredit(reference, quote.totalSgd); // POC: simulate the SGD arriving
      const r = await postMint({
        walletAddress: address,
        grams: Number(grams),
        paymentReference: reference,
        idempotencyKey: crypto.randomUUID(),
      });
      setResult(r);
      setStep("done");
      if (r.state === "CONFIRMED") qc.invalidateQueries();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onboard = async () => {
    if (!address) return;
    setBusy(true);
    try {
      await onboardWallet(address);
      await refetchOnboarded();
      setError("Onboarded ✓ — you're whitelisted. Continue your purchase.");
    } catch (e) {
      setError(`Onboard failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  if (step === "input") {
    return (
      <div className="panel">
        <h3>Buy Gold</h3>
        {onboarded ? (
          <p className="ok-msg small">✓ Wallet onboarded (whitelisted) — ready to buy.</p>
        ) : (
          <p className="muted small">
            New wallet?{" "}
            <button className="btn ghost small" disabled={busy} onClick={onboard}>
              {busy ? "Onboarding…" : "Onboard (POC)"}
            </button>{" "}
            to whitelist it before your first purchase.
          </p>
        )}
        <input
          className="inp"
          placeholder="Grams"
          inputMode="decimal"
          value={grams}
          onChange={(e) => {
            setGrams(e.target.value);
            setQuote(null);
          }}
        />
        {!quote && (
          <button className="btn" disabled={!(Number(grams) > 0)} onClick={getQuote}>
            Get quote
          </button>
        )}
        {quote && (
          <div className="quote">
            <div className="qrow">
              <span>Gold ({quote.grams}g × {sgd(quote.pricePerGramSgd)})</span>
              <span>{sgd(quote.goldValueSgd)}</span>
            </div>
            <div className="qrow">
              <span>Minting fee (0.5%)</span>
              <span>{sgd(quote.feeSgd)}</span>
            </div>
            <div className="qrow total">
              <span>Total</span>
              <span>{sgd(quote.totalSgd)}</span>
            </div>
            <button className="btn" onClick={confirm}>
              Confirm purchase
            </button>
          </div>
        )}
        {error && <p className={error.startsWith("Onboarded") ? "ok-msg" : "err"}>{error}</p>}
      </div>
    );
  }

  if (step === "pay" && quote) {
    return (
      <div className="panel">
        <h3>Complete your purchase</h3>
        <p className="muted small">Transfer {sgd(quote.totalSgd)} to:</p>
        <div className="bank">
          <div>Bank: <strong>DBS</strong></div>
          <div>Account: <strong>072-123456-7</strong></div>
          <div>Name: <strong>Auric Securities Pte Ltd</strong></div>
          <div>Reference: <strong>{reference}</strong></div>
        </div>
        <button className="btn" disabled={busy} onClick={payAndMint}>
          {busy ? "Processing…" : "Simulate payment & mint (POC)"}
        </button>
        <button className="btn ghost small" onClick={reset}>
          Cancel
        </button>
        {error && (
          <>
            <p className="err">{error}</p>
            <button className="btn ghost small" disabled={busy} onClick={onboard}>
              Onboard me (POC)
            </button>
          </>
        )}
      </div>
    );
  }

  const ok = result?.state === "CONFIRMED";
  return (
    <div className="panel">
      <h3>{ok ? "🎉 Minted!" : "Purchase status"}</h3>
      <p>
        State: <strong>{result?.state}</strong>
        {result?.failureReason && <span className="err"> — {result.failureReason}</span>}
      </p>
      {result?.txnHash && <p className="small muted">tx: {result.txnHash}</p>}
      <button className="btn" onClick={reset}>
        Buy more
      </button>
    </div>
  );
}
