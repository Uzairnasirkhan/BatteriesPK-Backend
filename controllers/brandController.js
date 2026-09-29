const mongoose = require("mongoose");
const Brand = require("../models/brandModel");

const brandController = {
  // Get all active brands
  getBrands: async (req, res) => {
    try {
      const brands = await Brand.find({ isActive: true })
        .sort({ createdAt: -1 });

      return res.status(200).json({
        brands,
      });
    } catch (error) {
      console.error("Get brands error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Get single active brand
  getBrand: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid brand ID",
        });
      }

      const brand = await Brand.findOne({
        _id: id,
        isActive: true,
      });

      if (!brand) {
        return res.status(404).json({
          message: "Brand not found",
        });
      }

      return res.status(200).json({
        brand,
      });
    } catch (error) {
      console.error("Get brand error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Create brand - Admin only
  createBrand: async (req, res) => {
    try {
      const { name, description, logo } = req.body;

      if (!name) {
        return res.status(400).json({
          message: "Brand name is required",
        });
      }

      const existingBrand = await Brand.findOne({
        name: name.trim(),
      });

      if (existingBrand) {
        return res.status(409).json({
          message: "Brand already exists",
        });
      }

      const brand = await Brand.create({
        name: name.trim(),
        description,
        logo,
      });

      return res.status(201).json({
        message: "Brand created successfully",
        brand,
      });
    } catch (error) {
      console.error("Create brand error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          message: "Brand already exists",
        });
      }

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Update brand - Admin only
  updateBrand: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, logo, isActive } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid brand ID",
        });
      }

      const brand = await Brand.findById(id);

      if (!brand) {
        return res.status(404).json({
          message: "Brand not found",
        });
      }

      if (name !== undefined) {
        const existingBrand = await Brand.findOne({
          name: name.trim(),
          _id: { $ne: id },
        });

        if (existingBrand) {
          return res.status(409).json({
            message: "Brand with this name already exists",
          });
        }

        brand.name = name.trim();
      }

      if (description !== undefined) {
        brand.description = description;
      }

      if (logo !== undefined) {
        brand.logo = logo;
      }

      if (isActive !== undefined) {
        brand.isActive = isActive;
      }

      await brand.save();

      return res.status(200).json({
        message: "Brand updated successfully",
        brand,
      });
    } catch (error) {
      console.error("Update brand error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          message: "Brand with this name already exists",
        });
      }

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Delete brand - Admin only
  deleteBrand: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid brand ID",
        });
      }

      const brand = await Brand.findById(id);

      if (!brand) {
        return res.status(404).json({
          message: "Brand not found",
        });
      }

      await Brand.findByIdAndDelete(id);

      return res.status(200).json({
        message: "Brand deleted successfully",
      });
    } catch (error) {
      console.error("Delete brand error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },
};

module.exports = brandController;