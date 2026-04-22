import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, 'Please provide a product name'],
      trim: true,
      minlength: [3, 'Product name must be at least 3 characters'],
      maxlength: [100, 'Product name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Please provide a category'],
      enum: ['vegetables', 'fruits', 'grains', 'dairy', 'meat', 'honey', 'spices', 'other'],
      index: true,
    },
    
    // Pricing Information
    price: {
      type: Number,
      required: [true, 'Please provide a price'],
      min: [0, 'Price cannot be negative'],
    },
    discountedPrice: {
      type: Number,
      min: [0, 'Discounted price cannot be negative'],
    },
    
    // Quantity & Unit
    quantity: {
      type: Number,
      required: [true, 'Please provide quantity'],
      min: [0, 'Quantity cannot be negative'],
    },
    unit: {
      type: String,
      enum: ['kg', 'g', 'l', 'ml', 'piece', 'dozen', 'box', 'crate'],
      required: [true, 'Please provide unit'],
    },
    minOrderQuantity: {
      type: Number,
      default: 1,
      min: [1, 'Minimum order quantity must be at least 1'],
    },
    
    // Media
    images: [
      {
        url: String,
        publicId: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    thumbnail: String,
    
    // Farmer Reference
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    // Ratings & Reviews
    ratings: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review',
      },
    ],
    
    // Product Metadata
    tags: [String],
    inStock: {
      type: Boolean,
      default: true,
      index: true,
    },
    
    // Dates
    harvestDate: Date,
    expiryDate: Date,
    
    // Certifications & Origin
    organicCertified: {
      type: Boolean,
      default: false,
    },
    origin: String,
    
    // Location (for filtering)
    location: {
      city: String,
      state: String,
      country: { type: String, default: 'India' },
      zipCode: String,
    },
    
    // Shipping
    shippingAvailable: {
      type: Boolean,
      default: true,
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    freeShippingAbove: {
      type: Number,
      default: 0,
    },
    
    // Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    
    // Additional
    description_en: String,
    description_hindi: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for frequently queried fields
productSchema.index({ farmer: 1 });
productSchema.index({ category: 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ createdAt: -1 });
productSchema.index({ 'location.city': 1 });
productSchema.index({ 'location.state': 1 });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1, inStock: 1 });
productSchema.index({ farmer: 1, isActive: 1 });

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function () {
  if (this.discountedPrice && this.price > this.discountedPrice) {
    return Math.round(((this.price - this.discountedPrice) / this.price) * 100);
  }
  return 0;
});

// Virtual for effective price (discounted or regular)
productSchema.virtual('effectivePrice').get(function () {
  return this.discountedPrice || this.price;
});

/**
 * Method to check if product is available for purchase
 */
productSchema.methods.isAvailable = function () {
  return this.inStock && this.quantity >= this.minOrderQuantity && this.isActive;
};

/**
 * Method to update stock after purchase
 */
productSchema.methods.updateStock = async function (purchasedQuantity) {
  if (purchasedQuantity > this.quantity) {
    throw new Error('Insufficient stock available');
  }
  
  this.quantity = Math.max(0, this.quantity - purchasedQuantity);
  this.inStock = this.quantity > 0;
  
  return this.save();
};

/**
 * Method to replenish stock (for farmers)
 */
productSchema.methods.addStock = async function (addQuantity) {
  this.quantity += addQuantity;
  this.inStock = this.quantity > 0;
  
  return this.save();
};

/**
 * Method to check if expired
 */
productSchema.methods.isExpired = function () {
  if (!this.expiryDate) {
    return false;
  }
  return new Date() > this.expiryDate;
};

/**
 * Method to get discounted price
 */
productSchema.methods.getFinalPrice = function () {
  if (this.discountedPrice && this.discountedPrice < this.price) {
    return this.discountedPrice;
  }
  return this.price;
};

/**
 * Method to update rating (called when review is added)
 */
productSchema.methods.updateRating = async function (newRating) {
  if (newRating < 0 || newRating > 5) {
    throw new Error('Rating must be between 0 and 5');
  }
  
  this.ratings = newRating;
  return this.save();
};

/**
 * Static method to get best sellers
 */
productSchema.statics.getBestSellers = async function (limit = 10) {
  return this.find({ isActive: true, inStock: true })
    .sort({ reviewCount: -1, ratings: -1 })
    .limit(limit)
    .populate('farmer', 'name email');
};

/**
 * Static method to get products by category
 */
productSchema.statics.getByCategory = async function (category, filters = {}) {
  const query = { category, isActive: true, inStock: true, ...filters };
  
  return this.find(query)
    .populate('farmer', 'name email phone location')
    .sort({ createdAt: -1 });
};

/**
 * Static method to search products
 */
productSchema.statics.searchProducts = async function (searchQuery, filters = {}) {
  const query = {
    $text: { $search: searchQuery },
    isActive: true,
    inStock: true,
    ...filters,
  };
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .populate('farmer', 'name email');
};

/**
 * Static method to filter by price range
 */
productSchema.statics.filterByPrice = async function (minPrice, maxPrice, filters = {}) {
  const query = {
    price: { $gte: minPrice, $lte: maxPrice },
    isActive: true,
    inStock: true,
    ...filters,
  };
  
  return this.find(query)
    .sort({ price: 1 })
    .populate('farmer', 'name email');
};

/**
 * Static method to filter by location
 */
productSchema.statics.filterByLocation = async function (city, state, filters = {}) {
  const query = {
    'location.city': { $regex: city, $options: 'i' },
    'location.state': { $regex: state, $options: 'i' },
    isActive: true,
    inStock: true,
    ...filters,
  };
  
  return this.find(query)
    .populate('farmer', 'name email')
    .sort({ createdAt: -1 });
};

const Product = mongoose.model('Product', productSchema);

export default Product;
