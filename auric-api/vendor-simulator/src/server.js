"use strict";

const express = require("express");
const { chaos, chaosRouter, getState } = require("./chaos");

const app = express();
app.use(express.json());

// Permissive CORS (dev tool) so the local web portal can drive simulated steps.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "content-type");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "auric-vendor-simulator", activeChaos: Object.keys(getState()).length })
);

// Chaos control API (inject / state / reset).
app.use("/admin", chaosRouter);

// Alert sink (receives engine alerts so tests can assert delivery).
const receivedAlerts = [];
app.post("/admin/alert", (req, res) => {
  receivedAlerts.push({ at: Date.now(), body: req.body });
  res.json({ ok: true });
});
app.get("/admin/alerts", (_req, res) => res.json({ count: receivedAlerts.length, alerts: receivedAlerts }));

// Self-test route to demonstrate the chaos guard end-to-end (harmless).
app.get("/demo/ping", chaos("demo.ping"), (_req, res) => res.json({ pong: true }));

// Vendor mocks (each route guards itself with chaos("<vendor>.<op>")).
app.use("/vault", require("./vault"));
app.use("/dealer", require("./dealer"));
app.use("/kyc", require("./kyc"));
app.use("/bank", require("./bank"));
app.use("/fx", require("./fx"));

const PORT = process.env.SIM_PORT || 9090;
app.listen(PORT, () => console.log(`auric-vendor-simulator listening on :${PORT}`));

module.exports = app;
