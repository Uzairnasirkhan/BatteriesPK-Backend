const express = require("express");
const router = express.Router();

const {
  getActivePopup,
  getAdminPopup,
  updatePopup,
} = require("../controllers/popupController");

const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const upload = require("../middleware/upload");

// Public route for the mobile app
router.get("/", getActivePopup);

// Admin routes
router.get(
  "/admin",
  verifyToken,
  authorizeRoles("admin"),
  getAdminPopup
);

router.put(
  "/admin",
  verifyToken,
  authorizeRoles("admin"),
  upload.single("image"),
  updatePopup
);

module.exports = router;