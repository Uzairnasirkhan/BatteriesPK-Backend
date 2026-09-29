const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  label: {
    type: String,
    enum: ["home", "office", "other"],
    default: "home",
  },

  city: {
    type: String,
    required: true,
    trim: true,
  },

  address: {
    type: String,
    required: true,
    trim: true,
  },

  isDefault: {
    type: Boolean,
    default: false,
  },
});

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    addresses: {
      type: [addressSchema],
      default: [],
    },

    role: {
      type: String,
      enum: ["admin", "customer"],
      default: "customer",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);