const mongoose = require("mongoose");
const Banner = require("../models/bannerModel");
const uploadToCloudinary = require("../utils/cloudinaryUpload");

const parseBoolean = (value, fallback = true) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return value === true || value === "true";
};

// Public: Get active banners for the mobile app
const getActiveBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({ banners });
  } catch (error) {
    console.error("Get active banners error:", error);

    return res.status(500).json({
      message: "Failed to fetch banners.",
    });
  }
};

// Admin: Get all banners, including inactive ones
const getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({ banners });
  } catch (error) {
    console.error("Get all banners error:", error);

    return res.status(500).json({
      message: "Failed to fetch banners.",
    });
  }
};

// Admin: Create a banner
const createBanner = async (req, res) => {
  try {
    const { title, subtitle, targetUrl, isActive, sortOrder } = req.body;

    if (!req.file) {
      return res.status(400).json({
        message: "Please select a banner image.",
      });
    }

    const uploadResult = await uploadToCloudinary(
      req.file.buffer,
      "ecommerce/banners"
    );

    const banner = await Banner.create({
      title: title || "",
      subtitle: subtitle || "",
      imageUrl: uploadResult.secure_url,
      targetUrl: targetUrl || "",
      isActive: parseBoolean(isActive, true),
      sortOrder: Number(sortOrder) || 0,
    });

    return res.status(201).json({
      message: "Banner created successfully.",
      banner,
    });
  } catch (error) {
    console.error("Create banner error:", error);

    return res.status(500).json({
      message: "Failed to create banner.",
    });
  }
};

// Admin: Update a banner
const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid banner ID.",
      });
    }

    const banner = await Banner.findById(id);

    if (!banner) {
      return res.status(404).json({
        message: "Banner not found.",
      });
    }

    const { title, subtitle, targetUrl, isActive, sortOrder } = req.body;

    if (title !== undefined) banner.title = title;
    if (subtitle !== undefined) banner.subtitle = subtitle;
    if (targetUrl !== undefined) banner.targetUrl = targetUrl;

    if (isActive !== undefined) {
      banner.isActive = parseBoolean(isActive, banner.isActive);
    }

    if (sortOrder !== undefined) {
      const parsedOrder = Number(sortOrder);

      if (!Number.isFinite(parsedOrder)) {
        return res.status(400).json({
          message: "Sort order must be a valid number.",
        });
      }

      banner.sortOrder = parsedOrder;
    }

    // Replace the image only if a new file was uploaded.
    if (req.file) {
      const uploadResult = await uploadToCloudinary(
        req.file.buffer,
        "ecommerce/banners"
      );

      banner.imageUrl = uploadResult.secure_url;
    }

    await banner.save();

    return res.status(200).json({
      message: "Banner updated successfully.",
      banner,
    });
  } catch (error) {
    console.error("Update banner error:", error);

    return res.status(500).json({
      message: "Failed to update banner.",
    });
  }
};

// Admin: Delete a banner
const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid banner ID.",
      });
    }

    const banner = await Banner.findByIdAndDelete(id);

    if (!banner) {
      return res.status(404).json({
        message: "Banner not found.",
      });
    }

    return res.status(200).json({
      message: "Banner deleted successfully.",
    });
  } catch (error) {
    console.error("Delete banner error:", error);

    return res.status(500).json({
      message: "Failed to delete banner.",
    });
  }
};

module.exports = {
  getActiveBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
};