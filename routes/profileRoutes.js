const express = require("express");

const router = express.Router();

const {
  getProfile,
  getAllUsers,
  deleteUser,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress 
  } = require("../controllers/profileController");

const { verifyToken } = require("../middleware/authMiddleware");

// Profile
router.get("/", verifyToken, getProfile);
router.get("/all", verifyToken, getAllUsers);
router.delete("/:userId", verifyToken, deleteUser);
router.put("/", verifyToken, updateProfile);

// Addresses
router.get("/addresses", verifyToken, getAddresses);
router.post("/addresses", verifyToken, addAddress);
router.put("/addresses/:addressId", verifyToken, updateAddress);
router.delete("/addresses/:addressId", verifyToken, deleteAddress);
router.put("/addresses/:addressId/default", verifyToken,setDefaultAddress);

module.exports = router;