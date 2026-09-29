const User = require("../models/userModel");
const Cart = require("../models/cartModel");
const Order = require("../models/orderModel");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const authController = {
  // Register
  register: async (req, res) => {
    try {
      const { fullName, email, password, phone } = req.body;

      // Validate required fields
      if (!fullName || !email || !password) {
        return res.status(400).json({
          message: "Full name, email and password are required",
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(409).json({
          message: "User with this email already exists",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 5);

      // Create user
      const user = await User.create({
        fullName,
        email,
        password: hashedPassword,
        phone,
      });

      return res.status(201).json({
        message: "User registered successfully",
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Register error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Login
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          message: "Email and password are required",
        });
      }

      // Find user
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

      // Compare password
      const isPasswordCorrect = await bcrypt.compare(
        password,
        user.password
      );

      if (!isPasswordCorrect) {
        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

      // Create JWT
      const token = jwt.sign(
        {
          userId: user._id,
          role: user.role,
          email: user.email,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

      return res.status(200).json({
        message: "Login successful",
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Login error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Delete Account
  deleteAccount: async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    // 1. Delete User Cart
    await Cart.deleteMany({ user: userId }).session(session);

    // 3. Handle Orders: 
    // Usually, e-commerce apps keep completed order history for financial/tax records.
    // Anonymize completed orders, or delete unpaid/draft orders:
    await Order.updateMany(
      { user: userId },
      { $set: { user: null, isAnonymized: true } }
    ).session(session);

    // 4. Delete the User Record
    const deletedUser = await User.findByIdAndDelete(userId).session(session);

    if (!deletedUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "User account not found" });
    }

    // Commit all deletions atomically
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: "Account and associated data deleted successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Delete account error:", error);

    return res.status(500).json({
      message: "Server error during account deletion",
    });
  }
  }
};

module.exports = authController;