const express = require("express");
const { requireApiKey } = require("../../../../api/gateway/apiKeyValidator");
const { getCashflowSnapshot } = require("./index");

const router = express.Router();

// Aplica el validador del Gateway.
// Scope requerido: 'finance.cashflow', Permiso: 'read'
router.get("/snapshot", requireApiKey("finance.cashflow", "read"), getCashflowSnapshot);

module.exports = router;
