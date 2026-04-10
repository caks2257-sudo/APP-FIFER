/**
 * Servidor HTTP del motor FIFER — API master bajo `/api/v1/master`.
 *
 * **Stripe webhook:** `POST /api/v1/master/stripe/webhook` usa cuerpo RAW (`express.raw`)
 * y se registra **antes** de `express.json()` para que `stripe.webhooks.constructEvent` valide la firma.
 * Stripe CLI: `stripe listen --forward-to localhost:3000/api/v1/master/stripe/webhook`
 */
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const express = require("express");
const path = require("path");
const { attachPublicMasterRoutes } = require(path.join(__dirname, "routes/public/master.routes.js"));
const {
  handleStripeWebhook,
  stripeWebhookRawBody,
} = require(path.join(__dirname, "routes/public/stripe.routes.js"));
const financeRouter = require(path.join(__dirname, "../engines/finance/routes.js"));
const contentRouter = require(path.join(__dirname, "../engines/content/routes.js"));
const ingestorRouter = require(path.join(__dirname, "../engines/ingestor/routes.js"));

const PORT = Number(process.env.PORT || process.env.FIFER_HTTP_PORT || 3000);

const app = express();

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true, service: "fifer-api" });
});

app.post("/api/v1/master/stripe/webhook", stripeWebhookRawBody(), handleStripeWebhook);

app.use(
  express.json({
    limit: process.env.FIFER_JSON_BODY_LIMIT || "4mb",
  })
);

const masterRouter = express.Router();
attachPublicMasterRoutes(masterRouter);
app.use("/api/v1/master", masterRouter);

app.use("/api/v2/engines/finance", financeRouter);
app.use("/api/v2/engines/content", contentRouter);
app.use("/api/v2/engines/ingestor", ingestorRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, error: "not_found", path: req.path });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`FIFER API listening on http://0.0.0.0:${PORT} (POST /api/v1/master/stripe/webhook uses raw body before JSON)`);
});
