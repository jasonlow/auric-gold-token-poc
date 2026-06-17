#!/usr/bin/env bash
# Starts the engine's DEPENDENCIES only (Postgres + vendor simulator + Hardhat
# node, deployed) so you can run the Token Engine from your IDE (IntelliJ ▶).
# Stop with ./stop-local.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
export DB_PORT="${DB_PORT:-5433}"   # host 5432 is taken on this machine

echo "[1/3] Postgres (host :$DB_PORT) ..."
docker compose -f "$ROOT/docker-compose.yml" up -d postgres
for i in $(seq 1 30); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' auric-postgres 2>/dev/null)" = "healthy" ] && break; sleep 2
done

echo "[2/3] Vendor simulator (:9090) ..."
( cd "$ROOT/auric-api/vendor-simulator" && { [ -d node_modules ] || npm install --silent; } \
  && node src/server.js >/tmp/auric-sim.log 2>&1 & )
sleep 2

echo "[3/3] Hardhat node (:8545) + deploy ..."
( cd "$ROOT/auric-smart-contract" && npx hardhat node >/tmp/auric-hh.log 2>&1 & )
sleep 6
( cd "$ROOT/auric-smart-contract" && npm run deploy:local >/tmp/auric-deploy.log 2>&1 ) && echo "      contracts deployed"

cat <<EOF

✅ Dependencies up. Now run TokenEngineApplication in IntelliJ (green ▶).
   Profiles default to local,mock; DB on :$DB_PORT — no env vars needed.
   Stop deps later with: ./stop-local.sh
EOF
