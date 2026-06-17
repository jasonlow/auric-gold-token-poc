# auric-vendor-simulator

Mock external vendors for the POC — **vault, bullion dealer, KYC, bank, FX** — behind one lightweight Node/Express service, plus a **chaos / failure-injection** API so failure scenarios (F1–F10) are deterministic.

Only the blockchain is a real external system; everything here is simulated. Swapping to real vendors is a config flip in the engine (`mock → real`), not a code change.

## Run
```bash
npm install
npm start            # listens on :9090 (SIM_PORT)
```
Health: `GET /health`.

## Chaos control API
Drive any guarded route's behaviour at runtime:
```bash
# Make the bank payout fail once
curl -X POST localhost:9090/admin/inject -H 'content-type: application/json' \
  -d '{"target":"bank.payout","mode":"fail","params":{"httpStatus":503,"count":1}}'

curl localhost:9090/admin/state     # view active chaos
curl -X POST localhost:9090/admin/reset
```
Modes: `ok` (clear) · `fail` (httpStatus) · `latency` (delayMs then proceed) · `timeout` (delayMs then 504) · `stuck` (never responds). `params.count` = apply N times then auto-clear.

## Endpoints
| Mount | Task | Status |
|---|---|---|
| `/health`, `/admin/*`, `/demo/ping` | SIM-01 | ✅ |
| `/vault/*` | SIM-02 | todo |
| `/dealer/*` | SIM-03 | todo |
| `/kyc/*` | SIM-04 | todo |
| `/bank/*` | SIM-05 | todo |
| `/fx/*` | SIM-06 | todo |

Each vendor route guards itself with `chaos("<target>")`, so `/admin/inject` controls it.
