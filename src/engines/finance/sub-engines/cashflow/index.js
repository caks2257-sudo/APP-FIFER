/**
 * Sub-Engine: Cashflow
 * Responsabilidad: Cálculos y métricas de flujo de caja.
 */
const getCashflowSnapshot = async (req, res) => {
  // Aquí irá la lógica real de negocio en el futuro.
  // Por ahora, validamos que el gateway deja pasar la petición y adjunta fiferAuth.
  const authData = req.fiferAuth;

  return res.status(200).json({
    status: "success",
    data: {
      message: "Cashflow sub-engine alcanzado de forma segura.",
      auth: authData,
      metrics: { pending_uf: 0, cleared_clp: 0 },
    },
  });
};

module.exports = {
  getCashflowSnapshot,
};
