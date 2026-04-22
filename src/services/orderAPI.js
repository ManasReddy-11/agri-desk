import axiosInstance from './axiosConfig';

const getCurrentUserRole = () => {
    try {
        const rawUser = localStorage.getItem('user');
        if (!rawUser) return 'consumer';

        const user = JSON.parse(rawUser);
        return user?.role || user?.type || 'consumer';
    } catch (error) {
        return 'consumer';
    }
};

/**
 * Order API Endpoints
 * Handles order creation, management, tracking
 * Production-grade implementation
 */

// ============================================================================
// ORDER API CLASS
// ============================================================================

class OrderAPI {
    /**
     * Place a new order
     * @param {Object} orderData - Order details
     * @returns {Promise} Created order
     */
    static placeOrder(orderData) {
        return axiosInstance.post('/orders', {
            items: orderData.items || [], // From cart
            shippingAddress: {
                fullName: orderData.shippingAddress?.fullName,
                phone: orderData.shippingAddress?.phone,
                address: orderData.shippingAddress?.address,
                city: orderData.shippingAddress?.city,
                state: orderData.shippingAddress?.state,
                pinCode: orderData.shippingAddress?.pinCode,
                country: orderData.shippingAddress?.country || 'India'
            },
            billingAddress: orderData.billingAddress,
            email: orderData.email,
            paymentMethod: orderData.paymentMethod,
            couponCode: orderData.couponCode,
            specialInstructions: orderData.specialInstructions,
            scheduleDelivery: orderData.scheduleDelivery,
            preferredDate: orderData.preferredDate,
            preferredTime: orderData.preferredTime
        }).then(response => response.data);
    }
    
    /**
     * Get all user orders
     * @param {Object} options - Query options
     * @returns {Promise} Orders list
     */
    static getOrders(options = {}) {
        const params = {
            page: options.page || 1,
            limit: options.limit || 10,
            status: options.status,
            sortBy: options.sortBy || 'createdAt',
            sortOrder: options.sortOrder || 'desc'
        };

        const role = getCurrentUserRole();
        const endpoint = role === 'admin' ? '/admin/orders' : '/orders';
        
        return axiosInstance.get(endpoint, { params })
            .then(response => response.data);
    }
    
    /**
     * Get single order by ID
     * @param {string} orderId - Order ID
     * @returns {Promise} Order details
     */
    static getOrder(orderId) {
        return axiosInstance.get(`/orders/${orderId}`)
            .then(response => response.data);
    }
    
    /**
     * Get order by order number
     * @param {string} orderNumber - Order number
     * @returns {Promise} Order details
     */
    static getOrderByNumber(orderNumber) {
        return axiosInstance.get(`/orders/number/${orderNumber}`)
            .then(response => response.data);
    }
    
    /**
     * Cancel order
     * @param {string} orderId - Order ID
     * @param {string} reason - Cancellation reason
     * @returns {Promise} Cancelled order
     */
    static cancelOrder(orderId, reason = '') {
        return axiosInstance.post(`/orders/${orderId}/cancel`, {
            reason
        }).then(response => response.data);
    }
    
    /**
     * Get order status
     * @param {string} orderId - Order ID
     * @returns {Promise} Order status
     */
    static getOrderStatus(orderId) {
        return axiosInstance.get(`/orders/${orderId}/status`)
            .then(response => response.data);
    }
    
    /**
     * Get order tracking details
     * @param {string} orderId - Order ID
     * @returns {Promise} Tracking info
     */
    static getOrderTracking(orderId) {
        return axiosInstance.get(`/orders/${orderId}/track`)
            .then(response => response.data)
            .catch((error) => {
                if (error.response?.status === 404) {
                    return axiosInstance.get(`/orders/${orderId}/tracking`)
                        .then(response => response.data);
                }
                throw error;
            });
    }
    
    /**
     * Update order status (admin/farmer only)
     * @param {string} orderId - Order ID
     * @param {string} status - New status
     * @param {Object} details - Status update details
     * @returns {Promise} Updated order
     */
    static updateOrderStatus(orderId, status, details = {}) {
        return axiosInstance.put(`/orders/${orderId}/status`, {
            status,
            ...details
        }).then(response => response.data);
    }
    
    /**
     * Get order invoice
     * @param {string} orderId - Order ID
     * @returns {Promise} Invoice data/PDF URL
     */
    static getInvoice(orderId) {
        return axiosInstance.get(`/orders/${orderId}/invoice`)
            .then(response => response.data);
    }
    
    /**
     * Download invoice
     * @param {string} orderId - Order ID
     * @returns {Promise} Invoice file
     */
    static downloadInvoice(orderId) {
        return axiosInstance.get(`/orders/${orderId}/invoice/download`, {
            responseType: 'blob'
        }).then(response => response.data);
    }
    
    /**
     * Get order summary for dashboard
     * @returns {Promise} Summary data
     */
    static getOrderSummary() {
        return axiosInstance.get('/orders/summary')
            .then(response => response.data);
    }
    
    /**
     * Get recent orders
     * @param {number} limit - Number of recent orders
     * @returns {Promise} Recent orders list
     */
    static getRecentOrders(limit = 5) {
        return axiosInstance.get('/orders/recent', {
            params: { limit }
        }).then(response => response.data);
    }
    
    /**
     * Return order item
     * @param {string} orderId - Order ID
     * @param {Object} returnData - Return details
     * @returns {Promise} Return request
     */
    static requestReturn(orderId, returnData) {
        return axiosInstance.post(`/orders/${orderId}/return`, {
            itemId: returnData.itemId,
            quantity: returnData.quantity,
            reason: returnData.reason,
            description: returnData.description
        }).then(response => response.data);
    }
    
    /**
     * Get return requests
     * @param {Object} options - Query options
     * @returns {Promise} Return requests list
     */
    static getReturns(options = {}) {
        const params = {
            page: options.page || 1,
            limit: options.limit || 10,
            status: options.status
        };
        
        return axiosInstance.get('/orders/returns', { params })
            .then(response => response.data);
    }
    
    /**
     * Approve return request (admin only)
     * @param {string} returnId - Return ID
     * @returns {Promise} Updated return
     */
    static approveReturn(returnId) {
        return axiosInstance.post(`/orders/returns/${returnId}/approve`)
            .then(response => response.data);
    }
    
    /**
     * Reject return request (admin only)
     * @param {string} returnId - Return ID
     * @param {string} reason - Rejection reason
     * @returns {Promise} Updated return
     */
    static rejectReturn(returnId, reason) {
        return axiosInstance.post(`/orders/returns/${returnId}/reject`, {
            reason
        }).then(response => response.data);
    }
    
    /**
     * Update shipping address (order not shipped)
     * @param {string} orderId - Order ID
     * @param {Object} address - New address
     * @returns {Promise} Updated order
     */
    static updateShippingAddress(orderId, address) {
        return axiosInstance.put(`/orders/${orderId}/shipping-address`, address)
            .then(response => response.data);
    }
    
    /**
     * Request order replacement
     * @param {string} orderId - Order ID
     * @param {Object} replacementData - Replacement details
     * @returns {Promise} Replacement request
     */
    static requestReplacement(orderId, replacementData) {
        return axiosInstance.post(`/orders/${orderId}/replace`, {
            itemId: replacementData.itemId,
            reason: replacementData.reason
        }).then(response => response.data);
    }
    
    /**
     * Get farmer orders (farmer dashboard)
     * @param {Object} options - Query options
     * @returns {Promise} Farmer's orders
     */
    static getFarmerOrders(options = {}) {
        const params = {
            page: options.page || 1,
            limit: options.limit || 10,
            status: options.status
        };
        
        return axiosInstance.get('/orders/farmer/orders', { params })
            .then(response => response.data);
    }
    
    /**
     * Get farmer order statistics
     * @returns {Promise} Order statistics
     */
    static getFarmerOrderStats() {
        return axiosInstance.get('/orders/farmer/stats')
            .then(response => response.data);
    }
}

export default OrderAPI;
