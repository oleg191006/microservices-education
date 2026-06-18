const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");

const validateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    logger.warn(
      "Unauthorized access attempt to %s from IP: %s",
      req.url,
      req.ip,
    );
    return res
      .status(401)
      .json({ message: "Authorization required", success: false });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn(
        "Invalid token used for access to %s from IP: %s",
        req.url,
        req.ip,
      );
      return res.status(429).json({ message: "Invalid token", success: false });
    }
    req.user = user;
    next();
  });
};

module.exports = validateToken;
