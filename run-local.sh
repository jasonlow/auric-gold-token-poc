#!/usr/bin/env bash
# Brings up the full local Auric backend: Postgres + vendor simulator +
# Hardhat node (deployed) + Token Engine. Stop with ./stop-local.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
export JAVA_HOME="${JAVA_HOME:-/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home}"
export DB_PORT="${DB_PORT:-5433}"   # host 5432 is often taken; override if free

echo "[1/5] Postgres (host :$DB_PORT) ..."
docker compose -f "$ROOT/docker-compose.yml" up -d postgres
for i in $(seq 1 30); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' auric-postgres 2>/dev/null)" = "healthy" ] && break; sleep 2
done

echo "[2/5] Vendor simulator (:9090) ..."
( cd "$ROOT/auric-api/vendor-simulator" && { [ -d node_modules ] || npm install --silent; } \
  && node src/server.js >/tmp/auric-sim.log 2>&1 & )
sleep 2

echo "[3/5] Hardhat node (:8545) + deploy ..."
( cd "$ROOT/auric-smart-contract" && npx hardhat node >/tmp/auric-hh.log 2>&1 & )
sleep 6
( cd "$ROOT/auric-smart-contract" && npm run deploy:local >/tmp/auric-deploy.log 2>&1 ) && echo "      contracts deployed"

echo "[4/5] Build engine ..."
( cd "$ROOT/auric-api" && ./mvnw -q -DskipTests package )

echo "[5/5] Token engine (:8080) ..."
( cd "$ROOT/auric-api" \
  && DB_PORT="$DB_PORT" SPRING_PROFILES_ACTIVE=local,mock ALERT_WEBHOOK_URL=http://localhost:9090/admin/alert \
     java -jar target/token-engine-0.1.0-SNAPSHOT.jar >/tmp/auric-engine.log 2>&1 & )
for i in $(seq 1 40); do
  curl -s localhost:8080/actuator/health 2>/dev/null | grep -q '"status":"UP"' && break; sleep 1.5
done

cat <<EOF

✅ Backend up. Try:
  curl localhost:8080/actuator/health
  curl localhost:8080/api/v1/chain/info
  curl 'localhost:8080/api/v1/price/quote?grams=10&side=MINT'
  curl localhost:8080/api/v1/vendors/probe
  curl localhost:9090/health           # simulator

Logs:  /tmp/auric-engine.log  /tmp/auric-sim.log  /tmp/auric-hh.log
Stop:  ./stop-local.sh
EOF
