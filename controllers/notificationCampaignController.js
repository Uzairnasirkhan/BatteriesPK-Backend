const mongoose = require("mongoose");

const User = require("../models/userModel");
const DeviceToken = require("../models/deviceTokenModel");
const Notification = require("../models/notificationModel");
const NotificationCampaign = require("../models/notificationCampaignModel");

const {
  sendPushToDevices,
} = require("../utils/pushNotification");

const notificationCampaignController = {
  /**
   * Search customers by name or email.
   *
   * Only customers with an active registered device and enabled
   * notifications are eligible for promotional campaigns.
   */
  getCustomers: async (req, res) => {
    try {
      const search = String(req.query.search || "").trim();

      const query = {
        role: "customer",
      };

      if (search) {
        const escapedSearch = search.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

        query.$or = [
          { fullName: { $regex: escapedSearch, $options: "i" } },
          { email: { $regex: escapedSearch, $options: "i" } },
        ];
      }

      const customers = await User.find(query)
        .select("fullName email")
        .sort({ fullName: 1 })
        .limit(30)
        .lean();

      const customerIds = customers.map((customer) => customer._id);

      const eligibleUserIds = await DeviceToken.distinct("user", {
        user: { $in: customerIds },
        isActive: true,
        notificationsEnabled: true,
      });

      const eligibleSet = new Set(
        eligibleUserIds.map((id) => id.toString())
      );

      return res.status(200).json({
        customers: customers.map((customer) => ({
          ...customer,
          isEligible: eligibleSet.has(customer._id.toString()),
        })),
      });
    } catch (error) {
      console.error("Get campaign customers error:", error);

      return res.status(500).json({
        message: "Failed to fetch customers",
      });
    }
  },

  /**
   * Get campaign history.
   */
  getCampaigns: async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.min(
        Math.max(parseInt(req.query.limit, 10) || 10, 1),
        50
      );

      const skip = (page - 1) * limit;

      const [campaigns, total] = await Promise.all([
        NotificationCampaign.find()
          .populate("sentBy", "fullName email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        NotificationCampaign.countDocuments(),
      ]);

      return res.status(200).json({
        campaigns,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Get campaigns error:", error);

      return res.status(500).json({
        message: "Failed to fetch campaign history",
      });
    }
  },

  /**
   * Get one campaign and its recipient information.
   */
  getCampaignById: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid campaign ID",
        });
      }

      const campaign = await NotificationCampaign.findById(id)
        .populate("sentBy", "fullName email")
        .populate("recipientIds", "fullName email")
        .lean();

      if (!campaign) {
        return res.status(404).json({
          message: "Campaign not found",
        });
      }

      return res.status(200).json({
        campaign,
      });
    } catch (error) {
      console.error("Get campaign details error:", error);

      return res.status(500).json({
        message: "Failed to fetch campaign details",
      });
    }
  },

  /**
   * Create and synchronously send a campaign.
   */
  createCampaign: async (req, res) => {
    let campaign;

    try {
      const {
        title,
        message,
        type = "promotion",
        audience,
        recipientIds = [],
        data = {},
      } = req.body;

      const cleanTitle = String(title || "").trim();
      const cleanMessage = String(message || "").trim();

      if (!cleanTitle || !cleanMessage) {
        return res.status(400).json({
          message: "Campaign title and message are required",
        });
      }

      if (cleanTitle.length > 100) {
        return res.status(400).json({
          message: "Campaign title cannot exceed 100 characters",
        });
      }

      if (cleanMessage.length > 500) {
        return res.status(400).json({
          message: "Campaign message cannot exceed 500 characters",
        });
      }

      if (!["promotion", "product", "general"].includes(type)) {
        return res.status(400).json({
          message: "Invalid notification type",
        });
      }

      if (!["all", "selected"].includes(audience)) {
        return res.status(400).json({
          message: "Invalid campaign audience",
        });
      }

      if (!data || typeof data !== "object" || Array.isArray(data)) {
        return res.status(400).json({
          message: "Campaign data must be an object",
        });
      }

      let selectedIds = [];

      if (audience === "selected") {
        if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
          return res.status(400).json({
            message: "Select at least one customer",
          });
        }

        if (
          recipientIds.some(
            (id) => !mongoose.isValidObjectId(id)
          )
        ) {
          return res.status(400).json({
            message: "One or more customer IDs are invalid",
          });
        }

        selectedIds = [
          ...new Set(recipientIds.map((id) => id.toString())),
        ];
      }

      // All customers are eligible only when they have a registered,
      // active device and have notifications enabled.
      const deviceFilter = {
        isActive: true,
        notificationsEnabled: true,
      };

      if (audience === "selected") {
        const validCustomers = await User.find({
          _id: { $in: selectedIds },
          role: "customer",
        }).select("_id");

        const validCustomerIds = validCustomers.map(
          (customer) => customer._id
        );

        deviceFilter.user = { $in: validCustomerIds };
      } else {
        const customers = await User.find({
          role: "customer",
        }).select("_id");

        deviceFilter.user = {
          $in: customers.map((customer) => customer._id),
        };
      }

      const devices = await DeviceToken.find(deviceFilter).lean();

      // A user may have multiple devices. Store each recipient only once.
      const uniqueRecipientIds = [
        ...new Set(devices.map((device) => device.user.toString())),
      ];

      if (!uniqueRecipientIds.length || !devices.length) {
        return res.status(400).json({
          message: "No eligible customers or registered devices found",
        });
      }

      const campaignData = {
        ...data,
        campaignId: "pending",
        type,
      };

      campaign = await NotificationCampaign.create({
        title: cleanTitle,
        message: cleanMessage,
        type,
        audience,
        recipientIds: uniqueRecipientIds,
        recipientCount: uniqueRecipientIds.length,
        deviceCount: devices.length,
        status: "sending",
        data,
        sentBy: req.user.userId,
      });

      campaignData.campaignId = campaign._id.toString();

      // Save persistent notifications for the recipients.
      const notificationDocuments = uniqueRecipientIds.map((userId) => ({
        user: userId,
        title: cleanTitle,
        message: cleanMessage,
        type,
        data: campaignData,
        isRead: false,
      }));

      await Notification.insertMany(notificationDocuments, {
        ordered: false,
      });

      // Send one push per eligible device, not one per customer.
      const pushResult = await sendPushToDevices({
        devices,
        title: cleanTitle,
        message: cleanMessage,
        data: campaignData,
      });

      let status = "sent";

      if (pushResult.failedCount > 0 && pushResult.acceptedCount > 0) {
        status = "partial";
      } else if (pushResult.acceptedCount === 0) {
        status = "failed";
      }

      campaign.acceptedCount = pushResult.acceptedCount;
      campaign.failedCount = pushResult.failedCount;
      campaign.invalidTokenCount = pushResult.invalidTokenCount;
      campaign.status = status;
      campaign.sentAt = new Date();

      await campaign.save();

      return res.status(201).json({
        message:
          status === "failed"
            ? "Campaign saved, but no push notifications were accepted"
            : status === "partial"
              ? "Campaign sent with some failed submissions"
              : "Campaign submitted successfully",

        campaign: {
          _id: campaign._id,
          title: campaign.title,
          message: campaign.message,
          type: campaign.type,
          audience: campaign.audience,
          recipientCount: campaign.recipientCount,
          deviceCount: campaign.deviceCount,
          acceptedCount: campaign.acceptedCount,
          failedCount: campaign.failedCount,
          invalidTokenCount: campaign.invalidTokenCount,
          status: campaign.status,
          sentAt: campaign.sentAt,
        },
      });
    } catch (error) {
      console.error("Create campaign error:", error);

      if (campaign) {
        try {
          campaign.status = "failed";
          campaign.sentAt = new Date();
          await campaign.save();
        } catch (saveError) {
          console.error("Failed to update campaign status:", saveError);
        }
      }

      return res.status(500).json({
        message: "Failed to create or send campaign",
      });
    }
  },
};

module.exports = notificationCampaignController;