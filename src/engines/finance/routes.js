const express = require("express");
const cashflowRoutes = require("./sub-engines/cashflow/routes");

const router = express.Router();

// Montar sub-engines financieros
router.use("/cashflow", cashflowRoutes);

module.exports = router;
