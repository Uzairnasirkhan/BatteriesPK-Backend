const mongoose = require("mongoose");

const notificationCampaignSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    type: {
      type: String,
      enum: ["promotion", "product", "general"],
      default: "promotion",
    },

    audience: {
      type: String,
      enum: ["all", "selected"],
      required: true,
    },

    recipientIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    recipientCount: {
      type: Number,
      default: 0,
    },

    deviceCount: {
      type: Number,
      default: 0,
    },

    acceptedCount: {
      type: Number,
      default: 0,
    },

    failedCount: {
      type: Number,
      default: 0,
    },

    invalidTokenCount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["sending", "sent", "partial", "failed"],
      default: "sending",
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationCampaignSchema.index({ createdAt: -1 });

module.exports = mongoose.model(
  "NotificationCampaign",
  notificationCampaignSchema
);