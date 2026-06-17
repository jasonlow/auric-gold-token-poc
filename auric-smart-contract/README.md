# auric-smart-contract

ERC-3643 (T-REX) permissioned token suite for **XAU.g** + a Chainlink price-feed mock, on Polygon Amoy.

> 📖 **New here? Start with [`smart-contract-setup-guide.md`](./smart-contract-setup-guide.md)** — install, RPC/faucet/key setup, wallets, build, test, deploy.

## Stack
Solidity 0.8.x · Hardhat (TypeScript) · ethers · Chainlink contracts (MockV3Aggregator)

## Contracts
| Contract | Role |
|---|---|
| `GoldToken` | ERC-3643 token; 18 decimals, 1 token = 1 gram; mint/burn restricted to TrustedIssuers |
| `IdentityRegistry` | Maps whitelisted wallets → KYC identity hash |
| `ComplianceModule` | Per-transfer rules (whitelist, jurisdiction, limits) |
| `TrustedIssuers` | Authorised issuer (the Token Engine minter) |
| `MockV3Aggregator` | Simulated Chainlink XAU/USD feed; price settable for tests |

### Design note — ERC-3643-style, not full T-REX
The POC implements a **faithful ERC-3643-style** suite (identity-gated transfers, modular compliance, issuer-restricted mint/burn, freeze, forced transfer) rather than vendoring Tokeny's full **T-REX** (ONCHAINID, claim issuers, factory + proxies). Rationale: T-REX is heavy and costly to deploy for a pilot, and the POC's goal is to prove the *mechanism*. The contract surface matches the SAD's four-contract model and the enforcement happens in `GoldToken._update` (OZ v5 routes mint/burn/transfer through it). Note `TrustedIssuers` here is Auric's **authorised-minter registry** (per BR-11 / glossary), not T-REX's claim-issuer registry. Migrating to full T-REX remains open if a future audit / MAS engagement requires strict standard certification.

## Planned structure
```
contracts/   GoldToken.sol, IdentityRegistry.sol, ComplianceModule.sol, TrustedIssuers.sol
test/        Hardhat tests (permissioning, transfer-revert, freeze, force-transfer, burn)
scripts/     deploy-amoy.ts, set-price.ts
hardhat.config.ts   networks: localhost, amoy (chainId 80002)
```

## Commands (after `CONTRACT-00` scaffold)
```bash
npm install
npx hardhat compile
npx hardhat test                          # all tests
npx hardhat test test/GoldToken.test.ts   # single file
npx hardhat node                          # local dev chain
npx hardhat run scripts/deploy-amoy.ts --network amoy   # deploy + verify
```

## Key rules
- Only the **TrustedIssuers** (Token Engine minter) may `mint`/`burn`. Transfers to non-whitelisted wallets must revert.
- Deployed addresses + ABIs are exported for `auric-api` and `auric-web` to consume — never hardcode addresses.
- Amoy only (chainId **80002**); Mumbai is deprecated.

See `poc-task-list.md` → tasks `CONTRACT-00` … `CONTRACT-07`.
