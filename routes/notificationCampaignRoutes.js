const express = require("express");

const {
  getCustomers,
  getCampaigns,
  getCampaignById,
  createCampaign,
} = require("../controllers/notificationCampaignController");

const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(verifyToken, authorizeRoles("admin"));

router.get("/customers", getCustomers);

router.get("/campaigns", getCampaigns);

router.get("/campaigns/:id", getCampaignById);

router.post("/campaigns", createCampaign);

module.exports = router;