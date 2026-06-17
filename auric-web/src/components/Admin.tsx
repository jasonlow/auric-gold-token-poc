import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAudit,
  fetchReconStatus,
  fetchRecentTxns,
  resumeMinting,
  triggerRecon,
  type AdminTxn,
  type AuditRow,
} from "../lib/api";

const short = (a?: string | null) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");
const when = (s?: string | null) => (s ? new Date(s).toLocaleString("en-SG") : "");
const g = (n?: number | null) => (n == null ? "—" : `${Number(n).toFixed(2)} g`);

export function Admin() {
  const qc = useQueryClient();
  const recon = useQuery({ queryKey: ["recon"], queryFn: fetchReconStatus, refetchInterval: 10_000 });
  const txns = useQuery({ queryKey: ["recent-txns"], queryFn: fetchRecentTxns, refetchInterval: 10_000 });
  const audit = useQuery({ queryKey: ["audit"], queryFn: fetchAudit, refetchInterval: 10_000 });

  const r = recon.data?.latest;
  const paused = recon.data?.mintingPaused;
  const status = r?.status ?? "—";

  const run = async () => {
    await triggerRecon();
    qc.invalidateQueries({ queryKey: ["recon"] });
  };
  const resume = async () => {
    await resumeMinting();
    qc.invalidateQueries({ queryKey: ["recon"] });
  };

  return (
    <div className="admin">
      <h2>Admin Dashboard</h2>

      <section>
        <h3>Reconciliation</h3>
        <div className="stats">
          <div className="stat"><span>On-chain supply</span><strong>{g(r?.onchainSupplyGrams)}</strong></div>
          <div className="stat"><span>Vault grams</span><strong>{g(r?.vaultGrams)}</strong></div>
          <div className="stat">
            <span>Net delta</span>
            <strong className={r?.breach ? "bad" : ""}>{g(r?.netDeltaGrams)}</strong>
          </div>
        </div>
        <p>
          Status: <strong className={status === "BREACH" ? "bad" : status === "OK" ? "good" : "warnc"}>{status}</strong>
          {" · "}Minting: <strong className={paused ? "bad" : "good"}>{paused ? "PAUSED" : "active"}</strong>
          {recon.data?.pauseReason && <span className="err small"> — {recon.data.pauseReason}</span>}
        </p>
        <button className="btn small" onClick={run}>Run reconciliation</button>
        {paused && <button className="btn small ghost" onClick={resume}>Resume minting</button>}
      </section>

      <section>
        <h3>Recent transactions</h3>
        {(txns.data ?? []).length === 0 && <p className="muted">None yet.</p>}
        {(txns.data ?? []).map((t: AdminTxn) => (
          <div key={t.id} className="txn admintxn">
            <span>#{t.id} {t.type}</span>
            <span>{short(t.counterparty)}</span>
            <span>{g(t.grams)}</span>
            <span className="state">{t.state}</span>
            <span className="muted small">{when(t.createdAt)}</span>
          </div>
        ))}
      </section>

      <section>
        <h3>Audit log</h3>
        {(audit.data ?? []).map((a: AuditRow) => (
          <div key={a.id} className="auditrow">
            <span className="tag">{a.action}</span>
            <span>{short(a.target)}</span>
            <span className="muted small">{when(a.createdAt)}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
