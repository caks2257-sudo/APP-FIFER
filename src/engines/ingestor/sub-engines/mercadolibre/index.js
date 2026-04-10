const syncCatalog = async (req, res) => {
  return res.status(200).json({
    status: "success",
    data: { message: "Meli sync alcanzado", auth: req.fiferAuth },
  });
};

module.exports = { syncCatalog };
