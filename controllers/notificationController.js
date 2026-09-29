const Notification = require("../models/notificationModel");

const notificationController = {
   getMyNotifications: async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const notifications = await Notification.find({
      user: userId,
    })
      .populate("order", "orderStatus totalAmount")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      notifications,
    });
  } catch (error) {
    console.error(
      "Get notifications error:",
      error
    );

    return res.status(500).json({
      message: "Server error while fetching notifications",
    });
  }
},

   markNotificationAsRead: async (req,res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;

    const notification =
      await Notification.findOneAndUpdate(
        {
          _id: id,
          user: userId,
        },
        {
          isRead: true,
        },
        {
          new: true,
        }
      );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error(
      "Mark notification read error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
},

   markAllNotificationsAsRead: async (req,res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    await Notification.updateMany(
      {
        user: userId,
        isRead: false,
      },
      {
        isRead: true,
      }
    );

    return res.status(200).json({
      message:
        "All notifications marked as read",
    });
  } catch (error) {
    console.error(
      "Mark all notifications read error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
},

  getUnreadNotificationCount: async (req, res) => {
    try {
      const userId =
        req.user?.userId || req.user?.id;

      const count =
        await Notification.countDocuments({
          user: userId,
          isRead: false,
        });

      return res.status(200).json({
        count,
      });
    } catch (error) {
      console.error(
        "Unread notification count error:",
        error
      );

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

};

module.exports = notificationController;