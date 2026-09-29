const express = require("express");

const {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount
} = require("../controllers/notificationController");

const {verifyToken} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/",
  verifyToken,
  getMyNotifications
);

router.get(
  "/unread-count",
  verifyToken,
  getUnreadNotificationCount
);

router.put(
  "/:id/read",
  verifyToken,
  markNotificationAsRead
);

router.put(
  "/read-all",
  verifyToken,
  markAllNotificationsAsRead
);

module.exports = router;