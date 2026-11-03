const mongoose = require("mongoose");

const popupSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "main",
      unique: true,
      immutable: true,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    message: {
      type: String,
      trim: true,
      default: "",
    },
    imageUrl: {
      type: String,
      default: "",
    },
    buttonText: {
      type: String,
      trim: true,
      default: "Shop Now",
    },
    buttonUrl: {
      type: String,
      trim: true,
      default: "",
    },
    version: {
      type: Number,
      default: 1,
    },
    startsAt: {
      type: Date,
      default: null,
    },
    endsAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Popup", popupSchema);