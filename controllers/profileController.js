const User = require("../models/userModel");
const mongoose = require("mongoose");
const Order = require("../models/orderModel");
const Review = require("../models/reviewModel");
const Cart = require("../models/cartModel");
const Notification = require("../models/notificationModel");

const profileController = {
  // Get logged-in user's profile
  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user.userId).select("-password");

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      return res.status(200).json({
        user,
      });
    } catch (error) {
      console.error("Get profile error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Get All users (Admin only)
  getAllUsers: async (req, res) => {
    try {
      const users = await User.find().select("-password");
      return res.status(200).json({ users });
    } catch (error) {
      console.error("Get all users error:", error);
      return res.status(500).json({
        message: "Server error",
      });
    }
  },


  // Delete a user (Admin only)
  deleteUser: async (req, res) => {
    // Start a transaction session for atomic execution
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { userId } = req.params;

      // Fetch user within the session
      const user = await User.findById(userId).session(session);

      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          message: "User not found",
        });
      }

      // Delete user-owned records using the same transaction session
      await Order.deleteMany({ user: userId }, { session });
      await Review.deleteMany({ user: userId }, { session });
      await Cart.deleteMany({ user: userId }, { session });
      await Notification.deleteMany({ user: userId }, { session });

      // Delete the fetched user instance directly (saves 1 extra DB query)
      await user.deleteOne({ session });

      // Commit all operations together
      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        message: "User and related records deleted successfully",
      });
    } catch (error) {
      // Roll back all deletions if any single step fails
      await session.abortTransaction();
      session.endSession();

      console.error("Delete user error:", error);

      if (error.name === "CastError") {
        return res.status(400).json({
          message: "Invalid user ID format",
        });
      }

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Update logged-in user's profile
  updateProfile: async (req, res) => {
    try {
      const { fullName, phone } = req.body;

      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (fullName !== undefined) {
        user.fullName = fullName;
      }

      if (phone !== undefined) {
        user.phone = phone;
      }

      await user.save();

      return res.status(200).json({
        message: "Profile updated successfully",
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          addresses: user.addresses,
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Get all saved addresses
  getAddresses: async (req, res) => {
    try {
      const user = await User.findById(req.user.userId).select("addresses");

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      return res.status(200).json({
        addresses: user.addresses,
      });
    } catch (error) {
      console.error("Get addresses error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Add new address
  addAddress: async (req, res) => {
    try {
      const {
        label,
        city,
        address,
        isDefault,
      } = req.body;

      // Validate required fields
      if (!city || !address) {
        return res.status(400).json({
          message: "City and address are required",
        });
      }

      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      // If this is the first address,
      // automatically make it default
      const makeDefault =
        user.addresses.length === 0 ? true : Boolean(isDefault);

      // If this address should be default,
      // remove default from existing addresses
      if (makeDefault) {
        user.addresses.forEach((item) => {
          item.isDefault = false;
        });
      }

      user.addresses.push({
        label,
        city,
        address,
        isDefault: makeDefault,
      });

      await user.save();

      const newAddress =
        user.addresses[user.addresses.length - 1];

      return res.status(201).json({
        message: "Address added successfully",
        address: newAddress,
      });
    } catch (error) {
      console.error("Add address error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Update existing address
  updateAddress: async (req, res) => {
    try {
      const { addressId } = req.params;
      const {
        label,
        city,
        address,
        isDefault,
      } = req.body;

      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const savedAddress = user.addresses.id(addressId);

      if (!savedAddress) {
        return res.status(404).json({
          message: "Address not found",
        });
      }

      // If making this address default,
      // remove default from all other addresses
      if (isDefault === true) {
        user.addresses.forEach((item) => {
          item.isDefault = false;
        });
      }

      if (label !== undefined) {
        savedAddress.label = label;
      }

      if (city !== undefined) {
        savedAddress.city = city;
      }

      if (address !== undefined) {
        savedAddress.address = address;
      }

      if (isDefault !== undefined) {
        savedAddress.isDefault = isDefault;
      }

      await user.save();

      return res.status(200).json({
        message: "Address updated successfully",
        address: savedAddress,
      });
    } catch (error) {
      console.error("Update address error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Delete address
  deleteAddress: async (req, res) => {
    try {
      const { addressId } = req.params;

      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const savedAddress = user.addresses.id(addressId);

      if (!savedAddress) {
        return res.status(404).json({
          message: "Address not found",
        });
      }

      const wasDefault = savedAddress.isDefault;

      savedAddress.deleteOne();

      // If deleted address was default,
      // make the first remaining address default
      if (wasDefault && user.addresses.length > 0) {
        user.addresses[0].isDefault = true;
      }

      await user.save();

      return res.status(200).json({
        message: "Address deleted successfully",
      });
    } catch (error) {
      console.error("Delete address error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Set an address as default
  setDefaultAddress: async (req, res) => {
    try {
      const { addressId } = req.params;

      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const selectedAddress = user.addresses.id(addressId);

      if (!selectedAddress) {
        return res.status(404).json({
          message: "Address not found",
        });
      }

      // Remove default from all addresses
      user.addresses.forEach((item) => {
        item.isDefault = false;
      });

      // Set selected address as default
      selectedAddress.isDefault = true;

      await user.save();

      return res.status(200).json({
        message: "Default address updated successfully",
        address: selectedAddress,
      });
    } catch (error) {
      console.error("Set default address error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },
};

module.exports = profileController;