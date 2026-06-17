"use strict";

/**
 * Chaos store + control API + guard middleware.
 *
 * Targets are dotted strings, e.g. "vault.balance", "bank.payout". Each vendor
 * route guards itself with `chaos("<target>")`. Tests drive behaviour at runtime
 * via POST /admin/inject (SIM-07), enabling deterministic failure scenarios.
 */
const express = require("express");

const VALID_MODES = ["ok", "fail", "timeout", "latency", "stuck"];

/** target -> { mode, params } */
const store = new Map();

function setChaos(target, mode, params = {}) {
  if (!VALID_MODES.includes(mode)) {
    throw new Error(`invalid mode "${mode}" (valid: ${VALID_MODES.join(", ")})`);
  }
  if (mode === "ok") {
    store.delete(target); // "ok" clears any injected behaviour
    return;
  }
  store.set(target, { mode, params: { ...params } });
}

function getState() {
  return Object.fromEntries(store);
}

function reset() {
  store.clear();
}

/**
 * Express middleware: if chaos is set for `target`, apply it; else pass through.
 * Supports a one-shot `params.count` (apply N times, then auto-clear).
 */
function chaos(target) {
  return (req, res, next) => {
    const cfg = store.get(target);
    if (!cfg) return next();

    if (typeof cfg.params.count === "number") {
      if (cfg.params.count <= 0) {
        store.delete(target);
        return next();
      }
      cfg.params.count -= 1;
      if (cfg.params.count <= 0) store.delete(target);
    }

    const status = cfg.params.httpStatus ?? 503;
    const delayMs = cfg.params.delayMs ?? (cfg.mode === "timeout" ? 30000 : 2000);

    switch (cfg.mode) {
      case "fail":
        return res.status(status).json({ error: "injected failure", target, mode: "fail" });
      case "latency":
        return setTimeout(next, delayMs);
      case "timeout":
        return setTimeout(() => res.status(504).json({ error: "injected timeout", target }), delayMs);
      case "stuck":
        return; // never responds — simulates a hung dependency
      default:
        return next();
    }
  };
}

const router = express.Router();

router.post("/inject", (req, res) => {
  const { target, mode, params } = req.body || {};
  if (!target || !mode) {
    return res.status(400).json({ error: "target and mode are required" });
  }
  try {
    setChaos(target, mode, params || {});
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  res.json({ ok: true, target, mode, params: params || {} });
});

router.get("/state", (_req, res) => res.json({ chaos: getState() }));

router.post("/reset", (_req, res) => {
  reset();
  res.json({ ok: true });
});

module.exports = { chaos, setChaos, getState, reset, chaosRouter: router };
