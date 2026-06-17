"use strict";
// SIM-04 — KYC mock (Sumsub). Create applicant, poll status, and deliver a signed
// webhook on resolution. Webhook can be re-sent (replay) so the engine's
// idempotency can be tested (F8).
const express = require("express");
const crypto = require("crypto");
const { chaos } = require("./chaos");
const router = express.Router();

const SECRET = process.env.KYC_WEBHOOK_SECRET || "sim-kyc-secret";
const CALLBACK = process.env.KYC_WEBHOOK_URL || ""; // engine webhook endpoint (wired later)
const applicants = new Map();
let seq = 0;

const sign = (body) => crypto.createHmac("sha256", SECRET).update(body).digest("hex");

async function fireWebhook(a) {
  if (!CALLBACK) return { delivered: false, reason: "no KYC_WEBHOOK_URL configured" };
  const payload = JSON.stringify({
    type: "applicantReviewed",
    applicantId: a.applicantId,
    externalUserId: a.externalUserId,
    status: a.status,
  });
  try {
    const r = await fetch(CALLBACK, {
      method: "POST",
      headers: { "content-type": "application/json", "x-sim-signature": sign(payload) },
      body: payload,
    });
    return { delivered: true, httpStatus: r.status };
  } catch (e) {
    return { delivered: false, reason: e.message };
  }
}

router.post("/applicant", chaos("kyc.applicant"), (req, res) => {
  seq += 1;
  const a = { applicantId: `APP-${seq}`, externalUserId: req.body?.externalUserId ?? null, status: "PENDING" };
  applicants.set(a.applicantId, a);
  res.status(201).json({ applicantId: a.applicantId, status: a.status });
});

router.get("/status/:id", chaos("kyc.status"), (req, res) => {
  const a = applicants.get(req.params.id);
  if (!a) return res.status(404).json({ error: "not found" });
  res.json({ applicantId: a.applicantId, status: a.status });
});

// test-only: resolve (VERIFIED/REJECTED) and fire the webhook
router.post("/_resolve/:id", async (req, res) => {
  const a = applicants.get(req.params.id);
  if (!a) return res.status(404).json({ error: "not found" });
  a.status = req.body?.status || "VERIFIED";
  res.json({ applicantId: a.applicantId, status: a.status, webhook: await fireWebhook(a) });
});

// test-only: replay the same webhook (engine must dedupe — F8)
router.post("/_webhook-resend/:id", async (req, res) => {
  const a = applicants.get(req.params.id);
  if (!a) return res.status(404).json({ error: "not found" });
  res.json({ resent: true, webhook: await fireWebhook(a) });
});

module.exports = router;
