# Smart Contract — Setup Guide

How to set up, build, test, and deploy the **Auric** ERC-3643 gold-token contracts (`auric-smart-contract`). Target chain: **Polygon Amoy** testnet (chainId **80002**). Local development uses the built-in Hardhat node.

> Everything here is **testnet / test-key only**. Never use these keys, RPC URLs, or this setup for mainnet or real funds.

---

## 1. Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | ≥ 18 (20 or 22 recommended) | `node -v` |
| npm | ≥ 9 | `npm -v` |
| Git | any | `git --version` |
| MetaMask | browser extension | for using the dApp later |

---

## 2. Install

```bash
cd auric-smart-contract
npm install
```

This installs Hardhat + `@nomicfoundation/hardhat-toolbox` (ethers v6, chai, hardhat-verify, typechain). ~600 packages; a few npm audit warnings in dev tooling are normal and not shipped on-chain.

Verify the toolchain works **without any config** (uses the local in-memory chain):

```bash
npm run compile      # downloads solc 0.8.24, compiles
npm test             # runs the Sanity toolchain test → 1 passing
```

---

## 3. Project layout

```
auric-smart-contract/
├── contracts/            Solidity sources (Sanity.sol now; ERC-3643 suite in CONTRACT-01)
├── test/                 Hardhat tests (TypeScript)
├── scripts/
│   ├── new-wallet.ts     generate a fresh Amoy test keypair
│   ├── deploy-amoy.ts    deploy to Amoy (stub → CONTRACT-06)
│   └── set-price.ts      set mock XAU/USD price (stub → CONTRACT-04)
├── hardhat.config.ts     networks (hardhat/localhost/amoy), solc 0.8.24, verify
├── tsconfig.json
├── .env.example          template (copy to .env)
└── package.json
```

Build artefacts (`artifacts/`, `cache/`, `typechain-types/`) and `.env` are git-ignored.

---

## 4. Environment configuration

```bash
cp .env.example .env
```

Then fill `.env`:

| Variable | What | Required for |
|---|---|---|
| `AMOY_RPC_URL` | Amoy JSON-RPC endpoint | deploying / reading Amoy |
| `DEPLOYER_PRIVATE_KEY` | test key that deploys contracts (must hold faucet MATIC) | deploying |
| `MINTER_ADDRESS` | address set as the TrustedIssuer (the Token Engine minter) | deploying |
| `POLYGONSCAN_API_KEY` | explorer key for source verification | verifying (optional) |

Local-only work (`npm test`, `npx hardhat node`) needs **none** of these.

---

## 5. Get an Amoy RPC URL (recommended: Alchemy)

The public RPC `https://rpc-amoy.polygon.technology` works but is rate-limited. For reliability use Alchemy (free):

1. Sign up at **[alchemy.com](https://www.alchemy.com/)**.
2. **Create App** → Chain **Polygon**, Network **Polygon Amoy**.
3. Copy the **HTTPS** endpoint:
   ```
   https://polygon-amoy.g.alchemy.com/v2/<YOUR_API_KEY>
   ```
4. Put it in `.env` → `AMOY_RPC_URL=...`

> "What are you building?" during signup is just routing — pick **RWA / Tokenization** (or **Other**). It doesn't affect the free RPC.

---

## 6. Create test wallets

Generate two fresh keypairs — one **deployer**, one **minter**:

```bash
npm run new-wallet      # run twice; save each Address + PrivateKey
```

- **Deployer** → `DEPLOYER_PRIVATE_KEY` in `.env`. Deploys the contracts.
- **Minter** → set its address as `MINTER_ADDRESS`. This becomes the only address allowed to `mint`/`burn` (TrustedIssuer); the Token Engine (`auric-api`) holds its private key as `MINTER_PRIVATE_KEY`.

> ⚠ These are throwaway test keys. Do not reuse them anywhere real.

---

## 7. Fund the wallets

The **deployer** needs gas to deploy contracts. The **minter** needs gas only later, when it mints/burns — it is **not** required for deployment.

### 7a. Fund the deployer (faucet)

- **[faucet.polygon.technology](https://faucet.polygon.technology/)** → select **Amoy**, paste the deployer address.
  - ⚠ This faucet allows **one claim per 24 hours**.
- Alternative Amoy faucets (separate cooldowns): `alchemy.com/faucets/polygon-amoy` (needs a tiny mainnet ETH balance), `faucets.chain.link/polygon-amoy`, `faucet.quicknode.com/polygon/amoy`.

### 7b. Fund the minter — transfer from the deployer (recommended)

Rather than spend a second faucet claim (24h cooldown), send a little MATIC from the already-funded deployer to the minter:

```bash
npm run fund-minter            # sends 0.03 MATIC: deployer → minter
npm run fund-minter -- 0.02    # custom amount
```

Uses `DEPLOYER_PRIVATE_KEY` → `MINTER_ADDRESS` from `.env`, prints the tx hash, and reports both balances. Keep the amount small (0.02–0.03) so the deployer retains enough for deployment. Do this when you reach the minting phase; it isn't needed for contract deployment.

---

## 8. Get a verification API key (optional)

For publishing source on the explorer so `deploy-amoy` can auto-verify:

- **Recommended — Etherscan unified key:** [etherscan.io](https://etherscan.io/) → register → **API Keys** → Add. One key is multichain (covers Amoy).
- **Or PolygonScan:** [polygonscan.com](https://polygonscan.com/) → register → **API Keys** → Add.

Put it in `.env` → `POLYGONSCAN_API_KEY=...`. This feeds `etherscan.apiKey.polygonAmoy` in `hardhat.config.ts`.

---

## 9. Verify your setup

**One-command check (recommended)** — validates RPC, key/address formats, and balances (secrets masked):
```bash
npm run check-amoy
```

Or check manually:

**RPC reachable** (expects `0x13882` = 80002):
```bash
curl -s -X POST "$AMOY_RPC_URL" -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

**Wallet funded** (via Hardhat console on Amoy):
```bash
npx hardhat console --network amoy
> const [a] = await ethers.getSigners()
> (await ethers.provider.getBalance(a.address)).toString()   // > 0 means funded
```

---

## 10. Common commands

```bash
npm run compile                         # compile contracts
npm test                                # run all tests (local Hardhat chain)
npx hardhat test test/Sanity.test.ts    # run a single test file
npx hardhat node                        # start a local chain on :8545 (chainId 31337)
npm run deploy:amoy                     # deploy to Amoy (after CONTRACT-06)
npm run set-price                       # set mock XAU/USD (after CONTRACT-04)
npm run new-wallet                      # generate a test keypair
npm run check-amoy                      # validate .env: RPC, keys, balances (masked)
npm run fund-minter -- 0.02             # send MATIC: deployer → minter
```

---

## 11. Troubleshooting

| Symptom | Fix |
|---|---|
| `insufficient funds for gas` on deploy | Fund the **deployer** address from the Amoy faucet |
| `invalid sender` / no account on `--network amoy` | `DEPLOYER_PRIVATE_KEY` missing/empty in `.env` |
| RPC timeouts / 429 | Switch from the public RPC to an Alchemy URL |
| Verify fails | Check `POLYGONSCAN_API_KEY`; ensure the contract is deployed and the network is `amoy` |
| `PUSH0`-related deploy error | Already mitigated — config pins `evmVersion: "paris"` |
| Wrong chain in MetaMask | Add Polygon Amoy: chainId 80002, RPC `https://rpc-amoy.polygon.technology`, explorer `https://amoy.polygonscan.com` |

---

## 12. Next steps

Contracts are built task-by-task (see `../poc-task-list.md`):

- **CONTRACT-01** — integrate the ERC-3643 (T-REX) suite (GoldToken, IdentityRegistry, ComplianceModule, TrustedIssuers)
- **CONTRACT-02/03** — minter restriction + whitelist/compliance wiring
- **CONTRACT-04** — MockV3Aggregator + `set-price`
- **CONTRACT-05** — full test suite
- **CONTRACT-06** — `deploy-amoy` + verify
- **CONTRACT-07** — export ABIs + addresses for `auric-api` and `auric-web`

Fund-safety rules these contracts must honour are enforced centrally in `GoldToken._update` (whitelist/compliance/freeze/pause) and mirrored by the Token Engine's mint/redeem sagas.
