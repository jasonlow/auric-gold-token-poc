"use strict";
// SIM-05 — Bank mock (SGD rails). Confirms the investor's payment arrived (mint
// gate) and pays out SGD on redemption. Payout failure/delay is driven by chaos
// (target "bank.payout") — this is how F4 (payout fails after escrow) is tested.
const express = require("express");
const { chaos } = require("./chaos");
const router = express.Router();

const payments = new Map();
const payouts = new Map();
let seq = 0;

// test-only: simulate the investor's money landing (withhold to test F2)
router.post("/_credit", (req, res) => {
  const { reference, amountSgd } = req.body || {};
  if (!reference) return res.status(400).json({ error: "reference required" });
  payments.set(reference, { reference, amountSgd: Number(amountSgd || 0), status: "RECEIVED", at: new Date().toISOString() });
  res.json({ reference, status: "RECEIVED" });
});

router.get("/payment-status/:reference", chaos("bank.paymentStatus"), (req, res) => {
  const p = payments.get(req.params.reference);
  res.json({ reference: req.params.reference, status: p ? p.status : "NONE", amountSgd: p ? p.amountSgd : 0 });
});

router.post("/payout", chaos("bank.payout"), (req, res) => {
  const { account, amountSgd, reference } = req.body || {};
  if (!account || !amountSgd) return res.status(400).json({ error: "account and amountSgd required" });
  seq += 1;
  const payout = { payoutId: `PO-${seq}`, account, amountSgd: Number(amountSgd), reference: reference ?? null, status: "COMPLETED", at: new Date().toISOString() };
  payouts.set(payout.payoutId, payout);
  res.status(201).json({ payoutId: payout.payoutId, status: payout.status, amountSgd: payout.amountSgd });
});

router.get("/payout-status/:id", (req, res) => {
  const p = payouts.get(req.params.id);
  if (!p) return res.status(404).json({ error: "not found" });
  res.json(p);
});

module.exports = router;
