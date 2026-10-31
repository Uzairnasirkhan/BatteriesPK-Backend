const DeviceToken = require("../models/deviceTokenModel");

// Dynamically load the ESM-only Expo SDK
let expoSdkPromise;

const getExpoSdk = () => {
  if (!expoSdkPromise) {
    expoSdkPromise = import("expo-server-sdk");
  }

  return expoSdkPromise;
};

const deviceTokenController = {
  // Register or update a device
  registerDevice: async (req, res) => {
    try {
      const userId = req.user.userId;

      const {
        expoPushToken,
        platform = "android",
        marketingEnabled,
        notificationsEnabled,
      } = req.body;

      if (!expoPushToken) {
        return res.status(400).json({
          message: "Expo push token is required",
        });
      }

      // Load Expo SDK dynamically
      const { Expo } = await getExpoSdk();

      if (!Expo.isExpoPushToken(expoPushToken)) {
        return res.status(400).json({
          message: "Invalid Expo push token",
        });
      }

      if (!["android", "ios"].includes(platform)) {
        return res.status(400).json({
          message: "Invalid device platform",
        });
      }

      const updateFields = {
        user: userId,
        platform,
        isActive: true,
      };

      if (typeof marketingEnabled === "boolean") {
        updateFields.marketingEnabled = marketingEnabled;
      }

      if (typeof notificationsEnabled === "boolean") {
        updateFields.notificationsEnabled = notificationsEnabled;
      }

      const device = await DeviceToken.findOneAndUpdate(
        { expoPushToken },
        { $set: updateFields },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

      return res.status(200).json({
        message: "Device registered successfully",
        deviceId: device._id,
        notificationsEnabled: device.notificationsEnabled,
        marketingEnabled: device.marketingEnabled,
      });
    } catch (error) {
      console.error("Register device error:", error);

      return res.status(500).json({
        message: "Failed to register device",
      });
    }
  },

  // Unregister a device, usually on logout
  unregisterDevice: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { expoPushToken } = req.body;

      if (!expoPushToken) {
        return res.status(400).json({
          message: "Expo push token is required",
        });
      }

      await DeviceToken.findOneAndUpdate(
        {
          user: userId,
          expoPushToken,
        },
        {
          $set: {
            isActive: false,
          },
        }
      );

      return res.status(200).json({
        message: "Device unregistered successfully",
      });
    } catch (error) {
      console.error("Unregister device error:", error);

      return res.status(500).json({
        message: "Failed to unregister device",
      });
    }
  },

  // Enable or disable all push notifications for this device
  updateNotificationPreference: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { expoPushToken, enabled } = req.body;

      if (!expoPushToken || typeof enabled !== "boolean") {
        return res.status(400).json({
          message: "Push token and a valid enabled value are required",
        });
      }

      const device = await DeviceToken.findOneAndUpdate(
        {
          user: userId,
          expoPushToken,
          isActive: true,
        },
        {
          $set: {
            notificationsEnabled: enabled,
          },
        },
        {
          new: true,
        }
      );

      if (!device) {
        return res.status(404).json({
          message: "Registered device not found",
        });
      }

      return res.status(200).json({
        message: "Notification preference updated",
        notificationsEnabled: device.notificationsEnabled,
      });
    } catch (error) {
      console.error("Update notification preference error:", error);

      return res.status(500).json({
        message: "Failed to update notification preference",
      });
    }
  },

  // Enable or disable promotional notifications
  updateMarketingPreference: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { expoPushToken, enabled } = req.body;

      if (!expoPushToken || typeof enabled !== "boolean") {
        return res.status(400).json({
          message: "Push token and a valid enabled value are required",
        });
      }

      const device = await DeviceToken.findOneAndUpdate(
        {
          user: userId,
          expoPushToken,
          isActive: true,
        },
        {
          $set: {
            marketingEnabled: enabled,
          },
        },
        {
          new: true,
        }
      );

      if (!device) {
        return res.status(404).json({
          message: "Registered device not found",
        });
      }

      return res.status(200).json({
        message: "Marketing notification preference updated",
        marketingEnabled: device.marketingEnabled,
      });
    } catch (error) {
      console.error("Update marketing preference error:", error);

      return res.status(500).json({
        message: "Failed to update marketing preference",
      });
    }
  },
};

module.exports = deviceTokenController;