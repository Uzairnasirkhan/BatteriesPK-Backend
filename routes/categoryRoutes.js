const express = require("express");
const router = express.Router();
const { verifyToken, authorizeRoles} = require("../middleware/authMiddleware");
const { getCategories, getActiveCategories, getCategoryById, createCategory, updateCategory, deleteCategory } = require("../controllers/categoryController");


// Public routes
router.get("/", getCategories);

router.get("/active", getActiveCategories);

router.get("/:id", getCategoryById);

// Admin routes
router.post(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  createCategory
);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  updateCategory
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  deleteCategory
);

module.exports = router;