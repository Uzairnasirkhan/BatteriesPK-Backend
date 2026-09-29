const mongoose = require("mongoose");
const Review = require("../models/reviewModel");
const Product = require("../models/productModel");

 // Create review
  exports.createReview = async (req, res) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { productId, rating, comment } = req.body;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        message: "Valid product ID is required",
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        message: "Comment is required",
      });
    }

    // Check product
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // Check existing review
    const existingReview = await Review.findOne({
      product: productId,
      user: userId,
    });

    if (existingReview) {
      return res.status(409).json({
        message: "You have already reviewed this product",
      });
    }

    const review = await Review.create({
      product: productId,
      user: userId,
      rating,
      comment: comment.trim(),
    });

    const populatedReview = await Review.findById(review._id)
      .populate("user", "fullName")
      .populate("product", "name");

    return res.status(201).json({
      message: "Review added successfully",
      review: populatedReview,
    });
  } catch (error) {
    console.error("Create review error:", error);

    // Handle MongoDB duplicate key
    if (error.code === 11000) {
      return res.status(409).json({
        message: "You have already reviewed this product",
      });
    }

    return res.status(500).json({
      message: "Server error while creating review",
    });
  }
  };

// Get reviews for a product
  exports.getProductReviews = async (req, res) => {
    try {
      const { productId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          message: "Invalid product ID",
        });
      }

      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      const reviews = await Review.find({
        product: productId,
      })
        .populate("user", "fullName")
        .sort({ createdAt: -1 });

      const reviewCount = reviews.length;

      const averageRating =
        reviewCount > 0
          ? reviews.reduce((sum, review) => sum + review.rating, 0) /
            reviewCount
          : 0;

      return res.status(200).json({
        reviews,
        averageRating: Number(averageRating.toFixed(1)),
        reviewCount,
      });
    } catch (error) {
      console.error("Get product reviews error:", error);

      return res.status(500).json({
        message: "Server error while fetching reviews",
      });
    }
  };

// Get logged-in user's review for a product
  exports.getMyProductReview = async (req, res) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { productId } = req.params;

      if (!userId) {
        return res.status(401).json({
          message: "Unauthorized request",
        });
      }

      const review = await Review.findOne({
        product: productId,
        user: userId,
      }).populate("user", "fullName");

      return res.status(200).json({
        review: review || null,
      });
    } catch (error) {
      console.error("Get my review error:", error);

      return res.status(500).json({
        message: "Server error while fetching your review",
      });
    }
  };

// Update logged-in user's review
 exports.updateReview = async (req, res) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { reviewId } = req.params;
      const { rating, comment } = req.body;

      if (!userId) {
        return res.status(401).json({
          message: "Unauthorized request",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        return res.status(400).json({
          message: "Invalid review ID",
        });
      }

      if (rating !== undefined && (rating < 1 || rating > 5)) {
        return res.status(400).json({
          message: "Rating must be between 1 and 5",
        });
      }

      if (comment !== undefined && !comment.trim()) {
        return res.status(400).json({
          message: "Comment cannot be empty",
        });
      }

      const review = await Review.findOne({
        _id: reviewId,
        user: userId,
      });

      if (!review) {
        return res.status(404).json({
          message: "Review not found",
        });
      }

      if (rating !== undefined) {
        review.rating = rating;
      }

      if (comment !== undefined) {
        review.comment = comment.trim();
      }

      await review.save();

      const updatedReview = await Review.findById(review._id)
        .populate("user", "fullName")
        .populate("product", "name");

      return res.status(200).json({
        message: "Review updated successfully",
        review: updatedReview,
      });
    } catch (error) {
      console.error("Update review error:", error);

      return res.status(500).json({
        message: "Server error while updating review",
      });
    }
  };

// Delete logged-in user's review
 exports.deleteReview = async (req, res) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { reviewId } = req.params;

      if (!userId) {
        return res.status(401).json({
          message: "Unauthorized request",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        return res.status(400).json({
          message: "Invalid review ID",
        });
      }

      const review = await Review.findOneAndDelete({
        _id: reviewId,
        user: userId,
      });

      if (!review) {
        return res.status(404).json({
          message: "Review not found",
        });
      }

      return res.status(200).json({
        message: "Review deleted successfully",
      });
    } catch (error) {
      console.error("Delete review error:", error);

      return res.status(500).json({
        message: "Server error while deleting review",
      });
    }
  };



