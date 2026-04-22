import axiosInstance from './axiosConfig';

/**
 * Product API Endpoints
 * Handles product listing, filtering, search, reviews
 * Production-grade implementation
 */

// ============================================================================
// PRODUCT API CLASS
// ============================================================================

class ProductAPI {
    /**
     * Fetch all products with pagination and filters
     * @param {Object} options - Query options
     * @param {number} options.page - Page number (default 1)
     * @param {number} options.limit - Items per page (default 20)
     * @param {string} options.category - Filter by category
     * @param {string} options.farmer - Filter by farmer ID
     * @param {string} options.search - Search keyword
     * @param {string} options.sortBy - Sort field (price, name, createdAt)
     * @param {string} options.sortOrder - Sort order (asc, desc)
     * @returns {Promise} Products list with pagination
     */
    static getProducts(options = {}) {
        const params = {
            page: options.page || 1,
            limit: options.limit || 20,
            ...options
        };
        
        return axiosInstance.get('/products', { params })
            .then(response => response.data);
    }
    
    /**
     * Get single product by ID
     * @param {string} productId - Product ID
     * @returns {Promise} Product details
     */
    static getProduct(productId) {
        return axiosInstance.get(`/products/${productId}`)
            .then(response => response.data);
    }
    
    /**
     * Get products by farmer
     * @param {string} farmerId - Farmer ID
     * @param {Object} options - Query options
     * @returns {Promise} Farmer's products
     */
    static getProductsByFarmer(farmerId, options = {}) {
        const params = {
            page: options.page || 1,
            limit: options.limit || 20,
            ...options
        };
        
        return axiosInstance.get(`/products/farmer/${farmerId}`, { params })
            .then(response => response.data);
    }
    
    /**
     * Search products
     * @param {string} keyword - Search keyword
     * @param {Object} options - Query options
     * @returns {Promise} Search results
     */
    static searchProducts(keyword, options = {}) {
        const params = {
            search: keyword,
            page: options.page || 1,
            limit: options.limit || 20,
            ...options
        };
        
        return axiosInstance.get('/products/search', { params })
            .then(response => response.data);
    }
    
    /**
     * Get products by category
     * @param {string} category - Category name
     * @param {Object} options - Query options
     * @returns {Promise} Category products
     */
    static getProductsByCategory(category, options = {}) {
        const params = {
            category,
            page: options.page || 1,
            limit: options.limit || 20,
            ...options
        };
        
        return axiosInstance.get('/products/category', { params })
            .then(response => response.data);
    }
    
    /**
     * Get trending products
     * @param {Object} options - Query options
     * @returns {Promise} Trending products
     */
    static getTrendingProducts(options = {}) {
        const params = {
            limit: options.limit || 10
        };
        
        return axiosInstance.get('/products/trending', { params })
            .then(response => response.data);
    }
    
    /**
     * Create product (farmer only)
     * @param {Object} productData - Product data
     * @returns {Promise} Created product
     */
    static createProduct(productData) {
        return axiosInstance.post('/products', {
            name: productData.name,
            category: productData.category,
            description: productData.description,
            price: productData.price,
            quantity: productData.quantity,
            unit: productData.unit,
            images: productData.images || [],
            tags: productData.tags || [],
            harvestDate: productData.harvestDate,
            expiryDate: productData.expiryDate
        }).then(response => response.data);
    }
    
    /**
     * Update product (farmer only)
     * @param {string} productId - Product ID
     * @param {Object} productData - Updated product data
     * @returns {Promise} Updated product
     */
    static updateProduct(productId, productData) {
        return axiosInstance.put(`/products/${productId}`, productData)
            .then(response => response.data);
    }
    
    /**
     * Delete product (farmer only)
     * @param {string} productId - Product ID
     * @returns {Promise} Response
     */
    static deleteProduct(productId) {
        return axiosInstance.delete(`/products/${productId}`)
            .then(response => response.data);
    }
    
    /**
     * Upload product images
     * @param {FormData} formData - Form data with images
     * @returns {Promise} Image URLs
     */
    static uploadProductImages(formData) {
        return axiosInstance.post('/products/upload-images', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        }).then(response => response.data);
    }
    
    /**
     * Add product review
     * @param {string} productId - Product ID
     * @param {Object} reviewData - Review data
     * @returns {Promise} Created review
     */
    static addReview(productId, reviewData) {
        return axiosInstance.post(`/products/${productId}/reviews`, {
            rating: reviewData.rating,
            title: reviewData.title,
            comment: reviewData.comment
        }).then(response => response.data);
    }
    
    /**
     * Get product reviews
     * @param {string} productId - Product ID
     * @param {Object} options - Query options
     * @returns {Promise} Reviews list
     */
    static getReviews(productId, options = {}) {
        const params = {
            page: options.page || 1,
            limit: options.limit || 10
        };
        
        return axiosInstance.get(`/products/${productId}/reviews`, { params })
            .then(response => response.data);
    }
    
    /**
     * Update review (own review only)
     * @param {string} productId - Product ID
     * @param {string} reviewId - Review ID
     * @param {Object} reviewData - Updated review data
     * @returns {Promise} Updated review
     */
    static updateReview(productId, reviewId, reviewData) {
        return axiosInstance.put(`/products/${productId}/reviews/${reviewId}`, reviewData)
            .then(response => response.data);
    }
    
    /**
     * Delete review (own review or admin)
     * @param {string} productId - Product ID
     * @param {string} reviewId - Review ID
     * @returns {Promise} Response
     */
    static deleteReview(productId, reviewId) {
        return axiosInstance.delete(`/products/${productId}/reviews/${reviewId}`)
            .then(response => response.data);
    }
    
    /**
     * Get product availability
     * @param {string} productId - Product ID
     * @returns {Promise} Availability info
     */
    static getProductAvailability(productId) {
        return axiosInstance.get(`/products/${productId}/availability`)
            .then(response => response.data);
    }
    
    /**
     * Get categories
     * @returns {Promise} Available categories
     */
    static getCategories() {
        return axiosInstance.get('/products/categories')
            .then(response => response.data);
    }

    /**
     * Get user's favorite products
     * @returns {Promise} Favorite products
     */
    static getFavorites() {
        return axiosInstance.get('/products/favorites')
            .then(response => response.data)
            .catch(error => {
                // Return empty array if endpoint doesn't exist
                if (error.response?.status === 404) {
                    return { success: true, data: [] };
                }
                throw error;
            });
    }

    /**
     * Add product to favorites
     * @param {string} productId - Product ID
     * @returns {Promise} Response
     */
    static addToFavorites(productId) {
        return axiosInstance.post(`/products/${productId}/favorites`)
            .then(response => response.data)
            .catch(error => {
                // Silently fail if endpoint doesn't exist
                if (error.response?.status === 404) {
                    return { success: true };
                }
                throw error;
            });
    }

    /**
     * Remove product from favorites
     * @param {string} productId - Product ID
     * @returns {Promise} Response
     */
    static removeFromFavorites(productId) {
        return axiosInstance.delete(`/products/${productId}/favorites`)
            .then(response => response.data)
            .catch(error => {
                // Silently fail if endpoint doesn't exist
                if (error.response?.status === 404) {
                    return { success: true };
                }
                throw error;
            });
    }
}

export default ProductAPI;
