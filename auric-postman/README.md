# auric-postman

Postman collection + environment for the Auric Token Engine API.

## Import
In Postman → **Import** → select both files:
- `auric-token-engine.postman_collection.json` — the requests
- `auric-local.postman_environment.json` — the variables

Then pick **Auric — Local** in the environment dropdown (top-right).

## Prereqs
Start the backend first (from the repo root):
```bash
./run-local.sh        # everything, incl. the engine
# — or — run deps and start the engine from IntelliJ:
./run-deps.sh
```

## Environment variables
| Var | Default | Meaning |
|---|---|---|
| `baseUrl` | `http://localhost:8080` | Token Engine |
| `simUrl` | `http://localhost:9090` | vendor simulator |
| `wallet` | `0x3C44…4293BC` | recipient (Hardhat acct #2) |
| `wallet2` | `0x90F7…3b906` | second wallet (Hardhat acct #3) |
| `paymentRef` / `idempotencyKey` | `GOLD-1` / `m1` | mint params |

## Happy-path order (mint → redeem)
1. **Admin → Whitelist wallet** (registers `{{wallet}}` on-chain)
2. **Simulator → Credit payment** (marks `{{paymentRef}}` as received — the mint gate)
3. **Mint saga → Mint (10g)** → expect `state: CONFIRMED`
4. **Chain → Total supply / Balance** → 10g
5. **Redeem saga → Redeem (5g)** → escrow → sell → pay → burn → `COMPLETE`

## Failure scenarios (chaos)
- **F4 (payout fails):** Simulator → *Chaos: bank.payout fail* → then Redeem → expect `RETURN_ESCROW` (nothing burned). Reset with *Chaos: reset*.
- **F9 (stale price):** Simulator → *Chaos: FX stale* → then Pricing → *Quote* → expect HTTP 409.
- **F7 (breach):** Simulator → *Set vault balance* `deliveredGrams` below supply → Reconciliation → *Trigger* → `BREACH`, minting paused → *Resume minting* to clear.

> Tip: change `idempotencyKey` for each new mint/redeem (a repeated key is treated as idempotent and returns the original transaction).
