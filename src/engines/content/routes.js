const express = require("express");
const pipelineRoutes = require("./sub-engines/pipeline/routes");

const router = express.Router();

// Montar sub-engines de contenido
router.use("/pipeline", pipelineRoutes);

module.exports = router;
