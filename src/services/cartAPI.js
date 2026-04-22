import axiosInstance from './axiosConfig';

/**
 * Cart API Endpoints
 * Handles cart management, items, calculations
 * Production-grade implementation
 */

// ============================================================================
// CART API CLASS
// ============================================================================

class CartAPI {
    /**
     * Get user's cart
     * @returns {Promise} Cart data with items
     */
    static getCart() {
        return axiosInstance.get('/cart')
            .then(response => response.data);
    }
    
    /**
     * Add item to cart
     * @param {string} productId - Product ID
     * @param {number} quantity - Quantity to add
     * @returns {Promise} Updated cart
     */
    static addToCart(productId, quantity = 1) {
        return axiosInstance.post('/cart', {
            productId,
            quantity
        }).then(response => response.data);
    }
    
    /**
     * Update cart item quantity
     * @param {string} productId - Product ID
     * @param {number} quantity - New quantity
     * @returns {Promise} Updated cart
     */
    static updateCartItem(productId, quantity) {
        return axiosInstance.patch('/cart/item/quantity', {
            productId,
            quantity
        }).then(response => response.data);
    }
    
    /**
     * Remove item from cart
     * @param {string} productId - Product ID
     * @returns {Promise} Updated cart
     */
    static removeFromCart(productId) {
        return axiosInstance.delete('/cart/item', {
            data: { productId }
        })
            .then(response => response.data);
    }
    
    /**
     * Clear entire cart
     * @returns {Promise} Empty cart
     */
    static clearCart() {
        return axiosInstance.delete('/cart')
            .then(response => response.data);
    }
    
    /**
     * Get cart summary (totals, discounts, etc.)
     * @returns {Promise} Cart summary
     */
    static getCartSummary() {
        return axiosInstance.get('/cart/summary')
            .then(response => response.data);
    }
    
    /**
     * Apply discount/coupon code
     * @param {string} couponCode - Coupon code
     * @returns {Promise} Updated cart with discount
     */
    static applyCoupon(couponCode) {
        return axiosInstance.post('/cart/apply-coupon', {
            couponCode
        }).then(response => response.data);
    }
    
    /**
     * Remove discount/coupon
     * @returns {Promise} Updated cart without discount
     */
    static removeCoupon() {
        return axiosInstance.post('/cart/remove-coupon')
            .then(response => response.data);
    }
    
    /**
     * Validate coupon
     * @param {string} couponCode - Coupon code
     * @returns {Promise} Coupon details
     */
    static validateCoupon(couponCode) {
        return axiosInstance.get('/cart/validate-coupon', {
            params: { couponCode }
        }).then(response => response.data);
    }
    
    /**
     * Get available coupons
     * @returns {Promise} List of available coupons
     */
    static getAvailableCoupons() {
        return axiosInstance.get('/cart/available-coupons')
            .then(response => response.data);
    }
    
    /**
     * Estimate shipping cost
     * @param {Object} shippingData - City, state, pin code
     * @returns {Promise} Shipping cost
     */
    static estimateShipping(shippingData) {
        return axiosInstance.post('/cart/estimate-shipping', {
            city: shippingData.city,
            state: shippingData.state,
            pinCode: shippingData.pinCode
        }).then(response => response.data);
    }
    
    /**
     * Validate cart (check product availability)
     * @returns {Promise} Validation result
     */
    static validateCart() {
        return axiosInstance.post('/cart/validate')
            .then(response => response.data);
    }
    
    /**
     * Get cart item count
     * @returns {Promise} Item count
     */
    static getCartItemCount() {
        return axiosInstance.get('/cart/item-count')
            .then(response => response.data);
    }
    
    /**
     * Get cart total
     * @returns {Promise} Cart total
     */
    static getCartTotal() {
        return axiosInstance.get('/cart/total')
            .then(response => response.data);
    }
    
    /**
     * Save cart for later (wishlist)
     * @param {string} productId - Product ID
     * @returns {Promise} Response
     */
    static saveForLater(productId) {
        return axiosInstance.post(`/cart/save-for-later/${productId}`)
            .then(response => response.data);
    }
    
    /**
     * Get saved for later items
     * @returns {Promise} Saved items list
     */
    static getSavedForLater() {
        return axiosInstance.get('/cart/saved-for-later')
            .then(response => response.data);
    }
    
    /**
     * Move saved item back to cart
     * @param {string} productId - Product ID
     * @returns {Promise} Updated cart
     */
    static moveToCart(productId) {
        return axiosInstance.post(`/cart/move-to-cart/${productId}`)
            .then(response => response.data);
    }
    
    /**
     * Remove saved item
     * @param {string} productId - Product ID
     * @returns {Promise} Response
     */
    static removeSavedItem(productId) {
        return axiosInstance.delete(`/cart/saved-for-later/${productId}`)
            .then(response => response.data);
    }
    
    /**
     * Check stock availability for cart items
     * @returns {Promise} Stock availability info
     */
    static checkStockAvailability() {
        return axiosInstance.post('/cart/check-stock')
            .then(response => response.data);
    }
}

export default CartAPI;
