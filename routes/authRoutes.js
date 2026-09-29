const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { register, login, deleteAccount } = require("../controllers/authController");

// Register
router.post("/register", register);

// Login
router.post("/login", login);

router.delete("/delete-account", verifyToken, deleteAccount);

module.exports = router;