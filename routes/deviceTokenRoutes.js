const express = require("express");
const router = express.Router();
const {registerDevice, unregisterDevice, updateNotificationPreference, updateMarketingPreference} = require("../controllers/deviceTokenController");
const { verifyToken } = require("../middleware/authMiddleware");


router.post("/register", verifyToken, registerDevice);

router.post("/unregister", verifyToken, unregisterDevice);

router.put(
  "/notification-preference",
  verifyToken,
  updateNotificationPreference
);

router.put(
  "/marketing-preference",
  verifyToken,
  updateMarketingPreference
);

module.exports = router;