/**
 * React Custom Hooks for API Calls
 * Reusable hooks with loading, error, and data states
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { AuthAPI, ProductAPI, CartAPI, OrderAPI, PaymentAPI } from './index';

// ============================================================================
// GENERIC API HOOK
// ============================================================================

/**
 * useAPICall - Generic hook for API calls
 * @param {Function} apiFunction - API function to call
 * @param {Array} dependencies - Dependencies array for useEffect
 * @returns {Object} { data, loading, error, execute, reset }
 */
export function useAPICall(apiFunction, dependencies = []) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const isMountedRef = useRef(true);

    const execute = useCallback(async (...args) => {
        if (!isMountedRef.current) return;

        setLoading(true);
        setError(null);

        try {
            const response = await apiFunction(...args);
            if (isMountedRef.current) {
                setData(response);
            }
            return response;
        } catch (err) {
            if (isMountedRef.current) {
                setError(err.response?.data?.message || err.message);
            }
            throw err;
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [apiFunction]);

    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setLoading(false);
    }, []);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    return { data, loading, error, execute, reset };
}

// ============================================================================
// AUTHENTICATION HOOKS
// ============================================================================

/**
 * useLogin - Hook for login functionality
 */
export function useLogin() {
    const [user, setUser] = useState(AuthAPI.getStoredUser());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const login = useCallback(async (email, password) => {
        setLoading(true);
        setError(null);

        try {
            const response = await AuthAPI.login(email, password);
            setUser(response.data.user);
            return response.data.user;
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Login failed';
            setError(errorMsg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { user, loading, error, login };
}

/**
 * useRegister - Hook for user registration
 */
export function useRegister() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const register = useCallback(async (userData) => {
        setLoading(true);
        setError(null);

        try {
            const response = await AuthAPI.register(userData);
            return response.data.user;
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Registration failed';
            setError(errorMsg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { loading, error, register };
}

/**
 * useLogout - Hook for logout functionality
 */
export function useLogout() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const logout = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            await AuthAPI.logout();
            return true;
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Logout failed';
            setError(errorMsg);
            // Still clear local data even if API call fails
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return { loading, error, logout };
}

/**
 * useAuth - Hook for checking authentication status
 */
export function useAuth() {
    const [user, setUser] = useState(() => AuthAPI.getStoredUser());
    const [isAuthenticated, setIsAuthenticated] = useState(() => AuthAPI.isAuthenticated());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = AuthAPI.getStoredUser();
        setUser(storedUser);
        setIsAuthenticated(!!storedUser);
        setLoading(false);
    }, []);

    return { user, isAuthenticated, loading };
}

// ============================================================================
// PRODUCT HOOKS
// ============================================================================

/**
 * useProducts - Hook for fetching products with pagination
 */
export function useProducts(initialPage = 1, limit = 12) {
    const [products, setProducts] = useState([]);
    const [page, setPage] = useState(initialPage);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchProducts = useCallback(async (pageNum = page, category = null, search = null) => {
        setLoading(true);
        setError(null);

        try {
            const response = await ProductAPI.getProducts({
                page: pageNum,
                limit,
                category,
                search
            });

            setProducts(response.data.products);
            setTotalPages(response.data.totalPages);
            setPage(pageNum);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch products');
        } finally {
            setLoading(false);
        }
    }, [page, limit]);

    // Fetch products on mount
    useEffect(() => {
        fetchProducts();
    }, []);

    const goToPage = useCallback((pageNum) => {
        fetchProducts(pageNum);
    }, [fetchProducts]);

    const goToNextPage = useCallback(() => {
        if (page < totalPages) {
            goToPage(page + 1);
        }
    }, [page, totalPages, goToPage]);

    const goToPreviousPage = useCallback(() => {
        if (page > 1) {
            goToPage(page - 1);
        }
    }, [page, goToPage]);

    return {
        products,
        page,
        totalPages,
        loading,
        error,
        fetchProducts,
        goToPage,
        goToNextPage,
        goToPreviousPage,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
    };
}

/**
 * useProduct - Hook for fetching single product
 */
export function useProduct(productId) {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await ProductAPI.getProduct(productId);
                setProduct(response.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch product');
            } finally {
                setLoading(false);
            }
        };

        if (productId) {
            fetchProduct();
        }
    }, [productId]);

    return { product, loading, error };
}

/**
 * useProductSearch - Hook for searching products
 */
export function useProductSearch() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const search = useCallback(async (keyword, page = 1) => {
        if (!keyword.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await ProductAPI.searchProducts(keyword, { page });
            setResults(response.data.products);
        } catch (err) {
            setError(err.response?.data?.message || 'Search failed');
        } finally {
            setLoading(false);
        }
    }, []);

    return { results, loading, error, search };
}

// ============================================================================
// CART HOOKS
// ============================================================================

/**
 * useCart - Hook for managing shopping cart
 */
export function useCart() {
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const loadCart = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await CartAPI.getCart();
            setCart(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load cart');
        } finally {
            setLoading(false);
        }
    }, []);

    const addToCart = useCallback(async (productId, quantity = 1) => {
        try {
            const response = await CartAPI.addToCart(productId, quantity);
            setCart(response.data);
            return response.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add to cart');
            throw err;
        }
    }, []);

    const updateQuantity = useCallback(async (productId, quantity) => {
        try {
            const response = await CartAPI.updateCartItem(productId, quantity);
            setCart(response.data);
            return response.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update item');
            throw err;
        }
    }, []);

    const removeFromCart = useCallback(async (productId) => {
        try {
            const response = await CartAPI.removeFromCart(productId);
            setCart(response.data);
            return response.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to remove item');
            throw err;
        }
    }, []);

    const clearCart = useCallback(async () => {
        try {
            const response = await CartAPI.clearCart();
            setCart(response.data);
            return response.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to clear cart');
            throw err;
        }
    }, []);

    const applyCoupon = useCallback(async (couponCode) => {
        try {
            const response = await CartAPI.applyCoupon(couponCode);
            setCart(response.data);
            return response.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid coupon');
            throw err;
        }
    }, []);

    // Load cart on mount
    useEffect(() => {
        if (AuthAPI.isAuthenticated()) {
            loadCart();
        }
    }, [loadCart]);

    return {
        cart,
        loading,
        error,
        loadCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        applyCoupon,
        itemCount: cart?.items?.length || 0,
        total: cart?.total || 0
    };
}

// ============================================================================
// ORDER HOOKS
// ============================================================================

/**
 * useOrders - Hook for fetching user orders
 */
export function useOrders(initialPage = 1) {
    const [orders, setOrders] = useState([]);
    const [page, setPage] = useState(initialPage);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchOrders = useCallback(async (pageNum = page, status = null) => {
        setLoading(true);
        setError(null);

        try {
            const response = await OrderAPI.getOrders({
                page: pageNum,
                limit: 10,
                status
            });

            setOrders(response.data.orders);
            setTotalPages(response.data.totalPages);
            setPage(pageNum);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchOrders();
    }, []);

    return {
        orders,
        page,
        totalPages,
        loading,
        error,
        fetchOrders,
        goToPage: (pageNum) => fetchOrders(pageNum)
    };
}

/**
 * useOrder - Hook for fetching single order
 */
export function useOrder(orderId) {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const response = await OrderAPI.getOrder(orderId);
                setOrder(response.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch order');
            } finally {
                setLoading(false);
            }
        };

        if (orderId) {
            fetchOrder();
        }
    }, [orderId]);

    return { order, loading, error };
}

/**
 * usePlaceOrder - Hook for placing an order
 */
export function usePlaceOrder() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const placeOrder = useCallback(async (orderData) => {
        setLoading(true);
        setError(null);

        try {
            const response = await OrderAPI.placeOrder(orderData);
            return response.data;
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Failed to place order';
            setError(errorMsg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { loading, error, placeOrder };
}

// ============================================================================
// PAYMENT HOOKS
// ============================================================================

/**
 * usePayment - Hook for payment processing
 */
export function usePayment() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const processCardPayment = useCallback(async (paymentData) => {
        setLoading(true);
        setError(null);

        try {
            const response = await PaymentAPI.processCardPayment(paymentData);
            return response.data;
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Payment failed';
            setError(errorMsg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const processUPIPayment = useCallback(async (paymentData) => {
        setLoading(true);
        setError(null);

        try {
            const response = await PaymentAPI.processUPIPayment(paymentData);
            return response.data;
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'UPI payment failed';
            setError(errorMsg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        processCardPayment,
        processUPIPayment
    };
}

/**
 * useWallet - Hook for wallet management
 */
export function useWallet() {
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getBalance = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await PaymentAPI.getWalletBalance();
            setBalance(response.data.balance);
            return response.data.balance;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch balance');
        } finally {
            setLoading(false);
        }
    }, []);

    const addMoney = useCallback(async (amount, paymentMethod) => {
        setLoading(true);
        setError(null);

        try {
            const response = await PaymentAPI.addMoneyToWallet(amount, paymentMethod);
            // Refresh balance after adding money
            await getBalance();
            return response.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add money');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [getBalance]);

    // Load balance on mount
    useEffect(() => {
        if (AuthAPI.isAuthenticated()) {
            getBalance();
        }
    }, [getBalance]);

    return {
        balance,
        loading,
        error,
        getBalance,
        addMoney
    };
}

// ============================================================================
// EXPORT ALL HOOKS
// ============================================================================

export default {
    // Generic
    useAPICall,
    
    // Auth
    useLogin,
    useRegister,
    useLogout,
    useAuth,
    
    // Products
    useProducts,
    useProduct,
    useProductSearch,
    
    // Cart
    useCart,
    
    // Orders
    useOrders,
    useOrder,
    usePlaceOrder,
    
    // Payments
    usePayment,
    useWallet
};
