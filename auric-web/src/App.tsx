import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectWallet } from "./components/ConnectWallet";
import { Portfolio } from "./components/Portfolio";
import { BuyGold } from "./components/BuyGold";
import { RedeemGold } from "./components/RedeemGold";
import { Transfer } from "./components/Transfer";
import { History } from "./components/History";
import { Admin } from "./components/Admin";
import "./App.css";

const TABS = ["Buy", "Redeem", "Send", "History"] as const;
type Tab = (typeof TABS)[number];

export default function App() {
  const { isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>("Buy");
  const [mode, setMode] = useState<"investor" | "admin">("investor");

  return (
    <div className="page">
      <header className="brand">
        <span className="logo">🟡</span>
        <div>
          <h1>Auric Gold</h1>
          <p className="sub">XAU.g — 1 token = 1 gram of gold</p>
        </div>
        <button className="modeBtn" onClick={() => setMode(mode === "investor" ? "admin" : "investor")}>
          {mode === "investor" ? "Admin →" : "← Investor"}
        </button>
      </header>

      {mode === "admin" ? (
        <main className="card">
          <Admin />
        </main>
      ) : (
      <main className="card">
        <h2>Investor Portal</h2>
        {!isConnected && <p className="muted">Connect your wallet to get started.</p>}
        <ConnectWallet />

        {isConnected && (
          <>
            <Portfolio />
            <nav className="tabs">
              {TABS.map((t) => (
                <button key={t} className={tab === t ? "tab active" : "tab"} onClick={() => setTab(t)}>
                  {t}
                </button>
              ))}
            </nav>
            {tab === "Buy" && <BuyGold />}
            {tab === "Redeem" && <RedeemGold />}
            {tab === "Send" && <Transfer />}
            {tab === "History" && <History />}
          </>
        )}
      </main>
      )}
    </div>
  );
}
