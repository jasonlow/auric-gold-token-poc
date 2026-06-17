import { useEffect, useState } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useSignMessage, useSwitchChain } from "wagmi";
import { polygonAmoy, hardhat } from "wagmi/chains";
import { TARGET_CHAIN_ID } from "../wagmi";
import { signIn, fetchMe, clearToken } from "../lib/auth";

const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

const chainName = (id: number) =>
  id === polygonAmoy.id ? "Polygon Amoy" : id === hardhat.id ? "Hardhat (local)" : `chain ${id}`;

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();

  const [authAddr, setAuthAddr] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [authErr, setAuthErr] = useState<string | null>(null);

  // Restore any existing session on load.
  useEffect(() => {
    fetchMe().then(setAuthAddr);
  }, []);

  const signedIn = !!authAddr && !!address && authAddr.toLowerCase() === address.toLowerCase();

  async function doSignIn() {
    if (!address) return;
    setSigningIn(true);
    setAuthErr(null);
    try {
      const a = await signIn(address, chainId, signMessageAsync);
      setAuthAddr(a);
    } catch (e: any) {
      setAuthErr(e?.message || "Sign-in failed.");
    } finally {
      setSigningIn(false);
    }
  }

  function doSignOut() {
    clearToken();
    setAuthAddr(null);
  }

  if (!isConnected) {
    // Dedupe by name; hide the bare generic "Injected" once named wallets exist.
    const seen = new Set<string>();
    let wallets = connectors.filter((c) => (seen.has(c.name) ? false : (seen.add(c.name), true)));
    if (wallets.length > 1) wallets = wallets.filter((c) => c.name !== "Injected");

    return (
      <div className="wallet-picker">
        <p className="muted small">Connect a wallet:</p>
        <div className="wallet-list">
          {wallets.map((c) => (
            <button key={c.uid} className="walletbtn" disabled={isPending} onClick={() => connect({ connector: c })}>
              {c.icon && <img src={c.icon} alt="" width={20} height={20} />}
              <span>{c.name}</span>
            </button>
          ))}
        </div>
        {wallets.length === 0 && (
          <p className="muted small">
            No wallet detected — install{" "}
            <a href="https://metamask.io" target="_blank" rel="noreferrer">
              MetaMask
            </a>
            .
          </p>
        )}
        {error && <p className="err small">{error.message}</p>}
      </div>
    );
  }

  const onTarget = chainId === TARGET_CHAIN_ID;

  return (
    <div className="wallet">
      <div className="row">
        <span className="dot ok" /> Connected <code>{short(address)}</code>
      </div>
      <div className="row">
        Network: <strong>{chainName(chainId)}</strong>
        {!onTarget && (
          <button className="btn small" onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })}>
            Switch to {chainName(TARGET_CHAIN_ID)}
          </button>
        )}
      </div>
      <div className="row">
        {signedIn ? (
          <>
            <span className="dot ok" /> Signed in <span className="muted small">(SIWE)</span>
            <button className="btn small ghost" onClick={doSignOut}>
              Sign out
            </button>
          </>
        ) : (
          <button className="btn small" disabled={signingIn} onClick={doSignIn}>
            {signingIn ? "Check wallet…" : "🔐 Sign in"}
          </button>
        )}
      </div>
      {authErr && <p className="err small">{authErr}</p>}
      <button
        className="btn ghost"
        onClick={() => {
          doSignOut();
          disconnect();
        }}
      >
        Disconnect
      </button>
    </div>
  );
}
