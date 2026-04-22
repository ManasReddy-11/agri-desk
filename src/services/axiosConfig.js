import axios from 'axios';

/**
 * Axios Configuration
 * Base axios instance with interceptors for API calls
 * Production-grade implementation
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const REQUEST_TIMEOUT = 10000; // 10 seconds

// ============================================================================
// CREATE AXIOS INSTANCE
// ============================================================================

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: REQUEST_TIMEOUT,
    headers: {
        'Content-Type': 'application/json'
    }
});

// ============================================================================
// REQUEST INTERCEPTOR
// ============================================================================

axiosInstance.interceptors.request.use(
    (config) => {
        // Add auth token if available
        const token = localStorage.getItem('authToken');
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Log request in development
        if (import.meta.env.MODE === 'development') {
            console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`);
        }
        
        return config;
    },
    (error) => {
        console.error('[API Error] Request failed:', error);
        return Promise.reject(error);
    }
);

// ============================================================================
// RESPONSE INTERCEPTOR
// ============================================================================

axiosInstance.interceptors.response.use(
    (response) => {
        // Log response in development
        if (import.meta.env.MODE === 'development') {
            console.log(`[API Response] ${response.status} ${response.config.url}`);
        }
        
        return response;
    },
    (error) => {
        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
            console.warn('[API] Unauthorized - clearing auth');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            
            // Redirect to login if not already there
            if (window.location.pathname !== '/login') {
                window.location.href = '/login?redirect=' + window.location.pathname;
            }
        }
        
        // Handle 403 Forbidden
        if (error.response?.status === 403) {
            console.warn('[API] Access denied');
        }
        
        // Handle 404 Not Found
        if (error.response?.status === 404) {
            console.warn('[API] Resource not found');
        }
        
        // Handle 429 Too Many Requests
        if (error.response?.status === 429) {
            console.warn('[API] Rate limited');
        }
        
        // Handle 500 Server Error
        if (error.response?.status >= 500) {
            console.error('[API] Server error:', error.response.statusText);
        }
        
        // Network error or timeout
        if (!error.response) {
            console.error('[API] Network error or timeout');
        }
        
        return Promise.reject(error);
    }
);

// ============================================================================
// EXPORT
// ============================================================================

export default axiosInstance;
