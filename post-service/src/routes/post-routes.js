const express = require("express");
const {
  createPost,
  getAllPosts,
  getPost,
  deletePost,
} = require("../controllers/post-controller");
const authenticateRequest = require("../middleware/authMiddleware");

const router = express();

// middleware -> this will tell if the user is authenticated or not
router.use(authenticateRequest);

router.post("/create-post", createPost);
router.get("/all-posts", getAllPosts);
router.get("/post/:id", getPost);
router.delete("/post/:id", deletePost);

module.exports = router;
