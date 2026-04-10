const express = require("express");
const mercadoLibreRoutes = require("./sub-engines/mercadolibre/routes");

const router = express.Router();

// Montar sub-engines de ingesta
router.use("/mercadolibre", mercadoLibreRoutes);

module.exports = router;
