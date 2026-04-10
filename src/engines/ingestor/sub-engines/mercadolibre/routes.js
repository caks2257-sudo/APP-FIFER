const express = require("express");
const { requireApiKey } = require("../../../../api/gateway/apiKeyValidator");
const { syncCatalog } = require("./index");

const router = express.Router();

router.post("/sync", requireApiKey("ingestor.mercadolibre", "write"), syncCatalog);

module.exports = router;
