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

// Admin: Create or update the main popup
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

    let popup = await Popup.findOne({ key: "main" });

    if (!popup) {
      popup = new Popup({ key: "main" });
    }

    const parseBoolean = (value, fallback) => {
      if (value === undefined || value === null || value === "") {
        return fallback;
      }

      return value === true || value === "true";
    };

    popup.enabled = parseBoolean(enabled, popup.enabled);
    popup.title = title ?? popup.title;
    popup.message = message ?? popup.message;
    popup.buttonText = buttonText ?? popup.buttonText;
    popup.buttonUrl = buttonUrl ?? popup.buttonUrl;

    if (startsAt !== undefined) {
      popup.startsAt = startsAt ? new Date(startsAt) : null;
    }

    if (endsAt !== undefined) {
      popup.endsAt = endsAt ? new Date(endsAt) : null;
    }

    if (
      popup.startsAt &&
      Number.isNaN(popup.startsAt.getTime())
    ) {
      return res.status(400).json({
        message: "Invalid popup start date.",
      });
    }

    if (
      popup.endsAt &&
      Number.isNaN(popup.endsAt.getTime())
    ) {
      return res.status(400).json({
        message: "Invalid popup end date.",
      });
    }

    if (
      popup.startsAt &&
      popup.endsAt &&
      popup.endsAt <= popup.startsAt
    ) {
      return res.status(400).json({
        message: "End date must be later than start date.",
      });
    }

    if (req.file) {
      const uploadResult = await uploadToCloudinary(
        req.file.buffer,
        "ecommerce/popups"
      );

      popup.imageUrl = uploadResult.secure_url;
    }

    // Increment the version only when the configuration changes.
    // The mobile app can use this to detect a new popup campaign.
    if (popup.isNew) {
      popup.version = 1;
    } else {
      popup.version = (popup.version || 1) + 1;
    }

    await popup.save();

    return res.status(200).json({
      message: "Popup configuration saved successfully.",
      popup,
    });
  } catch (error) {
    console.error("Update popup error:", error);

    return res.status(500).json({
      message: "Failed to save popup configuration.",
    });
  }
};

module.exports = {
  getActivePopup,
  getAdminPopup,
  updatePopup,
};