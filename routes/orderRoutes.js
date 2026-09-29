const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { createOrder, getMyOrders, getMyOrder, cancelOrder, getAllOrders, getOrder, updateOrderStatus, updatePaymentStatus } = require("../controllers/orderController");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

// Customer routes
router.post("/", verifyToken, upload.single("paymentProof"), createOrder);

router.get("/my-orders", verifyToken, getMyOrders);

router.get("/my-orders/:id", verifyToken, getMyOrder);

router.put(
  "/my-orders/:id/cancel",
  verifyToken,
  cancelOrder
);

// Admin routes
router.get(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  getAllOrders
);

router.get(
  "/admin/:id",
  verifyToken,
  authorizeRoles("admin"),
  getOrder
);

router.put(
  "/admin/:id/status",
  verifyToken,
  authorizeRoles("admin"),
  updateOrderStatus
);

router.put(
  "/admin/:id/payment-status",
  verifyToken,
  authorizeRoles("admin"),
  updatePaymentStatus
);

module.exports = router;