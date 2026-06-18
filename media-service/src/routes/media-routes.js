const express = require("express");
const multer = require("multer");

const { uploadMedia, getAllMedia } = require("../controllers/media-controller");
const authenticateRequest = require("../middleware/authMiddleware");
const logger = require("../utils/logger");

const router = express.Router();

// configure multer for file upload handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // limit file size to 5MB
}).single("file"); // expecting a single file with the field name 'file'

router.post(
  "/upload",
  authenticateRequest,
  (req, res, next) => {
    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        logger.error("Error uploading media file:", err);
        return res.status(400).json({
          message: "Error uploading media file",
          error: err.message,
          stack: err.stack,
        });
      } else if (err) {
        logger.error("Unexpected error during file upload:", err);
        return res.status(500).json({
          message: "Unexpected error during file upload",
          error: err.message,
          stack: err.stack,
        });
      }

      if (!req.file) {
        logger.error("No file provided for upload.");
        return res.status(400).json({
          message: "No file provided for upload",
        });
      }
      next();
    });
  },
  uploadMedia,
);

router.get("/all", authenticateRequest, getAllMedia);

module.exports = router;
