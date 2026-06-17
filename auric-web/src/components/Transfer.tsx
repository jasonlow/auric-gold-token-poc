import { useEffect, useState } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { isAddress, parseUnits, BaseError } from "viem";
import { goldTokenAbi, goldTokenAddress } from "../contracts";

const explorer = import.meta.env.VITE_BLOCK_EXPLORER_URL || "https://amoy.polygonscan.com";

/** User-signed P2P transfer of XAU.g (the user signs in their own wallet). */
export function Transfer() {
  const { isConnected } = useAccount();
  const qc = useQueryClient();
  const [to, setTo] = useState("");
  const [grams, setGrams] = useState("");

  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      qc.invalidateQueries(); // refresh balances after a confirmed transfer
      setTo("");
      setGrams("");
    }
  }, [isSuccess, qc]);

  if (!isConnected) return null;

  const valid = isAddress(to) && Number(grams) > 0;
  const submit = () =>
    writeContract({
      address: goldTokenAddress,
      abi: goldTokenAbi,
      functionName: "transfer",
      args: [to as `0x${string}`, parseUnits(grams || "0", 18)],
    });

  const errMsg = error ? ((error as BaseError).shortMessage ?? error.message) : null;

  return (
    <div className="transfer">
      <h3>Send XAU.g</h3>
      <p className="muted small">Recipient must be a whitelisted wallet (enforced on-chain).</p>
      <input className="inp" placeholder="Recipient 0x…" value={to} onChange={(e) => setTo(e.target.value)} />
      <input
        className="inp"
        placeholder="Grams"
        inputMode="decimal"
        value={grams}
        onChange={(e) => setGrams(e.target.value)}
      />
      <button className="btn" disabled={!valid || isPending || confirming} onClick={submit}>
        {isPending ? "Confirm in wallet…" : confirming ? "Sending…" : "Send"}
      </button>

      {isSuccess && hash && (
        <p className="ok-msg">
          ✅ Sent —{" "}
          <a href={`${explorer}/tx/${hash}`} target="_blank" rel="noreferrer">
            view tx
          </a>
        </p>
      )}
      {errMsg && <p className="err">{errMsg}</p>}
      {(isSuccess || error) && (
        <button className="btn ghost small" onClick={() => reset()}>
          Clear
        </button>
      )}
    </div>
  );
}
