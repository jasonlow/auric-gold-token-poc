import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { fetchTransactions, sgd, type Txn } from "../lib/api";

const icon = (t: string) => (t === "MINT" ? "🟢" : t === "BURN" ? "🔴" : "🔵");
const when = (s: string | null) => (s ? new Date(s).toLocaleString("en-SG") : "");

export function History() {
  const { address } = useAccount();
  const q = useQuery({
    queryKey: ["txns", address],
    queryFn: () => fetchTransactions(address!),
    enabled: !!address,
    refetchInterval: 15_000,
  });

  if (q.isLoading) return <div className="panel"><h3>History</h3><p className="muted">Loading…</p></div>;
  if (q.isError) return <div className="panel"><h3>History</h3><p className="err">Could not load (is the engine running?)</p></div>;

  const txns = q.data ?? [];
  return (
    <div className="panel">
      <h3>History</h3>
      {txns.length === 0 && <p className="muted">No transactions yet.</p>}
      {txns.map((t: Txn) => (
        <div key={t.id} className="txn">
          <span>{icon(t.type)} {t.type}</span>
          <span>{t.grams != null ? `${t.grams} g` : "—"}</span>
          <span>{t.fiatAmountSgd != null ? sgd(t.fiatAmountSgd) : "—"}</span>
          <span className="state">{t.state}</span>
          <span className="muted small">{when(t.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}
