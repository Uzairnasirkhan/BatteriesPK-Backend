const Category = require("../models/categoryModel");

const categoryController = {
  // Get all categories
  getCategories: async (req, res) => {
    try {
      const categories = await Category.find().sort({ createdAt: -1 });

      return res.status(200).json({
        categories,
      });
    } catch (error) {
      console.error("Get categories error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Get active categories
  getActiveCategories: async (req, res) => {
    try {
      const categories = await Category.find({
        isActive: true,
      }).sort({ name: 1 });

      return res.status(200).json({
        categories,
      });
    } catch (error) {
      console.error("Get active categories error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Get single category
  getCategoryById: async (req, res) => {
    try {
      const { id } = req.params;

      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json({
          message: "Category not found",
        });
      }

      return res.status(200).json({
        category,
      });
    } catch (error) {
      console.error("Get category error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Create category - Admin only
  createCategory: async (req, res) => {
    try {
      const {
        name,
        description,
      } = req.body;

      if (!name) {
        return res.status(400).json({
          message: "Category name is required",
        });
      }

      // Check if category already exists
      const existingCategory = await Category.findOne({
        name: name.trim(),
      });

      if (existingCategory) {
        return res.status(409).json({
          message: "Category already exists",
        });
      }

      const category = await Category.create({
        name,
        description,
      });

      return res.status(201).json({
        message: "Category created successfully",
        category,
      });
    } catch (error) {
      console.error("Create category error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Update category - Admin only
  updateCategory: async (req, res) => {
    try {
      const { id } = req.params;

      const {
        name,
        description,
        isActive,
      } = req.body;

      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json({
          message: "Category not found",
        });
      }

      // Check if new name is already used
      if (name && name.trim() !== category.name) {
        const existingCategory = await Category.findOne({
          name: name.trim(),
          _id: { $ne: id },
        });

        if (existingCategory) {
          return res.status(409).json({
            message: "Category with this name already exists",
          });
        }

        category.name = name.trim();
      }

      if (description !== undefined) {
        category.description = description;
      }

      if (isActive !== undefined) {
        category.isActive = isActive;
      }

      await category.save();

      return res.status(200).json({
        message: "Category updated successfully",
        category,
      });
    } catch (error) {
      console.error("Update category error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Delete category - Admin only
  deleteCategory: async (req, res) => {
    try {
      const { id } = req.params;

      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json({
          message: "Category not found",
        });
      }

      await category.deleteOne();

      return res.status(200).json({
        message: "Category deleted successfully",
      });
    } catch (error) {
      console.error("Delete category error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },
};

module.exports = categoryController;