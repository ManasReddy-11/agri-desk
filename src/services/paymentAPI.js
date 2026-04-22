import axiosInstance from './axiosConfig';

/**
 * Payment API Endpoints
 * Handles payment processing, methods, receipts
 * Production-grade implementation
 */

// ============================================================================
// PAYMENT API CLASS
// ============================================================================

class PaymentAPI {
    /**
     * Initiate payment for an order
     * @param {Object} paymentData - Payment details
     * @returns {Promise} Payment initiation response
     */
    static initiatePayment(paymentData) {
        return axiosInstance.post('/payments', {
            orderId: paymentData.orderId,
            amount: paymentData.amount,
            currency: paymentData.currency || 'INR',
            paymentMethod: paymentData.paymentMethod,
            description: paymentData.description
        }).then(response => response.data);
    }
    
    /**
     * Get payment methods available
     * @returns {Promise} Available payment methods
     */
    static getPaymentMethods() {
        return axiosInstance.get('/payments/methods')
            .then(response => response.data);
    }
    
    /**
     * Process credit/debit card payment
     * @param {Object} paymentData - Card and payment details
     * @returns {Promise} Payment response
     */
    static processCardPayment(paymentData) {
        return axiosInstance.post('/payments/card', {
            orderId: paymentData.orderId,
            amount: paymentData.amount,
            cardNumber: paymentData.cardNumber,
            cardHolderName: paymentData.cardHolderName,
            expiryDate: paymentData.expiryDate,
            cvv: paymentData.cvv,
            billingAddress: paymentData.billingAddress,
            saveCard: paymentData.saveCard
        }).then(response => response.data);
    }
    
    /**
     * Process UPI payment
     * @param {Object} paymentData - UPI and payment details
     * @returns {Promise} Payment response
     */
    static processUPIPayment(paymentData) {
        return axiosInstance.post('/payments/upi', {
            orderId: paymentData.orderId,
            amount: paymentData.amount,
            upiId: paymentData.upiId,
            transactionId: paymentData.transactionId
        }).then(response => response.data);
    }
    
    /**
     * Process net banking payment
     * @param {Object} paymentData - Bank and payment details
     * @returns {Promise} Payment response
     */
    static processNetBankingPayment(paymentData) {
        return axiosInstance.post('/payments/netbanking', {
            orderId: paymentData.orderId,
            amount: paymentData.amount,
            bankCode: paymentData.bankCode,
            transactionId: paymentData.transactionId
        }).then(response => response.data);
    }
    
    /**
     * Process wallet payment
     * @param {Object} paymentData - Wallet and payment details
     * @returns {Promise} Payment response
     */
    static processWalletPayment(paymentData) {
        return axiosInstance.post('/payments/wallet', {
            orderId: paymentData.orderId,
            amount: paymentData.amount,
            walletId: paymentData.walletId
        }).then(response => response.data);
    }
    
    /**
     * Process EMI payment
     * @param {Object} paymentData - EMI details
     * @returns {Promise} Payment response
     */
    static processEMIPayment(paymentData) {
        return axiosInstance.post('/payments/emi', {
            orderId: paymentData.orderId,
            amount: paymentData.amount,
            cardNumber: paymentData.cardNumber,
            tenure: paymentData.tenure,
            bankCode: paymentData.bankCode
        }).then(response => response.data);
    }
    
    /**
     * Verify payment status
     * @param {string} paymentId - Payment ID
     * @returns {Promise} Payment status
     */
    static verifyPayment(paymentId) {
        return axiosInstance.get(`/payments/${paymentId}/verify`)
            .then(response => response.data);
    }
    
    /**
     * Get payment status for order
     * @param {string} orderId - Order ID
     * @returns {Promise} Payment status
     */
    static getPaymentStatus(orderId) {
        return axiosInstance.get(`/payments/order/${orderId}/status`)
            .then(response => response.data);
    }
    
    /**
     * Get payment receipt
     * @param {string} paymentId - Payment ID
     * @returns {Promise} Receipt data
     */
    static getReceipt(paymentId) {
        return axiosInstance.get(`/payments/${paymentId}/receipt`)
            .then(response => response.data);
    }
    
    /**
     * Download payment receipt
     * @param {string} paymentId - Payment ID
     * @returns {Promise} Receipt file
     */
    static downloadReceipt(paymentId) {
        return axiosInstance.get(`/payments/${paymentId}/receipt/download`, {
            responseType: 'blob'
        }).then(response => response.data);
    }
    
    /**
     * Get payment history
     * @param {Object} options - Query options
     * @returns {Promise} Payment history
     */
    static getPaymentHistory(options = {}) {
        const params = {
            page: options.page || 1,
            limit: options.limit || 10,
            status: options.status,
            sortBy: options.sortBy || 'createdAt',
            sortOrder: options.sortOrder || 'desc'
        };
        
        return axiosInstance.get('/payments', { params })
            .then(response => response.data);
    }
    
    /**
     * Refund payment
     * @param {string} paymentId - Payment ID
     * @param {Object} refundData - Refund details
     * @returns {Promise} Refund response
     */
    static refundPayment(paymentId, refundData = {}) {
        return axiosInstance.post(`/payments/${paymentId}/refund`, {
            amount: refundData.amount,
            reason: refundData.reason,
            notes: refundData.notes
        }).then(response => response.data);
    }
    
    /**
     * Get saved payment methods
     * @returns {Promise} Saved payment methods
     */
    static getSavedPaymentMethods() {
        return axiosInstance.get('/payments/saved-methods')
            .then(response => response.data);
    }
    
    /**
     * Add payment method (save card, wallet, etc.)
     * @param {Object} methodData - Payment method details
     * @returns {Promise} Saved method
     */
    static addPaymentMethod(methodData) {
        return axiosInstance.post('/payments/save-method', {
            type: methodData.type, // card, upi, wallet
            details: methodData.details
        }).then(response => response.data);
    }
    
    /**
     * Remove saved payment method
     * @param {string} methodId - Payment method ID
     * @returns {Promise} Response
     */
    static removePaymentMethod(methodId) {
        return axiosInstance.delete(`/payments/saved-methods/${methodId}`)
            .then(response => response.data);
    }
    
    /**
     * Set default payment method
     * @param {string} methodId - Payment method ID
     * @returns {Promise} Response
     */
    static setDefaultPaymentMethod(methodId) {
        return axiosInstance.put(`/payments/saved-methods/${methodId}/default`)
            .then(response => response.data);
    }
    
    /**
     * Get wallet balance
     * @returns {Promise} Wallet balance
     */
    static getWalletBalance() {
        return axiosInstance.get('/payments/wallet/balance')
            .then(response => response.data);
    }
    
    /**
     * Add money to wallet
     * @param {number} amount - Amount to add
     * @param {string} paymentMethod - How to pay (card, upi, netbanking)
     * @returns {Promise} Transaction response
     */
    static addMoneyToWallet(amount, paymentMethod) {
        return axiosInstance.post('/payments/wallet/add-money', {
            amount,
            paymentMethod
        }).then(response => response.data);
    }
    
    /**
     * Get wallet transactions
     * @param {Object} options - Query options
     * @returns {Promise} Wallet transactions
     */
    static getWalletTransactions(options = {}) {
        const params = {
            page: options.page || 1,
            limit: options.limit || 10
        };
        
        return axiosInstance.get('/payments/wallet/transactions', { params })
            .then(response => response.data);
    }
    
    /**
     * Check payment eligibility (for EMI, etc.)
     * @param {number} amount - Payment amount
     * @returns {Promise} Eligibility details
     */
    static checkPaymentEligibility(amount) {
        return axiosInstance.get('/payments/eligibility', {
            params: { amount }
        }).then(response => response.data);
    }
    
    /**
     * Handle payment callback (webhook)
     * @param {Object} callbackData - Payment gateway callback
     * @returns {Promise} Response
     */
    static handlePaymentCallback(callbackData) {
        return axiosInstance.post('/payments/webhook', callbackData)
            .then(response => response.data);
    }
    
    /**
     * Get payment gateway key
     * @returns {Promise} Gateway key for client-side integration
     */
    static getPaymentGatewayKey() {
        return axiosInstance.get('/payments/gateway-key')
            .then(response => response.data);
    }
    
    /**
     * Initiate 3D Secure verification
     * @param {Object} verificationData - Verification details
     * @returns {Promise} Verification response
     */
    static initiate3DSecure(verificationData) {
        return axiosInstance.post('/payments/3d-secure', {
            paymentId: verificationData.paymentId,
            cardNumber: verificationData.cardNumber
        }).then(response => response.data);
    }
    
    /**
     * Complete 3D Secure verification
     * @param {string} verificationId - Verification ID
     * @param {string} otp - OTP received
     * @returns {Promise} Verification result
     */
    static complete3DSecure(verificationId, otp) {
        return axiosInstance.post(`/payments/3d-secure/${verificationId}/verify`, {
            otp
        }).then(response => response.data);
    }
}

export default PaymentAPI;
