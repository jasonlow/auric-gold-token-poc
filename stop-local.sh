#!/usr/bin/env bash
# Tears down the local Auric backend started by ./run-local.sh
ROOT="$(cd "$(dirname "$0")" && pwd)"
pkill -f token-engine-0.1.0 2>/dev/null || true
pkill -f "src/server.js" 2>/dev/null || true
pkill -f "hardhat node" 2>/dev/null || true
docker compose -f "$ROOT/docker-compose.yml" stop postgres 2>/dev/null || true
echo "stopped: token-engine, vendor-simulator, hardhat node, postgres"
