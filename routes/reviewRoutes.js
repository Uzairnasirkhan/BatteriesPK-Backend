const express = require("express");
const reviewController = require("../controllers/reviewController");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// Access methods through the object

//get all reviews for a product
router.get("/product/:productId", verifyToken, reviewController.getProductReviews);

// Get logged-in user's review for a product
router.get("/product/:productId/my-review", verifyToken, reviewController.getMyProductReview);

// Create a new review
router.post("/", verifyToken, reviewController.createReview);

// Update logged-in user's review
router.put("/:reviewId", verifyToken, reviewController.updateReview);

// Delete logged-in user's review
router.delete("/:reviewId", verifyToken, reviewController.deleteReview);

module.exports = router;