const Search = require("../models/Search");
const logger = require("../utils/logger");

async function handlePostCreated(event) {
  try {
    const newSearchPost = new Search({
      postId: event.postId,
      userId: event.userId,
      content: event.content,
      createdAt: event.createdAt,
    });
    await newSearchPost.save();
    logger.info("Search index updated for new post: %o", newSearchPost);
  } catch (error) {
    logger.error("Error handling post created event: %o", error);
  }
}

async function handlePostDeleted(event) {
  try {
    await Search.deleteOne({ postId: event.postId });
    logger.info("Search index updated for deleted post: %s", event.postId);
  } catch (error) {
    logger.error("Error handling post deleted event: %o", error);
  }
}

module.exports = {
  handlePostCreated,
  handlePostDeleted,
};
