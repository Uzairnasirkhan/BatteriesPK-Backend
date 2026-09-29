const express = require("express");
const router = express.Router();
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct } = require("../controllers/productController");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

// Public routes
router.get("/", getProducts);
router.get("/:id", getProduct);

// Admin routes
router.post(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  createProduct
);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  updateProduct
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  deleteProduct
);

module.exports = router;