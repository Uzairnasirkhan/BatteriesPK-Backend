const express = require("express");
const router = express.Router();
const { getCart, addToCart, updateCartItem, removeFromCart, clearCart } = require("../controllers/cartController");
const { verifyToken } = require("../middleware/authMiddleware");

// Get user's cart
router.get("/", verifyToken, getCart);

// Add product to cart
router.post("/", verifyToken, addToCart);

// Update product quantity
router.put("/:productId", verifyToken, updateCartItem);

// Remove product from cart
router.delete("/:productId", verifyToken, removeFromCart);

// Clear cart
router.delete("/", verifyToken, clearCart);

module.exports = router;