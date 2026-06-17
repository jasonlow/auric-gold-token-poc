# auric-web

Investor portal + admin dashboard for Auric.

## Stack
React 18 + TypeScript · Vite · wagmi/viem (MetaMask) · TanStack Query · Tailwind + shadcn/ui

## Two apps
- **Investor portal** — connect MetaMask, onboard (KYC), buy/mint, view balance/NAV, transfer, redeem, history.
- **Admin dashboard** — supply vs vault + delta, reconciliation status, pending actions, users, audit log.

## Wallet behaviour (MetaMask, Amoy)
- Connect → prompt **switch/add Polygon Amoy** (chainId 80002) if on the wrong network.
- **Sign-in by signature** (SIWE-style nonce → JWT). No passwords.
- Read balance/NAV **directly from the Amoy contract** via viem.
- **User signs P2P transfers** (and pays Amoy test MATIC gas); mint/redeem-burn are signed by the engine, not the user.
- Link every tx to **Amoy PolygonScan**.

## Planned structure
```
src/
  pages/        LoginPage, OnboardPage, DashboardPage, MintPage, RedeemPage, TransferPage, HistoryPage  (+ admin pages)
  components/    wallet/, portfolio/, transactions/, layout/, ui/ (shadcn)
  hooks/         useAuth, useToken, useOracle, useTransactions
  lib/           api.ts (axios), contract.ts (viem read), wagmi config (Amoy)
```

## Commands (after `WALLET-01` scaffold)
```bash
npm install
npm run dev
npm run build
npm test
```

See `poc-task-list.md` → tasks `WALLET-01` … `WALLET-05`, `PORTAL-01` … `PORTAL-02`. UX reference: `ux-requirements.md`.
