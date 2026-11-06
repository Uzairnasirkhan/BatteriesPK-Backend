const Popup = require("../models/popupModel");
const uploadToCloudinary = require("../utils/cloudinaryUpload");

// Public: Get the popup if it is currently eligible to display
const getActivePopup = async (req, res) => {
  try {
    const popup = await Popup.findOne({ key: "main" }).lean();

    if (!popup || !popup.enabled) {
      return res.status(200).json({ popup: null });
    }

    const now = new Date();

    if (popup.startsAt && now < new Date(popup.startsAt)) {
      return res.status(200).json({ popup: null });
    }

    if (popup.endsAt && now > new Date(popup.endsAt)) {
      return res.status(200).json({ popup: null });
    }

    return res.status(200).json({ popup });
  } catch (error) {
    console.error("Get active popup error:", error);

    return res.status(500).json({
      message: "Failed to fetch popup.",
    });
  }
};

// Admin: Get the complete popup configuration
const getAdminPopup = async (req, res) => {
  try {
    const popup = await Popup.findOne({ key: "main" }).lean();

    return res.status(200).json({
      popup,
    });
  } catch (error) {
    console.error("Get admin popup error:", error);

    return res.status(500).json({
      message: "Failed to fetch popup configuration.",
    });
  }
};

const updatePopup = async (req, res) => {
  try {
    const {
      enabled,
      title,
      message,
      buttonText,
      buttonUrl,
      startsAt,
      endsAt,
    } = req.body;

    // Find the existing main popup
    let popup = await Popup.findOne({ key: "main" });

    const isNewPopup = !popup;

    // Create the popup if it doesn't exist
    if (isNewPopup) {
      popup = new Popup({
        key: "main",
        version: 1,
      });
    }

    // Upload new image to Cloudinary if provided
    let newImageUrl;

    if (req.file) {
      const uploadedImage = await uploadToCloudinary(
        req.file.buffer,
        "batteriespk/popups"
      );

      newImageUrl = uploadedImage.secure_url;
    }

    // Normalize dates for accurate comparison
    const normalizeDate = (date) => {
      if (!date) return null;

      const parsedDate = new Date(date);

      if (Number.isNaN(parsedDate.getTime())) {
        throw new Error("Invalid popup date provided.");
      }

      return parsedDate.toISOString();
    };

    const normalizedStartsAt =
      startsAt !== undefined
        ? normalizeDate(startsAt)
        : undefined;

    const normalizedEndsAt =
      endsAt !== undefined
        ? normalizeDate(endsAt)
        : undefined;

    // Validate date range
    if (
      normalizedStartsAt &&
      normalizedEndsAt &&
      new Date(normalizedStartsAt) > new Date(normalizedEndsAt)
    ) {
      return res.status(400).json({
        message: "End date cannot be earlier than start date.",
      });
    }

    // Normalize enabled value from FormData
    const normalizedEnabled =
      enabled !== undefined
        ? enabled === "true" || enabled === true
        : undefined;

    // Check whether any popup configuration has changed
    const hasChanged =
      (normalizedEnabled !== undefined &&
        popup.enabled !== normalizedEnabled) ||

      (title !== undefined &&
        popup.title !== title) ||

      (message !== undefined &&
        popup.message !== message) ||

      (newImageUrl !== undefined &&
        popup.imageUrl !== newImageUrl) ||

      (buttonText !== undefined &&
        popup.buttonText !== buttonText) ||

      (buttonUrl !== undefined &&
        popup.buttonUrl !== buttonUrl) ||

      (normalizedStartsAt !== undefined &&
        normalizeDate(popup.startsAt) !== normalizedStartsAt) ||

      (normalizedEndsAt !== undefined &&
        normalizeDate(popup.endsAt) !== normalizedEndsAt);

    // Update popup fields
    if (normalizedEnabled !== undefined) {
      popup.enabled = normalizedEnabled;
    }

    if (title !== undefined) {
      popup.title = title;
    }

    if (message !== undefined) {
      popup.message = message;
    }

    if (buttonText !== undefined) {
      popup.buttonText = buttonText;
    }

    if (buttonUrl !== undefined) {
      popup.buttonUrl = buttonUrl;
    }

    // Update image only if a new image was uploaded
    if (newImageUrl) {
      popup.imageUrl = newImageUrl;
    }

    if (normalizedStartsAt !== undefined) {
      popup.startsAt = normalizedStartsAt;
    }

    if (normalizedEndsAt !== undefined) {
      popup.endsAt = normalizedEndsAt;
    }

    // Increment version only when an existing popup changes
    if (hasChanged && !isNewPopup) {
      popup.version = (popup.version || 0) + 1;
    }

    // Save popup configuration
    await popup.save();

    return res.status(200).json({
      message: "Popup updated successfully",
      popup,
    });

  } catch (error) {
    console.error("Update popup error:", error);

    return res.status(500).json({
      message: "Failed to update popup",
      error: error.message,
    });
  }
};




module.exports = {
  getActivePopup,
  getAdminPopup,
  updatePopup,
};