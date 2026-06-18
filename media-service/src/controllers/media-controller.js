const logger = require("../utils/logger");
const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const Media = require("../models/Media");

const uploadMedia = async (req, res) => {
  logger.info("Received request to upload media.");
  try {
    if (!req.file) {
      logger.error("No file provided for upload.");
      return res
        .status(400)
        .json({ success: false, message: "No file provided for upload." });
    }

    const { originalname, mimetype, buffer } = req.file;
    const userId = req.user.userId;

    logger.info(
      `User ID: ${userId}, Original Name: ${originalname}, MIME Type: ${mimetype}`,
    );
    logger.info("Uploading file to Cloudinary...");

    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);
    logger.info(
      `File uploaded to Cloudinary successfully. Public Id: ${cloudinaryUploadResult.public_id}`,
    );

    const newlyCreatedMedia = new Media({
      publicId: cloudinaryUploadResult.public_id,
      originalName: originalname,
      mimeType: mimetype,
      url: cloudinaryUploadResult.secure_url,
      userId,
    });

    await newlyCreatedMedia.save();
    logger.info(
      `Media metadata saved to database successfully. Media ID: ${newlyCreatedMedia._id}`,
    );

    res.status(201).json({
      success: true,
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
      message: "Media uploaded and metadata saved successfully.",
    });
  } catch (error) {
    logger.error("Error during media upload process:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while uploading media.",
    });
  }
};

const getAllMedia = async (req, res) => {
  try {
    const userId = req.user.userId;
    const mediaList = await Media.find({ userId });
    res.status(200).json({ success: true, media: mediaList });
  } catch (error) {
    logger.error("Error fetching media:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching media.",
    });
  }
};

module.exports = {
  uploadMedia,
  getAllMedia,
};
