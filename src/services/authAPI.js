import axiosInstance from './axiosConfig';

/**
 * Authentication API Endpoints
 * Handles user login, registration, logout, token refresh
 * Production-grade implementation
 */

// ============================================================================
// AUTH API CLASS
// ============================================================================

class AuthAPI {
    static getTokenFromResponse(responseData) {
        return responseData?.data?.accessToken || responseData?.data?.token || null;
    }

    /**
     * Login user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise} Auth response with token and user data
     */
    static login(email, password) {
        return axiosInstance.post('/auth/login', {
            email,
            password
        }).then(response => {
            const token = this.getTokenFromResponse(response.data);

            if (response.data.success && token) {
                // Store token
                localStorage.setItem('authToken', token);
                localStorage.setItem('user', JSON.stringify(response.data.data.user));
                
                // Set default header
                axiosInstance.defaults.headers.common['Authorization'] = 
                    `Bearer ${token}`;
            }
            return response.data;
        });
    }
    
    /**
     * Register new user
     * @param {Object} userData - User registration data
     * @returns {Promise} Registration response
     */
    static register(userData) {
        return axiosInstance.post('/auth/register', {
            name: userData.name,
            email: userData.email,
            password: userData.password,
            role: userData.role, // 'consumer', 'farmer', or 'admin'
            phone: userData.phone || undefined,
        }).then(response => {
            if (response.data.success && response.data.data.accessToken) {
                // Store token and user
                localStorage.setItem('authToken', response.data.data.accessToken);
                localStorage.setItem('user', JSON.stringify(response.data.data.user));
                
                // Set default header for subsequent requests
                axiosInstance.defaults.headers.common['Authorization'] = 
                    `Bearer ${response.data.data.accessToken}`;
            }
            return response.data;
        }).catch(error => {
            console.error('Registration error:', error.response?.data || error.message);
            throw error;
        });
    }
    
    /**
     * Get current user profile
     * @returns {Promise} User profile data
     */
    static getProfile() {
        return axiosInstance.get('/auth/me')
            .then(response => response.data);
    }
    
    /**
     * Update user profile
     * @param {Object} profileData - Fields to update
     * @returns {Promise} Updated profile
     */
    static updateProfile(profileData) {
        return axiosInstance.put('/users/profile', profileData)
            .then(response => {
                if (response.data.data) {
                    localStorage.setItem('user', JSON.stringify(response.data.data));
                }
                return response.data;
            });
    }
    
    /**
     * Change password
     * @param {string} oldPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise} Response
     */
    static changePassword(oldPassword, newPassword) {
        return axiosInstance.post('/auth/change-password', {
            oldPassword,
            newPassword
        }).then(response => response.data);
    }
    
    /**
     * Request password reset
     * @param {string} email - User email
     * @returns {Promise} Response
     */
    static requestPasswordReset(email) {
        return axiosInstance.post('/auth/forgot-password', {
            email
        }).then(response => response.data);
    }
    
    /**
     * Reset password with token
     * @param {string} token - Reset token from email
     * @param {string} newPassword - New password
     * @returns {Promise} Response
     */
    static resetPassword(token, newPassword) {
        return axiosInstance.post('/auth/reset-password', {
            token,
            newPassword
        }).then(response => response.data);
    }
    
    /**
     * Verify email
     * @param {string} token - Verification token
     * @returns {Promise} Response
     */
    static verifyEmail(token) {
        return axiosInstance.post('/auth/verify-email', {
            token
        }).then(response => response.data);
    }
    
    /**
     * Refresh auth token
     * @returns {Promise} New token
     */
    static refreshToken() {
        return axiosInstance.post('/auth/refresh-token')
            .then(response => {
                const token = this.getTokenFromResponse(response.data);

                if (response.data.success && token) {
                    localStorage.setItem('authToken', token);
                    axiosInstance.defaults.headers.common['Authorization'] = 
                        `Bearer ${token}`;
                }
                return response.data;
            });
    }
    
    /**
     * Logout user
     * @returns {Promise} Response
     */
    static logout() {
        return axiosInstance.post('/auth/logout')
            .then(response => {
                // Clear stored data
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                delete axiosInstance.defaults.headers.common['Authorization'];
                return response.data;
            })
            .catch(error => {
                // Clear local data even if API call fails
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                delete axiosInstance.defaults.headers.common['Authorization'];
                return Promise.reject(error);
            });
    }
    
    /**
     * Logout from all devices
     * @returns {Promise} Response
     */
    static logoutAll() {
        return axiosInstance.post('/auth/logout-all')
            .then(response => {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                delete axiosInstance.defaults.headers.common['Authorization'];
                return response.data;
            });
    }
    
    /**
     * Get stored user from localStorage
     * @returns {Object} User data or null
     */
    static getStoredUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }
    
    /**
     * Get stored token
     * @returns {string} Auth token or null
     */
    static getStoredToken() {
        return localStorage.getItem('authToken');
    }
    
    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    static isAuthenticated() {
        return !!localStorage.getItem('authToken');
    }
    
    /**
     * Check if user is specific role
     * @param {string} role - Role to check (consumer, farmer, admin)
     * @returns {boolean}
     */
    static isRole(role) {
        const user = this.getStoredUser();
        return user?.type === role;
    }
}

export default AuthAPI;
