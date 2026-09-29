const mongoose = require("mongoose");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Brand = require("../models/brandModel");

const productController = {
  // Get all active products
  getProducts: async (req, res) => {
    try {
      const products = await Product.find({ isActive: true })
        .populate("category", "name")
        .populate("brand", "name logo")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        products,
      });
    } catch (error) {
      console.error("Get products error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Get single active product
  getProduct: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid product ID",
        });
      }

      const product = await Product.findOne({
        _id: id,
        isActive: true,
      })
        .populate("category", "name")
        .populate("brand", "name logo");

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      return res.status(200).json({
        product,
      });
    } catch (error) {
      console.error("Get product error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Create product - Admin only
  createProduct: async (req, res) => {
    try {
      const {
        name,
        description,
        price,
        discountPrice,
        images,
        category,
        brand,
        stock,
        sku,
      } = req.body;

      // Required fields
      if (
        !name ||
        !description ||
        price === undefined ||
        !category ||
        !brand
      ) {
        return res.status(400).json({
          message:
            "Name, description, price, brand and category are required",
        });
      }

      // Validate category ID
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({
          message: "Invalid category ID",
        });
      }

      // Check category exists and is active
      const existingCategory = await Category.findOne({
        _id: category,
        isActive: true,
      });

      if (!existingCategory) {
        return res.status(404).json({
          message: "Category not found or inactive",
        });
      }

      // Validate brand ID
      if (!mongoose.Types.ObjectId.isValid(brand)) {
        return res.status(400).json({
          message: "Invalid brand ID",
        });
      }

      // Check brand exists and is active
      const existingBrand = await Brand.findOne({
        _id: brand,
        isActive: true,
      });

      if (!existingBrand) {
        return res.status(404).json({
          message: "Brand not found or inactive",
        });
      }

      // Validate price
      if (price < 0) {
        return res.status(400).json({
          message: "Price cannot be negative",
        });
      }

      // Validate discount price
      if (
        discountPrice !== undefined &&
        discountPrice !== null
      ) {
        if (discountPrice < 0) {
          return res.status(400).json({
            message: "Discount price cannot be negative",
          });
        }

        if (discountPrice > price) {
          return res.status(400).json({
            message:
              "Discount price cannot be greater than regular price",
          });
        }
      }

      // Check SKU
      if (sku) {
        const existingSku = await Product.findOne({
          sku: sku.trim(),
        });

        if (existingSku) {
          return res.status(409).json({
            message: "Product with this SKU already exists",
          });
        }
      }

      const product = await Product.create({
        name: name.trim(),
        description: description.trim(),
        price,
        discountPrice,
        images: images || [],
        category,
        brand,
        stock: stock ?? 0,
        sku: sku ? sku.trim() : undefined,
      });

      const populatedProduct = await Product.findById(product._id)
        .populate("category", "name")
        .populate("brand", "name logo");

      return res.status(201).json({
        message: "Product created successfully",
        product: populatedProduct,
      });
    } catch (error) {
      console.error("Create product error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          message: "Product with this SKU already exists",
        });
      }

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Update product - Admin only
  updateProduct: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid product ID",
        });
      }

      const {
        name,
        description,
        price,
        discountPrice,
        images,
        category,
        brand,
        stock,
        sku,
        isActive,
      } = req.body;

      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      // Validate category if being updated
      if (category !== undefined) {
        if (!mongoose.Types.ObjectId.isValid(category)) {
          return res.status(400).json({
            message: "Invalid category ID",
          });
        }

        const existingCategory = await Category.findOne({
          _id: category,
          isActive: true,
        });

        if (!existingCategory) {
          return res.status(404).json({
            message: "Category not found or inactive",
          });
        }

        product.category = category;
      }

      // Validate brand if being updated
      if (brand !== undefined) {
        if (!mongoose.Types.ObjectId.isValid(brand)) {
          return res.status(400).json({
            message: "Invalid brand ID",
          });
        }

        const existingBrand = await Brand.findOne({
          _id: brand,
          isActive: true,
        });

        if (!existingBrand) {
          return res.status(404).json({
            message: "Brand not found or inactive",
          });
        }

        product.brand = brand;
      }

      // Validate price
      if (price !== undefined) {
        if (price < 0) {
          return res.status(400).json({
            message: "Price cannot be negative",
          });
        }

        product.price = price;
      }

      // Validate discount price
      if (discountPrice !== undefined) {
        if (
          discountPrice !== null &&
          discountPrice < 0
        ) {
          return res.status(400).json({
            message: "Discount price cannot be negative",
          });
        }

        const currentPrice =
          price !== undefined ? price : product.price;

        if (
          discountPrice !== null &&
          discountPrice > currentPrice
        ) {
          return res.status(400).json({
            message:
              "Discount price cannot be greater than regular price",
          });
        }

        product.discountPrice = discountPrice;
      }

      // Check SKU if being updated
      if (sku !== undefined) {
        const trimmedSku = sku.trim();

        if (trimmedSku !== product.sku) {
          const existingSku = await Product.findOne({
            sku: trimmedSku,
            _id: { $ne: id },
          });

          if (existingSku) {
            return res.status(409).json({
              message: "Product with this SKU already exists",
            });
          }

          product.sku = trimmedSku;
        }
      }

      if (name !== undefined) {
        product.name = name.trim();
      }

      if (description !== undefined) {
        product.description = description.trim();
      }

      if (images !== undefined) {
        product.images = images;
      }

      if (stock !== undefined) {
        if (stock < 0) {
          return res.status(400).json({
            message: "Stock cannot be negative",
          });
        }

        product.stock = stock;
      }

      if (isActive !== undefined) {
        product.isActive = isActive;
      }

      await product.save();

      const populatedProduct = await Product.findById(product._id)
        .populate("category", "name image")
        .populate("brand", "name logo");

      return res.status(200).json({
        message: "Product updated successfully",
        product: populatedProduct,
      });
    } catch (error) {
      console.error("Update product error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          message: "Product with this SKU already exists",
        });
      }

      return res.status(500).json({
        message: "Server error",
      });
    }
  },

  // Delete product - Admin only
  deleteProduct: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid product ID",
        });
      }

      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      // Soft delete
      product.isActive = false;

      await product.save();

      return res.status(200).json({
        message: "Product deleted successfully",
      });
    } catch (error) {
      console.error("Delete product error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  },
};

module.exports = productController;