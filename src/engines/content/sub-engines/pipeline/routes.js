const express = require("express");
const { requireApiKey } = require("../../../../api/gateway/apiKeyValidator");
const { triggerPipeline } = require("./index");

const router = express.Router();

router.post("/trigger", requireApiKey("content.pipeline", "write"), triggerPipeline);

module.exports = router;
