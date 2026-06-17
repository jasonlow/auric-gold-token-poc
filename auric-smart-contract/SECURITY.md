# Smart Contract Security — Posture & Pre-Mainnet Requirements

> **Status: POC / testnet only.** These contracts are **not** production-secure and
> must not hold real gold or value until the Pre-Mainnet Checklist below is met.
> Most real-world losses in this space are **key/access compromises**, not exotic
> contract bugs — so key custody and operations matter as much as the code.

## Current posture (POC)

| Area | State |
|---|---|
| Base library | OpenZeppelin Contracts v5 (audited primitives) |
| Access control | Mint/burn issuer-only (`TrustedIssuers`); transfers whitelist + compliance gated; `Ownable` + `AgentRole` |
| Reentrancy | `ReentrancyGuard` on `mint`/`burn`/`transfer`/`transferFrom`/`forcedTransfer` |
| Immutability | `trustedIssuers`, `compliance.identityRegistry` immutable; no `delegatecall`/assembly/proxy |
| Circuit breakers | `pause`, address + partial freeze, forced-transfer recovery |
| Tests | 44 passing (permissioning, freeze, forced transfer, pause, compliance, expiry, roles) |
| Static analysis | **Slither** — `npm run slither` |

### Static analysis (Slither)
- Latest run: **1 result** — `timestamp` in `IdentityRegistry.isVerified` (KYC expiry).
  **Accepted by design**: expiry legitimately uses `block.timestamp`; seconds-level
  miner drift is immaterial to a KYC validity window.
- Previous findings (reentrancy hints, missing zero-check, non-immutable vars) were
  remediated (reentrancy guards, `bindToken` zero-check, immutable state).
- Re-run any time: `npm run slither` (requires the Slither venv — see below).

```bash
# one-time Slither setup
python3 -m venv .venv-slither && ./.venv-slither/bin/pip install slither-analyzer
npm run slither
```

## Key-management reality (the #1 risk)
- **Minter key** = the crown jewel: whoever holds it can mint unbacked tokens.
  In the POC it is a single hot key in `.env`. **Unacceptable for mainnet.**
- **Owner key** controls compliance rules, issuer set, and module pointers.
- See BRS Risk Register **R-05 / R-06** and SAD **§17 C10 / NFR-SEC-11**.

## Pre-Mainnet Checklist (all required before real value)

- [ ] **Independent external audit** of all contracts; all critical/high resolved
- [ ] **Penetration test** of the full system (contracts + engine + infra)
- [ ] **Minter & owner behind Gnosis Safe 2/3 multisig**; no hot key for mint authority
- [ ] **Hardware wallet / HSM / institutional custody** for signing keys
- [ ] **Timelock** on owner/upgrade actions (public delay)
- [ ] **Per-tx + daily mint caps** to bound blast radius of a key compromise
- [ ] **Real-time monitoring/alerting** on mint/burn/large transfers + reconciliation auto-pause
- [ ] **Incident-response runbook**, key-rotation plan, and a **bug bounty**

Static analysis (Slither) is a baseline, **not** a substitute for an independent audit.
