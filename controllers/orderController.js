const mongoose = require("mongoose");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const User = require("../models/userModel");
const Cart = require("../models/cartModel");
const Notification = require("../models/notificationModel");
const uploadToCloudinary = require("../utils/cloudinaryUpload");

const orderController = {
  // Create order
  createOrder: async (req, res) => {
    const session = await mongoose.startSession();

    try {
      const userId = req.user.userId;

      const { addressId, notes } = req.body;

      // ---------------------------------------------------
      // 1. Check payment proof
      // ---------------------------------------------------
      if (!req.file) {
        return res.status(400).json({
          message: "Payment proof is required before placing the order",
        });
      }

      // ---------------------------------------------------
      // 2. Upload payment proof to Cloudinary
      // ---------------------------------------------------
      let paymentProof;

      try {
        const uploadResult = await uploadToCloudinary(
          req.file.buffer,
          "ecommerce/payment-proofs"
        );

        paymentProof = uploadResult.secure_url;
      } catch (uploadError) {
        console.error("Payment proof upload error:", uploadError);
        return res.status(500).json({
          message: "Failed to upload payment proof",
        });
      }

      // ---------------------------------------------------
      // 3. Start transaction
      // ---------------------------------------------------
      session.startTransaction();

      // ---------------------------------------------------
      // 4. Get user
      // ---------------------------------------------------
      const user = await User.findById(userId).session(session);

      if (!user) {
        await session.abortTransaction();

        return res.status(404).json({
          message: "User not found",
        });
      }

      // ---------------------------------------------------
      // 5. Get selected address
      // ---------------------------------------------------
      const address = user.addresses.id(addressId);

      if (!address) {
        await session.abortTransaction();

        return res.status(404).json({
          message: "Shipping address not found",
        });
      }

      // ---------------------------------------------------
      // 6. Get user's cart
      // ---------------------------------------------------
      const cart = await Cart.findOne({
        user: userId,
      })
        .populate({
          path: "items.product",
          select: "name images price discountPrice stock isActive",
        })
        .session(session);

      if (!cart || cart.items.length === 0) {
        await session.abortTransaction();

        return res.status(400).json({
          message: "Your cart is empty",
        });
      }

      // ---------------------------------------------------
      // 7. Validate cart items and calculate subtotal
      // ---------------------------------------------------
      const orderItems = [];
      let subtotal = 0;

      for (const cartItem of cart.items) {
        const product = cartItem.product;

        if (!product) {
          await session.abortTransaction();

          return res.status(400).json({
            message: "One or more products in your cart no longer exist",
          });
        }

        if (!product.isActive) {
          await session.abortTransaction();

          return res.status(400).json({
            message: `${product.name} is no longer available`,
          });
        }

        if (product.stock < cartItem.quantity) {
          await session.abortTransaction();

          return res.status(400).json({
            message: `Insufficient stock for ${product.name}. Only ${product.stock} available`,
          });
        }

        // Use discount price when available
        const price =
          product.discountPrice !== undefined &&
          product.discountPrice !== null
            ? product.discountPrice
            : product.price;

        const itemTotal = price * cartItem.quantity;

        subtotal += itemTotal;

        // Store product snapshot inside order
        orderItems.push({
          product: product._id,
          name: product.name,
          image:
            product.images && product.images.length > 0
              ? product.images[0]
              : undefined,
          price,
          quantity: cartItem.quantity,
        });
      }

      // ---------------------------------------------------
      // 8. Calculate shipping
      // ---------------------------------------------------
      const shippingFee = 0;

      const totalAmount = subtotal + shippingFee;

      // ---------------------------------------------------
      // 9. Create order
      // ---------------------------------------------------
      const [order] = await Order.create(
        [
          {
            user: userId,

            items: orderItems,

            shippingAddress: {
              fullName: user.fullName,
              phone: user.phone,
              city: address.city,
              address: address.address,
            },

            subtotal,
            shippingFee,
            totalAmount,

            // Only payment method available
            paymentMethod: "bank_transfer",

            // Admin must verify payment proof
            paymentStatus: "pending",

            // Order starts pending
            orderStatus: "pending",

            // Cloudinary URL
            paymentProof,

            notes: notes || "",
          },
        ],
        { session }
      );

      // ---------------------------------------------------
      // 10. Reduce product stock
      // ---------------------------------------------------
      for (const cartItem of cart.items) {
        const product = cartItem.product;

        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: product._id,
            stock: {
              $gte: cartItem.quantity,
            },
          },
          {
            $inc: {
              stock: -cartItem.quantity,
            },
          },
          {
            new: true,
            session,
          }
        );

        if (!updatedProduct) {
          await session.abortTransaction();

          return res.status(400).json({
            message: `Insufficient stock for ${product.name}`,
          });
        }
      }

      // ---------------------------------------------------
      // 11. Clear cart
      // ---------------------------------------------------
      cart.items = [];

      await cart.save({
        session,
      });

      // ---------------------------------------------------
      // 12. Commit transaction
      // ---------------------------------------------------
      await session.commitTransaction();

      return res.status(201).json({
        message: "Order placed successfully. Payment is pending verification.",
        order,
      });
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      console.error("Create order error:", error);

      return res.status(500).json({
        message: "Failed to place order",
        error: error.message,
      });
    } finally {
      session.endSession();
    }
  },

  // Get logged-in user's orders
  getMyOrders: async (req, res) => {
    try {
      const userId = req.user.userId;

      const orders = await Order.find({
        user: userId,
      })
        .populate(
          "items.product",
          "name images price discountPrice"
        )
        .sort({ createdAt: -1 });

      return res.status(200).json({
        orders,
      });
    } catch (error) {
      console.error("Get my orders error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Get single user's order
  getMyOrder: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid order ID",
        });
      }

      const order = await Order.findOne({
        _id: id,
        user: userId,
      })
        .populate("user", "fullName email phone")
        .populate(
          "items.product",
          "name images price discountPrice"
        );

      if (!order) {
        return res.status(404).json({
          message: "Order not found",
        });
      }

      return res.status(200).json({
        order,
      });
    } catch (error) {
      console.error("Get my order error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Cancel user's order
  cancelOrder: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid order ID",
        });
      }

      const order = await Order.findOne({
        _id: id,
        user: userId,
      });

      if (!order) {
        return res.status(404).json({
          message: "Order not found",
        });
      }

      // Only pending or confirmed orders can be cancelled
      if (
        order.orderStatus !== "pending" &&
        order.orderStatus !== "confirmed"
      ) {
        return res.status(400).json({
          message:
            "This order cannot be cancelled at this stage",
        });
      }

      order.orderStatus = "cancelled";

      await order.save();

      // Restore product stock
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product,
          {
            $inc: {
              stock: item.quantity,
            },
          }
        );
      }

      return res.status(200).json({
        message: "Order cancelled successfully",
        order,
      });
    } catch (error) {
      console.error("Cancel order error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // =========================
  // ADMIN APIs
  // =========================

  // Get all orders - Admin
  getAllOrders: async (req, res) => {
    try {
      const orders = await Order.find()
        .populate("user", "fullName email phone")
        .populate(
          "items.product",
          "name images price discountPrice"
        )
        .sort({ createdAt: -1 });

      return res.status(200).json({
        orders,
      });
    } catch (error) {
      console.error("Get all orders error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Get single order - Admin
  getOrder: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid order ID",
        });
      }

      const order = await Order.findById(id)
        .populate("user", "fullName email phone")
        .populate(
          "items.product",
          "name images price discountPrice"
        );

      if (!order) {
        return res.status(404).json({
          message: "Order not found",
        });
      }

      return res.status(200).json({
        order,
      });
    } catch (error) {
      console.error("Get order error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

// Update order status - Admin
updateOrderStatus: async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    const validStatuses = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    // Don't allow changing a delivered order
    if (order.orderStatus === "delivered") {
      return res.status(400).json({
        message: "Delivered orders cannot be changed",
      });
    }

    // Don't create a notification if the status
    // hasn't actually changed
    if (order.orderStatus === orderStatus) {
      return res.status(400).json({
        message: "Order already has this status",
      });
    }

    const oldStatus = order.orderStatus;

    order.orderStatus = orderStatus;

    await order.save();

    // Create customer notification
    if (order.user) {
      const statusText = orderStatus
        .charAt(0)
        .toUpperCase() + orderStatus.slice(1);

      await Notification.create({
        user: order.user,
        title: "Order Status Updated",
        message: `Your order status has been changed from ${oldStatus} to ${statusText}.`,
        type: "order",
        order: order._id,
        isRead: false,
      });
    }

    return res.status(200).json({
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error(
      "Update order status error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
},

  // Update payment status - Admin
  updatePaymentStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentStatus } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid order ID",
        });
      }

      const validStatuses = [
        "pending",
        "paid",
        "failed",
        "refunded",
      ];

      if (!validStatuses.includes(paymentStatus)) {
        return res.status(400).json({
          message: "Invalid payment status",
        });
      }

      const order = await Order.findById(id);

      if (!order) {
        return res.status(404).json({
          message: "Order not found",
        });
      }

      if (paymentStatus === "paid") {
        order.paymentStatus = "paid";

        if (order.orderStatus === "pending") {
          order.orderStatus = "confirmed";
        }
      }

      order.paymentStatus = paymentStatus;

      await order.save();

      return res.status(200).json({
        message: "Payment status updated successfully",
        order,
      });
    } catch (error) {
      console.error("Update payment status error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },
};

module.exports = orderController;