const express = require("express");
const router = express.Router();

const {
  getActiveBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} = require("../controllers/bannerController");

const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const upload = require("../middleware/upload");

// Public route for the mobile app
router.get("/", getActiveBanners);

// Admin routes
router.get(
  "/admin/all",
  verifyToken,
  authorizeRoles("admin"),
  getAllBanners
);

router.post(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  upload.single("image"),
  createBanner
);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  upload.single("image"),
  updateBanner
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  deleteBanner
);

module.exports = router;