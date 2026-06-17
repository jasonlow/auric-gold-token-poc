"use strict";
// SIM-06 — FX mock (USD/SGD). Settable rate + staleness flag so the engine's
// quote pipeline (XAU/USD per oz -> per gram -> SGD) and stale-price handling
// (F9) can be exercised.
const express = require("express");
const { chaos } = require("./chaos");
const router = express.Router();

// Long freshness window so the rate doesn't spuriously go stale during a demo;
// staleness for the F9 test is driven explicitly via `forceStale`.
const state = { rate: 1.35, updatedAt: Date.now(), forceStale: false, staleMs: 86_400_000 };

router.get("/usdsgd", chaos("fx.usdsgd"), (_req, res) => {
  const ageMs = Date.now() - state.updatedAt;
  const stale = state.forceStale || ageMs > state.staleMs;
  res.json({ pair: "USD/SGD", rate: state.rate, updatedAt: new Date(state.updatedAt).toISOString(), ageMs, stale });
});

router.post("/_set", (req, res) => {
  if (req.body?.rate != null) {
    state.rate = Number(req.body.rate);
    state.updatedAt = Date.now();
  }
  if (req.body?.forceStale != null) state.forceStale = Boolean(req.body.forceStale);
  if (req.body?.staleMs != null) state.staleMs = Number(req.body.staleMs);
  res.json({ rate: state.rate, forceStale: state.forceStale, staleMs: state.staleMs });
});

module.exports = router;
