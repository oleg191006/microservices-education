const Post = require("../models/Post");
const logger = require("../utils/logger");
const { publishEvent } = require("../utils/rabbitmq");
const { validateCreatePost } = require("../utils/validation");

async function invalidatePostCache(req, input) {
  const cacheKey = `post:${input}`;
  await req.redisClient.del(cacheKey);
  logger.info(
    "Post cache invalidated for key: %s due to %s operation",
    cacheKey,
    input,
  );

  const keys = await req.redisClient.keys("posts:*");
  if (keys.length > 0) {
    await req.redisClient.del(keys);
    logger.info("Post cache invalidated due to %s operation", input);
  }
}

const createPost = async (req, res) => {
  logger.info("Create post endpoint called with data: %o", req.body);
  try {
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn(
        "Validation failed for create post request: %o",
        error.details,
      );
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const { content, mediaIds } = req.body;
    const newlyCreatedPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });
    await newlyCreatedPost.save();

    await publishEvent("post.created", {
      postId: newlyCreatedPost._id.toString(),
      userId: req.user.userId,
      content: newlyCreatedPost.content,
      createdAt: newlyCreatedPost.createdAt,
    });

    await invalidatePostCache(req, newlyCreatedPost._id.toString());
    logger.info("Post created successfully: %o", newlyCreatedPost);
    res.status(201).json({
      success: true,
      message: "Post created successfully",
      post: newlyCreatedPost,
    });
  } catch (error) {
    logger.error("Error creating post: %o", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const cacheKey = `posts:page=${page}:limit=${limit}`;
    const cachedPosts = await req.redisClient.get(cacheKey);

    if (cachedPosts) {
      logger.info("Posts retrieved from cache for key: %s", cacheKey);
      return res.json(JSON.parse(cachedPosts));
    }

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments();
    const totalPages = Math.ceil(totalPosts / limit);

    const result = {
      posts,
      currentPage: page,
      totalPages,
      totalPosts,
    };

    await req.redisClient.setex(cacheKey, 60, JSON.stringify(result));

    res.json(result);
  } catch (error) {
    logger.error("Error fetching posts: %o", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const cacheKey = `post:${postId}`;
    const cachedPost = await req.redisClient.get(cacheKey);

    if (cachedPost) {
      logger.info("Post retrieved from cache with key: %s", cacheKey);
      return res.json({ success: true, post: JSON.parse(cachedPost) });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    await req.redisClient.setex(cacheKey, 3600, JSON.stringify(post));
    res.status(200).json({ success: true, post });
  } catch (error) {
    logger.error("Error fetching post: %o", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }
    if (post.user.toString() !== req.user.userId) {
      logger.warn(
        "Unauthorized delete attempt by user %s on post %s",
        req.user.userId,
        req.params.id,
      );
      return res.status(403).json({
        success: false,
        message: "You can only delete your own posts",
      });
    }
    await post.deleteOne();

    // publish post delete method
    await publishEvent("post.deleted", {
      postId: post._id.toString(),
      userId: req.user.userId,
      mediaIds: post.mediaIds,
    });

    await invalidatePostCache(req, req.params.id);
    logger.info("Post deleted successfully: %o", post);
    res
      .status(200)
      .json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    logger.error("Error deleting post: %o", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  createPost,
  getAllPosts,
  getPost,
  deletePost,
};
