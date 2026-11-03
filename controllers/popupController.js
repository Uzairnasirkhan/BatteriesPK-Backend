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
      imageUrl,
      buttonText,
      buttonUrl,
      startsAt,
      endsAt,
    } = req.body;

    // Get the existing popup configuration
    let popup = await Popup.findOne();

    if (!popup) {
      // Create the popup for the first time
      popup = new Popup({
        enabled,
        title,
        message,
        imageUrl,
        buttonText,
        buttonUrl,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        version: 1,
      });

      await popup.save();

      return res.status(200).json({
        message: "Popup created successfully",
        popup,
      });
    }

    // Compare dates safely
    const normalizeDate = (date) => {
      if (!date) return null;

      const parsedDate = new Date(date);

      return isNaN(parsedDate.getTime())
        ? null
        : parsedDate.toISOString();
    };

    // Check whether any popup setting has changed
    const hasChanged =
      popup.enabled !== (enabled ?? popup.enabled) ||
      popup.title !== (title ?? popup.title) ||
      popup.message !== (message ?? popup.message) ||
      popup.imageUrl !== (imageUrl ?? popup.imageUrl) ||
      popup.buttonText !== (buttonText ?? popup.buttonText) ||
      popup.buttonUrl !== (buttonUrl ?? popup.buttonUrl) ||
      normalizeDate(popup.startsAt) !==
        normalizeDate(startsAt !== undefined ? startsAt : popup.startsAt) ||
      normalizeDate(popup.endsAt) !==
        normalizeDate(endsAt !== undefined ? endsAt : popup.endsAt);

    // Update popup fields
    if (enabled !== undefined) popup.enabled = enabled;
    if (title !== undefined) popup.title = title;
    if (message !== undefined) popup.message = message;
    if (imageUrl !== undefined) popup.imageUrl = imageUrl;
    if (buttonText !== undefined) popup.buttonText = buttonText;
    if (buttonUrl !== undefined) popup.buttonUrl = buttonUrl;

    if (startsAt !== undefined) {
      popup.startsAt = startsAt || null;
    }

    if (endsAt !== undefined) {
      popup.endsAt = endsAt || null;
    }

    // Increment version only when configuration changes
    if (hasChanged) {
      popup.version = (popup.version || 0) + 1;
    }

    await popup.save();

    return res.status(200).json({
      message: hasChanged
        ? "Popup updated successfully. Version incremented."
        : "Popup settings saved. No changes detected.",
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