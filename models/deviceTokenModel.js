const mongoose = require("mongoose");

const deviceTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    expoPushToken: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    platform: {
      type: String,
      enum: ["android", "ios"],
      default: "android",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    notificationsEnabled: {
      type: Boolean,
      default: true,
    },

    marketingEnabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

deviceTokenSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model("DeviceToken", deviceTokenSchema);