import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema(
  {
    // Consumer Reference
    consumer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Cart must belong to a consumer'],
      unique: true, // One cart per consumer
      index: true,
    },

    // Cart Items
    items: [
      {
        // Product Reference
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: [true, 'Product ID required for cart item'],
        },

        // Farmer Reference (for ordering)
        farmer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },

        // Quantity
        quantity: {
          type: Number,
          required: [true, 'Quantity required'],
          min: [1, 'Quantity must be at least 1'],
          default: 1,
        },

        // Price Information (snapshot at time of adding to cart)
        price: {
          type: Number,
          required: [true, 'Price required'],
          min: [0, 'Price cannot be negative'],
        },

        discount: {
          type: Number,
          default: 0,
          min: 0,
        },

        // Final price per unit (price or discountedPrice)
        finalPrice: {
          type: Number,
          required: true,
        },

        // Unit for display
        unit: {
          type: String,
          required: true,
          enum: ['kg', 'g', 'l', 'ml', 'piece', 'dozen', 'box', 'crate'],
        },

        // Product details snapshot
        productName: String,
        productImage: String,

        // Item total (finalPrice * quantity)
        itemTotal: {
          type: Number,
          default: 0,
        },

        // Timestamps for this item
        addedAt: {
          type: Date,
          default: Date.now,
        },

        // Validation - Check if item is still available
        isAvailable: {
          type: Boolean,
          default: true,
        },

        availabilityReason: String, // e.g., "Out of stock", "Product removed"
      },
    ],

    // Cart Totals
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Shipping (if applicable)
    shippingCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Taxes
    taxes: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Final Grand Total
    total: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Coupon/Promo Code (if applied)
    coupon: {
      code: String,
      discountAmount: { type: Number, default: 0 },
      discountPercentage: { type: Number, default: 0 },
    },

    // Notes
    notes: String,

    // Status
    isEmpty: {
      type: Boolean,
      default: true,
    },

    // Expiry (for abandoned carts)
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      index: { expireAfterSeconds: 0 }, // TTL index for auto-deletion
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
cartSchema.index({ consumer: 1 });
cartSchema.index({ 'items.product': 1 });
cartSchema.index({ 'items.farmer': 1 });
cartSchema.index({ createdAt: -1 });
cartSchema.index({ expiresAt: 1 });

/**
 * Virtual: Item count
 */
cartSchema.virtual('itemCount').get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

/**
 * Virtual: Unique product count
 */
cartSchema.virtual('uniqueItemCount').get(function () {
  return this.items.length;
});

/**
 * Virtual: Grouped by farmer
 */
cartSchema.virtual('groupedByFarmer').get(function () {
  const grouped = {};
  this.items.forEach((item) => {
    const farmerId = item.farmer.toString();
    if (!grouped[farmerId]) {
      grouped[farmerId] = {
        farmer: item.farmer,
        items: [],
        subtotal: 0,
      };
    }
    grouped[farmerId].items.push(item);
    grouped[farmerId].subtotal += item.itemTotal || 0;
  });
  return Object.values(grouped);
});

/**
 * Method: Add item to cart
 */
cartSchema.methods.addItem = async function (productId, farmerId, quantity, price, discountedPrice, unit, productName, productImage) {
  // Check if item already exists
  const existingItem = this.items.find((item) => item.product.toString() === productId.toString());

  if (existingItem) {
    // Update quantity
    existingItem.quantity += quantity;
  } else {
    // Add new item
    this.items.push({
      product: productId,
      farmer: farmerId,
      quantity,
      price,
      discount: price - (discountedPrice || price),
      finalPrice: discountedPrice || price,
      unit,
      productName,
      productImage,
      itemTotal: (discountedPrice || price) * quantity,
      isAvailable: true,
    });
  }

  // Recalculate totals
  this.calculateTotals();

  return this.save();
};

/**
 * Method: Remove item from cart
 */
cartSchema.methods.removeItem = async function (productId) {
  this.items = this.items.filter((item) => item.product.toString() !== productId.toString());

  // Recalculate totals
  this.calculateTotals();

  return this.save();
};

/**
 * Method: Update item quantity
 */
cartSchema.methods.updateItemQuantity = async function (productId, newQuantity) {
  if (newQuantity <= 0) {
    // Remove item if quantity is 0 or less
    return this.removeItem(productId);
  }

  const item = this.items.find((item) => item.product.toString() === productId.toString());

  if (!item) {
    throw new Error('Item not found in cart');
  }

  item.quantity = newQuantity;
  item.itemTotal = item.finalPrice * newQuantity;

  // Recalculate totals
  this.calculateTotals();

  return this.save();
};

/**
 * Method: Clear cart
 */
cartSchema.methods.clearCart = async function () {
  this.items = [];
  this.isEmpty = true;
  this.subtotal = 0;
  this.totalDiscount = 0;
  this.total = 0;
  this.coupon = {};

  return this.save();
};

/**
 * Method: Calculate all totals
 */
cartSchema.methods.calculateTotals = function () {
  // Recalculate each item total
  this.items.forEach((item) => {
    item.itemTotal = item.finalPrice * item.quantity;
  });

  // Calculate subtotal
  this.subtotal = this.items.reduce((total, item) => total + item.itemTotal, 0);

  // Calculate total discount
  this.totalDiscount = this.items.reduce((total, item) => total + item.discount * item.quantity, 0);

  // Calculate taxes (default 5% GST on subtotal)
  this.taxes = this.subtotal * 0.05;

  // Initialize total with subtotal and taxes
  let finalTotal = this.subtotal + this.taxes + this.shippingCost;

  // Apply coupon if exists
  if (this.coupon && this.coupon.code) {
    if (this.coupon.discountPercentage) {
      const percentageDiscount = (this.subtotal * this.coupon.discountPercentage) / 100;
      finalTotal -= percentageDiscount;
    } else if (this.coupon.discountAmount) {
      finalTotal -= this.coupon.discountAmount;
    }
  }

  // Apply minimum total check
  this.total = Math.max(0, finalTotal);

  // Update isEmpty flag
  this.isEmpty = this.items.length === 0;
};

/**
 * Method: Apply coupon
 */
cartSchema.methods.applyCoupon = async function (couponCode, discountAmount, discountPercentage) {
  this.coupon = {
    code: couponCode,
    discountAmount: discountAmount || 0,
    discountPercentage: discountPercentage || 0,
  };

  this.calculateTotals();

  return this.save();
};

/**
 * Method: Remove coupon
 */
cartSchema.methods.removeCoupon = async function () {
  this.coupon = {};
  this.calculateTotals();

  return this.save();
};

/**
 * Method: Update shipping cost
 */
cartSchema.methods.updateShippingCost = async function (shippingCost) {
  this.shippingCost = shippingCost || 0;
  this.calculateTotals();

  return this.save();
};

/**
 * Method: Validate cart items availability
 */
cartSchema.methods.validateItems = async function (productData) {
  // productData should be map of productId -> availableQuantity
  for (let i = 0; i < this.items.length; i++) {
    const item = this.items[i];
    const availableQty = productData.get(item.product.toString());

    if (availableQty === undefined || availableQty < item.quantity) {
      item.isAvailable = false;
      item.availabilityReason = availableQty === undefined ? 'Product no longer available' : 'Insufficient stock';
    } else {
      item.isAvailable = true;
      item.availabilityReason = null;
    }
  }

  return this.save();
};

/**
 * Method: Get unavailable items
 */
cartSchema.methods.getUnavailableItems = function () {
  return this.items.filter((item) => !item.isAvailable);
};

/**
 * Static Method: Create or get consumer cart
 */
cartSchema.statics.getOrCreateCart = async function (consumerId) {
  let cart = await this.findOne({ consumer: consumerId });

  if (!cart) {
    cart = await this.create({
      consumer: consumerId,
      items: [],
      isEmpty: true,
    });
  }

  return cart;
};

/**
 * Static Method: Get cart with populated data
 */
cartSchema.statics.getCartWithDetails = async function (consumerId) {
  return this.findOne({ consumer: consumerId })
    .populate('consumer', 'name email')
    .populate('items.product', 'name description')
    .populate('items.farmer', 'name email phone');
};

/**
 * Static Method: Find abandoned carts (not updated for 7 days)
 */
cartSchema.statics.findAbandonedCarts = async function (daysOld = 7) {
  const date = new Date();
  date.setDate(date.getDate() - daysOld);

  return this.find({
    isEmpty: false,
    updatedAt: { $lt: date },
  }).populate('consumer', 'email');
};

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
