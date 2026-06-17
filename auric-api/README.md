# auric-api

The **Token Engine**: REST API that orchestrates the gold-token lifecycle, plus the **vendor simulator** used for the POC.

## Stack
Spring Boot 3.3 / Java 21 · Web3j · PostgreSQL 15 + Flyway · Maven · runs with profiles `local,mock`

## What it does
- **Mint / burn orchestration** as sagas (the chain call is *outside* any DB transaction; idempotent).
- **Reconciliation** of on-chain supply vs vault grams, net of in-flight settlement.
- **Adapters** to external vendors behind interfaces (`VaultProvider`, `DealerProvider`, `KycProvider`, `OracleProvider`, `BankProvider`) — `mock` implementations for the POC, real later.
- **Audit log** + off-chain ledger in PostgreSQL.

## Planned structure
```
src/main/java/com/auric/tokenengine/   controllers, services (MintService, BurnService, ReconciliationService …),
                                       blockchain/ (Web3j), integration/ (adapters), model/, repository/, scheduler/
src/main/resources/                    application.yml, application-local.yml, db/migration/ (Flyway)
vendor-simulator/                      standalone mock vault/dealer/kyc/bank/fx + chaos /admin/inject API
```

## Commands
```bash
./mvnw clean package
./mvnw spring-boot:run -Dspring-boot.run.profiles=local,mock   # run locally
./mvnw test                                                    # all tests
./mvnw test -Dtest=MintServiceTest#methodName                  # single test
```

### Local Postgres
The app needs Postgres. From the repo root: `docker compose up -d postgres`.

> **Port note:** if host `5432` is already in use (e.g. another project's Postgres),
> run Auric's on `5433`: `DB_PORT=5433 docker compose up -d postgres` and start the
> app with `DB_PORT=5433` (e.g. `DB_PORT=5433 SPRING_PROFILES_ACTIVE=local,mock java -jar target/token-engine-*.jar`).

Verify: `curl localhost:8080/actuator/health` → `UP`, and `curl localhost:8080/api/v1/meta`.

## Non-negotiable rules
- **Never** wrap a blockchain `send()` in `@Transactional`. Use saga state machines + idempotency keys.
- **Mint only after** confirmed payment and atomic vault-headroom reservation (no fractional reserve).
- **Redemption is escrow-then-burn**: lock → sell → settle SGD → burn. Never burn before payout.
- **Reconciliation** breach = under-collateralisation only (`supply > vault + tolerance`, net of pending); in-flight ops must not false-alarm.
- Minting is exclusive to the engine/TrustedIssuers — never reachable by investor roles.

See `poc-task-list.md` → tasks `ENGINE-01` … `ENGINE-11`, `SIM-01` … `SIM-07`.
