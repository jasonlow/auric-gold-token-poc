"use strict";
// SIM-03 — Bullion dealer mock. Buys gold (mint) / sells gold (redeem), with a
// bid/ask spread and a max transactable size ("cannot transact size" → drives
// the redemption PENDING_LIQUIDATION path).
const express = require("express");
const { chaos } = require("./chaos");
const router = express.Router();

const cfg = { basePriceSgdPerGram: 125, spreadBps: 50, maxGrams: 1000, seq: 0 };

function price(side) {
  const spread = cfg.basePriceSgdPerGram * (cfg.spreadBps / 10000);
  return side === "buy" ? cfg.basePriceSgdPerGram + spread : cfg.basePriceSgdPerGram - spread;
}

router.get("/quote", chaos("dealer.quote"), (req, res) => {
  const grams = Number(req.query.grams || 0);
  const side = req.query.side === "sell" ? "sell" : "buy";
  const p = price(side);
  res.json({ grams, side, pricePerGramSgd: +p.toFixed(4), spreadBps: cfg.spreadBps, totalSgd: +(p * grams).toFixed(2) });
});

function fill(side, req, res) {
  const grams = Number(req.body?.grams);
  if (!grams || grams <= 0) return res.status(400).json({ error: "grams (>0) required" });
  if (grams > cfg.maxGrams) return res.status(422).json({ error: "cannot transact size", maxGrams: cfg.maxGrams });
  cfg.seq += 1;
  const p = price(side);
  const out = { ref: `${side.toUpperCase()}-${cfg.seq}`, grams, status: "FILLED", pricePerGramSgd: +p.toFixed(4) };
  if (side === "buy") out.costSgd = +(p * grams).toFixed(2);
  else out.proceedsSgd = +(p * grams).toFixed(2);
  res.status(201).json(out);
}

router.post("/buy", chaos("dealer.buy"), (req, res) => fill("buy", req, res));
router.post("/sell", chaos("dealer.sell"), (req, res) => fill("sell", req, res));

router.post("/_config", (req, res) => {
  ["basePriceSgdPerGram", "spreadBps", "maxGrams"].forEach((k) => {
    if (req.body?.[k] != null) cfg[k] = Number(req.body[k]);
  });
  res.json(cfg);
});

module.exports = router;
