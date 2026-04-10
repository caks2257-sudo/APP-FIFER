const triggerPipeline = async (req, res) => {
  return res.status(200).json({
    status: "success",
    data: { message: "Content pipeline alcanzado", auth: req.fiferAuth },
  });
};

module.exports = { triggerPipeline };
