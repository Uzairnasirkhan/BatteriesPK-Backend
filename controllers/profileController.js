const User = require("../models/userModel");

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