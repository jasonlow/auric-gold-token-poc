// SIWE (Sign-In With Ethereum) — nonce → wallet-signed message → JWT session.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const TOKEN_KEY = "auric.jwt";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/** Build an EIP-4361-style sign-in message the engine can parse (line 2 = address, "Nonce:" line). */
function buildMessage(address: string, chainId: number, nonce: string): string {
  const domain = window.location.host;
  const uri = window.location.origin;
  const issuedAt = new Date().toISOString();
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    "",
    "Sign in to Auric (XAU.g). This request will not trigger a transaction or cost gas.",
    "",
    `URI: ${uri}`,
    "Version: 1",
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

/** Full sign-in: get nonce → sign → verify → store JWT. Returns the authenticated address. */
export async function signIn(
  address: string,
  chainId: number,
  signMessageAsync: (args: { message: string }) => Promise<string>
): Promise<string> {
  const nRes = await fetch(`${API_BASE}/api/v1/auth/nonce?address=${address}`);
  if (!nRes.ok) throw new Error("Could not get a sign-in nonce from the engine.");
  const { nonce } = await nRes.json();

  const message = buildMessage(address, chainId, nonce);
  const signature = await signMessageAsync({ message });

  const vRes = await fetch(`${API_BASE}/api/v1/auth/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, signature }),
  });
  if (!vRes.ok) {
    const e = await vRes.json().catch(() => ({}));
    throw new Error(e.error || "Sign-in verification failed.");
  }
  const { token, address: addr } = await vRes.json();
  setToken(token);
  return addr;
}

/** Confirm an existing session; returns the address or null (and clears a dead token). */
export async function fetchMe(): Promise<string | null> {
  const token = getToken();
  if (!token) return null;
  const r = await fetch(`${API_BASE}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) {
    clearToken();
    return null;
  }
  const { address } = await r.json();
  return address as string;
}
