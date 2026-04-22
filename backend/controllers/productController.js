import mongoose from 'mongoose';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Wishlist from '../models/Wishlist.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * ═══════════════════════════════════════════════════════════════
 * CONSUMER FEATURES - Browse, Search, Filter
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Get all products (Consumer - Browse all)
 */
export const getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, category, search, minPrice, maxPrice, city, state } = req.query;

    const skip = (page - 1) * limit;
    let query = { isActive: true, inStock: true };

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Filter by location
    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }
    if (state) {
      query['location.state'] = { $regex: state, $options: 'i' };
    }

    // Search by name or description
    if (search) {
      query.$text = { $search: search };
    }

    const products = await Product.find(query)
      .populate('farmer', 'name email phone location')
      .limit(limit * 1)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single product details (Consumer - View product)
 */
export const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate('farmer', 'name email phone address location ratings')
      .populate('reviews');

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    if (!product.isActive) {
      throw new AppError('This product is no longer available', 410);
    }

    res.status(200).json({
      success: true,
      message: 'Product retrieved successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search products by name/description (Consumer)
 */
export const searchProducts = async (req, res, next) => {
  try {
    const { query, page = 1, limit = 12 } = req.body;

    if (!query || query.trim().length === 0) {
      throw new AppError('Search query cannot be empty', 400);
    }

    const skip = (page - 1) * limit;

    const products = await Product.find(
      { $text: { $search: query }, isActive: true, inStock: true },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .skip(skip)
      .populate('farmer', 'name email');

    const total = await Product.countDocuments({
      $text: { $search: query },
      isActive: true,
      inStock: true,
    });

    res.status(200).json({
      success: true,
      message: `Found ${total} products matching your search`,
      data: products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Filter products by price range (Consumer)
 */
export const filterByPrice = async (req, res, next) => {
  try {
    const { minPrice, maxPrice, category, page = 1, limit = 12 } = req.query;

    if (!minPrice || !maxPrice) {
      throw new AppError('Please provide minPrice and maxPrice', 400);
    }

    const skip = (page - 1) * limit;
    const query = {
      price: {
        $gte: parseFloat(minPrice),
        $lte: parseFloat(maxPrice),
      },
      isActive: true,
      inStock: true,
    };

    if (category) {
      query.category = category;
    }

    const products = await Product.find(query)
      .limit(limit)
      .skip(skip)
      .sort({ price: 1 })
      .populate('farmer', 'name email');

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Products filtered by price',
      data: products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Filter products by location (Consumer)
 */
export const filterByLocation = async (req, res, next) => {
  try {
    const { city, state, page = 1, limit = 12 } = req.query;

    if (!city || !state) {
      throw new AppError('Please provide city and state', 400);
    }

    const skip = (page - 1) * limit;
    const query = {
      'location.city': { $regex: city, $options: 'i' },
      'location.state': { $regex: state, $options: 'i' },
      isActive: true,
      inStock: true,
    };

    const products = await Product.find(query)
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 })
      .populate('farmer', 'name email location');

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      message: `Products in ${city}, ${state}`,
      data: products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get products by category (Consumer)
 */
export const getByCategory = async (req, res, next) => {
  try {
    const { category, page = 1, limit = 12 } = req.query;

    if (!category) {
      throw new AppError('Please provide a category', 400);
    }

    const validCategories = ['vegetables', 'fruits', 'grains', 'dairy', 'meat', 'honey', 'spices', 'other'];
    if (!validCategories.includes(category)) {
      throw new AppError(`Invalid category. Choose from: ${validCategories.join(', ')}`, 400);
    }

    const skip = (page - 1) * limit;

    const products = await Product.find({
      category,
      isActive: true,
      inStock: true,
    })
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 })
      .populate('farmer', 'name email');

    const total = await Product.countDocuments({
      category,
      isActive: true,
      inStock: true,
    });

    res.status(200).json({
      success: true,
      message: `Retrieved ${category} products`,
      data: products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get best selling products (Consumer)
 */
export const getBestSellers = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const products = await Product.find({ isActive: true, inStock: true })
      .sort({ reviewCount: -1, ratings: -1 })
      .limit(parseInt(limit))
      .populate('farmer', 'name email');

    res.status(200).json({
      success: true,
      message: 'Best selling products',
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get organic/certified products (Consumer)
 */
export const getOrganicProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 12 } = req.query;

    const skip = (page - 1) * limit;

    const products = await Product.find({
      organicCertified: true,
      isActive: true,
      inStock: true,
    })
      .limit(limit)
      .skip(skip)
      .sort({ ratings: -1 })
      .populate('farmer', 'name email');

    const total = await Product.countDocuments({
      organicCertified: true,
      isActive: true,
      inStock: true,
    });

    res.status(200).json({
      success: true,
      message: 'Organic certified products',
      data: products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ═══════════════════════════════════════════════════════════════
 * FARMER FEATURES - Create, Edit, Delete, Update Quantity
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Create new product (Farmer only)
 */
export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      description,
      category,
      price,
      quantity,
      unit,
      discountedPrice,
      minOrderQuantity,
      tags,
      organicCertified,
      origin,
      harvestDate,
      expiryDate,
      shippingAvailable,
      shippingCost,
      location,
    } = req.body;

    // Validate required fields
    if (!name || !description || !category || !price || !quantity || !unit) {
      throw new AppError('Please provide all required fields', 400);
    }

    // Create product object
    const productData = {
      name,
      description,
      category,
      price,
      quantity,
      unit,
      farmer: req.user.id,
    };

    // Add optional fields
    if (discountedPrice) productData.discountedPrice = discountedPrice;
    if (minOrderQuantity) productData.minOrderQuantity = minOrderQuantity;
    if (tags) productData.tags = tags;
    if (organicCertified !== undefined) productData.organicCertified = organicCertified;
    if (origin) productData.origin = origin;
    if (harvestDate) productData.harvestDate = harvestDate;
    if (expiryDate) productData.expiryDate = expiryDate;
    if (shippingAvailable !== undefined) productData.shippingAvailable = shippingAvailable;
    if (shippingCost) productData.shippingCost = shippingCost;
    
    // Add location
    if (location) {
      const farmer = await User.findById(req.user.id);
      productData.location = location || farmer.address;
    }

    const product = await Product.create(productData);

    // Populate farmer details
    await product.populate('farmer', 'name email phone');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get farmer's products (Farmer)
 */
export const getFarmerProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, status } = req.query;

    const skip = (page - 1) * limit;
    const query = { farmer: req.user.id };

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by status (active/inactive/all)
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const products = await Product.find(query)
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Your products retrieved successfully',
      data: products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product (Farmer only - can edit details)
 */
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      discountedPrice,
      category,
      unit,
      minOrderQuantity,
      tags,
      organicCertified,
      origin,
      harvestDate,
      expiryDate,
      shippingAvailable,
      shippingCost,
      location,
      isActive,
    } = req.body;

    // Find product
    const product = await Product.findById(id);

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Check ownership
    if (product.farmer.toString() !== req.user.id) {
      throw new AppError('You are not authorized to update this product', 403);
    }

    // Update allowed fields only
    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = price;
    if (discountedPrice !== undefined) product.discountedPrice = discountedPrice;
    if (category) product.category = category;
    if (unit) product.unit = unit;
    if (minOrderQuantity) product.minOrderQuantity = minOrderQuantity;
    if (tags) product.tags = tags;
    if (organicCertified !== undefined) product.organicCertified = organicCertified;
    if (origin) product.origin = origin;
    if (harvestDate) product.harvestDate = harvestDate;
    if (expiryDate) product.expiryDate = expiryDate;
    if (shippingAvailable !== undefined) product.shippingAvailable = shippingAvailable;
    if (shippingCost) product.shippingCost = shippingCost;
    if (location) product.location = location;
    if (isActive !== undefined) product.isActive = isActive;

    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product quantity (Farmer - Restock)
 */
export const updateQuantity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, action } = req.body;

    if (!quantity || quantity <= 0) {
      throw new AppError('Please provide a valid quantity', 400);
    }

    if (!action || !['add', 'set'].includes(action)) {
      throw new AppError('Action must be "add" (restock) or "set" (replace)', 400);
    }

    const product = await Product.findById(id);

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Check ownership
    if (product.farmer.toString() !== req.user.id) {
      throw new AppError('You are not authorized to update this product', 403);
    }

    // Update quantity
    if (action === 'add') {
      // Add to existing quantity (restock)
      product.quantity += quantity;
    } else if (action === 'set') {
      // Set quantity to specific value
      product.quantity = quantity;
    }

    // Update stock status
    product.inStock = product.quantity > 0;

    await product.save();

    res.status(200).json({
      success: true,
      message: `Product quantity ${action === 'add' ? 'restocked' : 'updated'} successfully`,
      data: {
        productId: product._id,
        name: product.name,
        quantity: product.quantity,
        inStock: product.inStock,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete product (Farmer only)
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Check ownership
    if (product.farmer.toString() !== req.user.id) {
      throw new AppError('You are not authorized to delete this product', 403);
    }

    // Soft delete (mark as inactive instead of removing)
    product.isActive = false;
    product.inStock = false;

    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: {
        productId: product._id,
        message: 'Product has been removed from listings',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle product active status (Farmer)
 */
export const toggleProductStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      throw new AppError('Please provide isActive status', 400);
    }

    const product = await Product.findById(id);

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Check ownership
    if (product.farmer.toString() !== req.user.id) {
      throw new AppError('You are not authorized to update this product', 403);
    }

    product.isActive = isActive;

    await product.save();

    res.status(200).json({
      success: true,
      message: `Product ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        productId: product._id,
        name: product.name,
        isActive: product.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get farmer profile with products (Consumer viewing farmer)
 */
export const getFarmerProfile = async (req, res, next) => {
  try {
    const { farmerId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const farmer = await User.findById(farmerId).select('-password -resetPasswordToken');

    if (!farmer || farmer.role !== 'farmer') {
      throw new AppError('Farmer not found', 404);
    }

    // Get farmer's products
    const products = await Product.find({ farmer: farmerId, isActive: true, inStock: true })
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const totalProducts = await Product.countDocuments({
      farmer: farmerId,
      isActive: true,
      inStock: true,
    });

    // Get farmer stats
    const totalListings = await Product.countDocuments({ farmer: farmerId });
    const avgRating = await Product.aggregate([
      { $match: { farmer: mongoose.Types.ObjectId(farmerId) } },
      { $group: { _id: null, avgRating: { $avg: '$ratings' } } },
    ]);

    res.status(200).json({
      success: true,
      message: 'Farmer profile retrieved successfully',
      data: {
        farmer,
        products,
        stats: {
          totalListings,
          activeListings: totalProducts,
          averageRating: avgRating[0]?.avgRating || 0,
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalProducts / limit),
          totalItems: totalProducts,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's wishlist/favorites
 */
export const getWishlist = async (req, res, next) => {
  try {
    const consumerId = req.user.id;

    const wishlist = await Wishlist.getConsumerWishlist(consumerId);

    res.status(200).json({
      success: true,
      message: 'Wishlist retrieved successfully',
      data: wishlist.map(item => item.product),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle product in wishlist/favorites
 */
export const toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const consumerId = req.user.id;

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const result = await Wishlist.toggleWishlist(consumerId, productId);

    res.status(200).json({
      success: true,
      message: result.added ? 'Added to favorites' : 'Removed from favorites',
      data: { added: result.added },
    });
  } catch (error) {
    next(error);
  }
};
