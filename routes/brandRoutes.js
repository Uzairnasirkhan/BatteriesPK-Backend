const express = require("express");
const router = express.Router();
const { getBrands, getBrand, createBrand, updateBrand, deleteBrand } = require("../controllers/brandController");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");


// Public routes
router.get("/", getBrands);
router.get("/:id", getBrand);

// Admin routes
router.post(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  createBrand
);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  updateBrand
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  deleteBrand
);

module.exports = router;