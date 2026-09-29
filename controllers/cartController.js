const mongoose = require("mongoose");
const Cart = require("../models/cartModel");
const Product = require("../models/productModel");

const cartController = {
  // Get logged-in user's cart
  getCart: async (req, res) => {
    try {
      const userId = req.user.userId;

      let cart = await Cart.findOne({
        user: userId,
      })
        .populate(
          "items.product",
          "name images price discountPrice stock isActive"
        );

      // Create empty cart if user does not have one
      if (!cart) {
        cart = await Cart.create({
          user: userId,
          items: [],
        });
      }

      return res.status(200).json({
        cart,
      });
    } catch (error) {
      console.error("Get cart error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Add product to cart
  addToCart: async (req, res) => {
    try {
      const userId = req.user.userId;

      const { productId, quantity } = req.body;

      // Validate product ID
      if (!productId) {
        return res.status(400).json({
          message: "Product ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          message: "Invalid product ID",
        });
      }

      // Validate quantity
      if (!quantity || quantity < 1) {
        return res.status(400).json({
          message: "Quantity must be at least 1",
        });
      }

      // Find active product
      const product = await Product.findOne({
        _id: productId,
        isActive: true,
      });

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      // Check stock
      if (product.stock < quantity) {
        return res.status(400).json({
          message: "Not enough stock available",
        });
      }

      // Find user's cart
      let cart = await Cart.findOne({
        user: userId,
      });

      // Create cart if it doesn't exist
      if (!cart) {
        cart = await Cart.create({
          user: userId,
          items: [
            {
              product: productId,
              quantity,
            },
          ],
        });
      } else {
        const existingItem = cart.items.find(
          (item) =>
            item.product.toString() === productId
        );

        if (existingItem) {
          const newQuantity =
            existingItem.quantity + quantity;

          // Check combined quantity against stock
          if (newQuantity > product.stock) {
            return res.status(400).json({
              message:
                "Requested quantity exceeds available stock",
            });
          }

          existingItem.quantity = newQuantity;
        } else {
          cart.items.push({
            product: productId,
            quantity,
          });
        }

        await cart.save();
      }

      // Populate product information
      cart = await Cart.findById(cart._id).populate(
        "items.product",
        "name images price discountPrice stock isActive"
      );

      return res.status(200).json({
        message: "Product added to cart",
        cart,
      });
    } catch (error) {
      console.error("Add to cart error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Update cart item quantity
  updateCartItem: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { productId } = req.params;
      const { quantity } = req.body;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          message: "Invalid product ID",
        });
      }

      if (!quantity || quantity < 1) {
        return res.status(400).json({
          message: "Quantity must be at least 1",
        });
      }

      // Check product
      const product = await Product.findOne({
        _id: productId,
        isActive: true,
      });

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      // Check stock
      if (quantity > product.stock) {
        return res.status(400).json({
          message: "Requested quantity exceeds available stock",
        });
      }

      const cart = await Cart.findOne({
        user: userId,
      });

      if (!cart) {
        return res.status(404).json({
          message: "Cart not found",
        });
      }

      const cartItem = cart.items.find(
        (item) =>
          item.product.toString() === productId
      );

      if (!cartItem) {
        return res.status(404).json({
          message: "Product is not in the cart",
        });
      }

      cartItem.quantity = quantity;

      await cart.save();

      const updatedCart = await Cart.findById(
        cart._id
      ).populate(
        "items.product",
        "name images price discountPrice stock isActive"
      );

      return res.status(200).json({
        message: "Cart updated successfully",
        cart: updatedCart,
      });
    } catch (error) {
      console.error("Update cart error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Remove product from cart
  removeFromCart: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { productId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          message: "Invalid product ID",
        });
      }

      const cart = await Cart.findOne({
        user: userId,
      });

      if (!cart) {
        return res.status(404).json({
          message: "Cart not found",
        });
      }

      const itemExists = cart.items.some(
        (item) =>
          item.product.toString() === productId
      );

      if (!itemExists) {
        return res.status(404).json({
          message: "Product is not in the cart",
        });
      }

      cart.items = cart.items.filter(
        (item) =>
          item.product.toString() !== productId
      );

      await cart.save();

      const updatedCart = await Cart.findById(
        cart._id
      ).populate(
        "items.product",
        "name images price discountPrice stock isActive"
      );

      return res.status(200).json({
        message: "Product removed from cart",
        cart: updatedCart,
      });
    } catch (error) {
      console.error("Remove from cart error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Clear entire cart
  clearCart: async (req, res) => {
    try {
      const userId = req.user.userId;

      const cart = await Cart.findOne({
        user: userId,
      });

      if (!cart) {
        return res.status(404).json({
          message: "Cart not found",
        });
      }

      cart.items = [];

      await cart.save();

      return res.status(200).json({
        message: "Cart cleared successfully",
        cart,
      });
    } catch (error) {
      console.error("Clear cart error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },
};

module.exports = cartController;