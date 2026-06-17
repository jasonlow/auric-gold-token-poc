import { useAccount, useReadContract } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { goldTokenAbi, goldTokenAddress } from "../contracts";
import { fetchSpot } from "../lib/api";

const sgd = (n: number) => `S$${n.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function Portfolio() {
  const { address, isConnected } = useAccount();

  const { data: decimals } = useReadContract({
    address: goldTokenAddress,
    abi: goldTokenAbi,
    functionName: "decimals",
  });

  const { data: rawBalance, isLoading, refetch } = useReadContract({
    address: goldTokenAddress,
    abi: goldTokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const spot = useQuery({ queryKey: ["spot"], queryFn: fetchSpot, refetchInterval: 30_000 });

  if (!isConnected) return null;

  const dec = decimals ?? 18;
  const grams = rawBalance != null ? Number(formatUnits(rawBalance as bigint, dec)) : 0;
  const pricePerGram = spot.data?.pricePerGramSgd ?? 0;
  const nav = grams * pricePerGram;

  return (
    <div className="portfolio">
      <div className="stats">
        <div className="stat">
          <span>Your Gold</span>
          <strong>{isLoading ? "…" : `${grams.toFixed(2)} g`}</strong>
        </div>
        <div className="stat">
          <span>NAV</span>
          <strong>{spot.isLoading ? "…" : sgd(nav)}</strong>
        </div>
        <div className="stat">
          <span>Spot price</span>
          <strong>{spot.data ? `${sgd(pricePerGram)}/g` : "…"}</strong>
        </div>
      </div>
      {spot.isError && <p className="err">Price unavailable — is the engine running?</p>}
      {spot.data?.stale && <p className="warn">⚠ price feed is stale</p>}
      <button className="btn ghost small" onClick={() => refetch()}>
        Refresh balance
      </button>
    </div>
  );
}
