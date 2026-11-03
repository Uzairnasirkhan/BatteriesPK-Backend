require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const brandRoutes = require("./routes/brandRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const deviceTokenRoutes = require("./routes/deviceTokenRoutes");
const notificationCampaignRoutes = require("./routes/notificationCampaignRoutes");
const bannerRoutes = require("./routes/bannerRoutes");
const popupRoutes = require("./routes/popupRoutes");

const connectDB = require("./config/dbConfig");

const app = express();

connectDB();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/device-tokens", deviceTokenRoutes);
app.use("/api/admin/notifications", notificationCampaignRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/popup", popupRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to Batteriespk Store API");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;