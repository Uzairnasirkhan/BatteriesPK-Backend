const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { register, login, changePassword, deleteAccount } = require("../controllers/authController");

// Register
router.post("/register", register);

// Login
router.post("/login", login);

// Change Password
router.put("/change-password", verifyToken, changePassword);

// Delete Account
router.delete("/delete-account", verifyToken, deleteAccount);

module.exports = router;