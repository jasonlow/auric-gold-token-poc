"use strict";
// SIM-02 — Vault mock (Brink's). Holds allocated gold; supports a DELIVERY LAG
// so "gold delivered to vault" is not instantaneous (drives the settlement window).
const express = require("express");
const { chaos } = require("./chaos");
const router = express.Router();

const state = { deliveredGrams: 500, lagMs: 0, seq: 0, allocations: [] };
const serial = (n) => `BAR-${String(n).padStart(6, "0")}`;

router.get("/balance", chaos("vault.balance"), (_req, res) => {
  const pendingGrams = state.allocations.filter((a) => a.status === "PENDING").reduce((s, a) => s + a.grams, 0);
  res.json({ grams: state.deliveredGrams, pendingGrams });
});

router.post("/allocate", chaos("vault.allocate"), (req, res) => {
  const grams = Number(req.body?.grams);
  if (!grams || grams <= 0) return res.status(400).json({ error: "grams (>0) required" });
  state.seq += 1;
  const alloc = {
    vaultRef: req.body?.vaultRef || `VG-${1000 + state.seq}`,
    grams,
    barSerial: serial(state.seq),
    certificateId: `CERT-${state.seq}`,
    status: state.lagMs > 0 ? "PENDING" : "DELIVERED",
    allocatedAt: new Date().toISOString(),
  };
  state.allocations.push(alloc);
  if (state.lagMs > 0) {
    setTimeout(() => {
      alloc.status = "DELIVERED";
      state.deliveredGrams += grams;
    }, state.lagMs);
  } else {
    state.deliveredGrams += grams;
  }
  res.status(201).json({
    vaultRef: alloc.vaultRef, grams, status: alloc.status,
    barSerial: alloc.barSerial, certificateId: alloc.certificateId,
  });
});

router.get("/certs", chaos("vault.certs"), (_req, res) => {
  res.json({
    certs: state.allocations.map((a) => ({
      vaultRef: a.vaultRef, grams: a.grams, barSerial: a.barSerial,
      certificateId: a.certificateId, status: a.status,
    })),
  });
});

// test-only setup (no chaos guard): set starting balance + delivery lag
router.post("/_config", (req, res) => {
  if (req.body?.deliveredGrams != null) state.deliveredGrams = Number(req.body.deliveredGrams);
  if (req.body?.lagMs != null) state.lagMs = Number(req.body.lagMs);
  res.json({ deliveredGrams: state.deliveredGrams, lagMs: state.lagMs });
});

module.exports = router;
