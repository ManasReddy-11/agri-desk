import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * ═══════════════════════════════════════════════════════════════
 * CART OPERATIONS
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Get consumer's cart (View Cart)
 */
export const getCart = async (req, res, next) => {
  try {
    const consumerId = req.user.id;

    const cart = await Cart.getOrCreateCart(consumerId);

    // Populate product and farmer details
    const populatedCart = await Cart.findById(cart._id)
      .populate('consumer', 'name email phone address')
      .populate('items.product', 'name description category price discountedPrice images ratings reviewCount')
      .populate('items.farmer', 'name email phone location');

    res.status(200).json({
      success: true,
      message: 'Cart retrieved successfully',
      data: {
        cart: populatedCart,
        summary: {
          itemCount: populatedCart.itemCount,
          uniqueItemCount: populatedCart.uniqueItemCount,
          subtotal: populatedCart.subtotal,
          totalDiscount: populatedCart.totalDiscount,
          taxes: populatedCart.taxes,
          shippingCost: populatedCart.shippingCost,
          coupon: populatedCart.coupon,
          total: populatedCart.total,
          isEmpty: populatedCart.isEmpty,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add item to cart
 */
export const addToCart = async (req, res, next) => {
  try {
    const consumerId = req.user.id;
    const { productId, quantity } = req.body;

    // Validate input
    if (!productId || !quantity) {
      throw new AppError('Please provide productId and quantity', 400);
    }

    if (quantity <= 0) {
      throw new AppError('Quantity must be greater than 0', 400);
    }

    // Get product
    const product = await Product.findById(productId);

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    if (!product.isActive) {
      throw new AppError('This product is no longer available', 410);
    }

    if (!product.inStock) {
      throw new AppError('Product is out of stock', 400);
    }

    if (product.quantity < quantity) {
      throw new AppError(`Only ${product.quantity} units available`, 400);
    }

    if (quantity < product.minOrderQuantity) {
      throw new AppError(
        `Minimum order quantity is ${product.minOrderQuantity}`,
        400
      );
    }

    // Get or create cart
    let cart = await Cart.getOrCreateCart(consumerId);

    // Add item to cart
    await cart.addItem(
      productId,
      product.farmer,
      quantity,
      product.price,
      product.discountedPrice,
      product.unit,
      product.name,
      product.images?.[0]?.url || null
    );

    // Populate and return
    const updatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'name')
      .populate('items.farmer', 'name email');

    res.status(200).json({
      success: true,
      message: `${product.name} added to cart`,
      data: {
        cart: updatedCart,
        addedItem: updatedCart.items[updatedCart.items.length - 1],
        summary: {
          itemCount: updatedCart.itemCount,
          uniqueItemCount: updatedCart.uniqueItemCount,
          total: updatedCart.total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update cart item quantity
 */
export const updateCartQuantity = async (req, res, next) => {
  try {
    const consumerId = req.user.id;
    const { productId, quantity } = req.body;

    // Validate input
    if (!productId || quantity === undefined) {
      throw new AppError('Please provide productId and quantity', 400);
    }

    if (quantity <= 0) {
      throw new AppError('Quantity must be greater than 0', 400);
    }

    // Get cart
    const cart = await Cart.findOne({ consumer: consumerId });

    if (!cart) {
      throw new AppError('Cart not found', 404);
    }

    // Find item in cart
    const item = cart.items.find((i) => i.product.toString() === productId.toString());

    if (!item) {
      throw new AppError('Item not found in cart', 404);
    }

    // Get product to check availability
    const product = await Product.findById(productId);

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    if (!product.inStock) {
      throw new AppError('Product is out of stock', 400);
    }

    if (product.quantity < quantity) {
      throw new AppError(
        `Only ${product.quantity} units available`,
        400
      );
    }

    if (quantity < product.minOrderQuantity) {
      throw new AppError(
        `Minimum order quantity is ${product.minOrderQuantity}`,
        400
      );
    }

    // Update quantity
    await cart.updateItemQuantity(productId, quantity);

    // Populate and return
    const updatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'name')
      .populate('items.farmer', 'name email');

    res.status(200).json({
      success: true,
      message: 'Cart item quantity updated',
      data: {
        cart: updatedCart,
        updatedItem: updatedCart.items.find((i) => i.product._id.toString() === productId.toString()),
        summary: {
          itemCount: updatedCart.itemCount,
          uniqueItemCount: updatedCart.uniqueItemCount,
          subtotal: updatedCart.subtotal,
          total: updatedCart.total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove item from cart
 */
export const removeFromCart = async (req, res, next) => {
  try {
    const consumerId = req.user.id;
    const { productId } = req.body;

    // Validate input
    if (!productId) {
      throw new AppError('Please provide productId', 400);
    }

    // Get cart
    const cart = await Cart.findOne({ consumer: consumerId });

    if (!cart) {
      throw new AppError('Cart not found', 404);
    }

    // Find item in cart
    const item = cart.items.find((i) => i.product.toString() === productId.toString());

    if (!item) {
      throw new AppError('Item not found in cart', 404);
    }

    const removedItemName = item.productName;

    // Remove item
    await cart.removeItem(productId);

    // Populate and return
    const updatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'name')
      .populate('items.farmer', 'name email');

    res.status(200).json({
      success: true,
      message: `${removedItemName} removed from cart`,
      data: {
        cart: updatedCart,
        summary: {
          itemCount: updatedCart.itemCount,
          uniqueItemCount: updatedCart.uniqueItemCount,
          subtotal: updatedCart.subtotal,
          total: updatedCart.total,
          isEmpty: updatedCart.isEmpty,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear entire cart
 */
export const clearCart = async (req, res, next) => {
  try {
    const consumerId = req.user.id;

    // Get cart
    const cart = await Cart.findOne({ consumer: consumerId });

    if (!cart) {
      throw new AppError('Cart not found', 404);
    }

    // Clear cart
    await cart.clearCart();

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: {
        cart: await Cart.findById(cart._id),
        summary: {
          itemCount: 0,
          uniqueItemCount: 0,
          subtotal: 0,
          total: 0,
          isEmpty: true,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get cart summary
 */
export const getCartSummary = async (req, res, next) => {
  try {
    const consumerId = req.user.id;

    const cart = await Cart.getOrCreateCart(consumerId);

    res.status(200).json({
      success: true,
      message: 'Cart summary retrieved',
      data: {
        itemCount: cart.itemCount,
        uniqueItemCount: cart.uniqueItemCount,
        subtotal: cart.subtotal,
        totalDiscount: cart.totalDiscount,
        taxes: cart.taxes,
        shippingCost: cart.shippingCost,
        coupon: cart.coupon || null,
        total: cart.total,
        isEmpty: cart.isEmpty,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update shipping cost
 */
export const updateShippingCost = async (req, res, next) => {
  try {
    const consumerId = req.user.id;
    const { shippingCost } = req.body;

    if (shippingCost === undefined || shippingCost < 0) {
      throw new AppError('Please provide valid shipping cost', 400);
    }

    // Get cart
    const cart = await Cart.findOne({ consumer: consumerId });

    if (!cart) {
      throw new AppError('Cart not found', 404);
    }

    // Update shipping cost
    await cart.updateShippingCost(shippingCost);

    res.status(200).json({
      success: true,
      message: 'Shipping cost updated',
      data: {
        shippingCost: cart.shippingCost,
        taxes: cart.taxes,
        total: cart.total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Apply coupon code
 */
export const applyCoupon = async (req, res, next) => {
  try {
    const consumerId = req.user.id;
    const { code, discountAmount, discountPercentage } = req.body;

    if (!code) {
      throw new AppError('Please provide coupon code', 400);
    }

    if (!discountAmount && !discountPercentage) {
      throw new AppError('Please provide discount amount or percentage', 400);
    }

    // Get cart
    const cart = await Cart.findOne({ consumer: consumerId });

    if (!cart) {
      throw new AppError('Cart not found', 404);
    }

    if (cart.isEmpty) {
      throw new AppError('Cannot apply coupon to empty cart', 400);
    }

    // Apply coupon
    await cart.applyCoupon(code, discountAmount, discountPercentage);

    res.status(200).json({
      success: true,
      message: `Coupon ${code} applied successfully`,
      data: {
        coupon: cart.coupon,
        subtotal: cart.subtotal,
        discountAmount: discountAmount || 0,
        taxes: cart.taxes,
        total: cart.total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove coupon code
 */
export const removeCoupon = async (req, res, next) => {
  try {
    const consumerId = req.user.id;

    // Get cart
    const cart = await Cart.findOne({ consumer: consumerId });

    if (!cart) {
      throw new AppError('Cart not found', 404);
    }

    if (!cart.coupon || !cart.coupon.code) {
      throw new AppError('No coupon applied to this cart', 400);
    }

    const removedCoupon = cart.coupon.code;

    // Remove coupon
    await cart.removeCoupon();

    res.status(200).json({
      success: true,
      message: `Coupon ${removedCoupon} removed`,
      data: {
        subtotal: cart.subtotal,
        taxes: cart.taxes,
        total: cart.total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get cart grouped by farmer (for checkout)
 */
export const getCartGroupedByFarmer = async (req, res, next) => {
  try {
    const consumerId = req.user.id;

    const cart = await Cart.findOne({ consumer: consumerId })
      .populate('consumer', 'name email')
      .populate('items.product', 'name')
      .populate('items.farmer', 'name email phone');

    if (!cart || cart.isEmpty) {
      throw new AppError('Cart is empty', 400);
    }

    const groupedByFarmer = cart.groupedByFarmer;

    res.status(200).json({
      success: true,
      message: 'Cart grouped by farmer',
      data: {
        consumer: cart.consumer,
        groupedByFarmer: groupedByFarmer,
        summary: {
          totalItems: cart.itemCount,
          subtotal: cart.subtotal,
          taxes: cart.taxes,
          shippingCost: cart.shippingCost,
          total: cart.total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Validate cart items (check availability)
 */
export const validateCartItems = async (req, res, next) => {
  try {
    const consumerId = req.user.id;

    // Get cart
    const cart = await Cart.findOne({ consumer: consumerId });

    if (!cart) {
      throw new AppError('Cart not found', 404);
    }

    if (cart.isEmpty) {
      throw new AppError('Cart is empty', 400);
    }

    // Check each product
    const productMap = new Map();
    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      if (product) {
        productMap.set(item.product.toString(), product.quantity);
      } else {
        productMap.set(item.product.toString(), undefined);
      }
    }

    // Validate items
    await cart.validateItems(productMap);

    const unavailable = cart.getUnavailableItems();

    if (unavailable.length > 0) {
      return res.status(200).json({
        success: true,
        message: `${unavailable.length} item(s) in cart are no longer available`,
        data: {
          valid: true,
          isValid: unavailable.length === 0,
          unavailableItems: unavailable,
          availableItems: cart.items.filter((item) => item.isAvailable),
          summary: {
            itemCount: cart.itemCount,
            availableItemCount: cart.items.filter((item) => item.isAvailable).length,
          },
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'All cart items are available',
      data: {
        valid: true,
        isValid: true,
        availableItems: cart.items,
        summary: {
          itemCount: cart.itemCount,
          availableItemCount: cart.items.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get cart by consumer ID (Admin only)
 */
export const getCartByConsumer = async (req, res, next) => {
  try {
    const { consumerId } = req.params;

    const cart = await Cart.findOne({ consumer: consumerId })
      .populate('consumer', 'name email')
      .populate('items.product', 'name')
      .populate('items.farmer', 'name email');

    if (!cart) {
      throw new AppError('Cart not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Cart retrieved successfully',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};
