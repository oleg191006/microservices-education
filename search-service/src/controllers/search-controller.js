const Search = require("../models/Search");
const logger = require("../utils/logger");

const searchPostController = async (req, res) => {
  logger.info("Search endpoint called");
  try {
    const { query } = req.query;

    const results = await Search.find(
      {
        $text: { $search: query },
      },
      {
        score: { $meta: "textScore" },
      },
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10);

    res.status(200).json({ success: true, results });
  } catch (error) {
    logger.error("Error in searchPostController:", error);
    res
      .status(500)
      .json({ success: false, message: "Error while searching post" });
  }
};
module.exports = {
  searchPostController,
};
