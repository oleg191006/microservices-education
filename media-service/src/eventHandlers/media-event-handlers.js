const Media = require("../models/Media");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");

const handlePostDeleted = async (event) => {
  console.log("Received post.deleted event:", event);
  const { postId, mediaIds } = event;
  try {
    const mediaToDelete = await Media.find({ _id: { $in: mediaIds } });

    for (const media of mediaToDelete) {
      await deleteMediaFromCloudinary(media.publicId);
      await Media.findByIdAndDelete(media._id);
      logger.info(
        "Deleted media %s associated with post %s",
        media._id,
        postId,
      );
    }

    logger.info(
      "Handled post.deleted event for postId %s, deleted %d media items",
      postId,
      mediaToDelete.length,
    );
  } catch (error) {
    logger.error(
      "Error handling post.deleted event for postId %s: %o",
      postId,
      error,
    );
  }
};

module.exports = {
  handlePostDeleted,
};
