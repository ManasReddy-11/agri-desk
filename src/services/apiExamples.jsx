/**
 * API Integration Examples for AgriDesk Frontend
 * Production-grade usage patterns and best practices
 */

// ============================================================================
// ================== EXAMPLE 1: LOGIN API CALL =============================
// ============================================================================

/**
 * Example Login Component with error handling and loading states
 */

import { useState } from 'react';
import AuthAPI from '../services/authAPI';

export function LoginExample() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // Call login API
            const response = await AuthAPI.login(email, password);

            if (response.success) {
                console.log('Login successful!');
                console.log('User:', response.data.user);
                console.log('Token:', response.data.token);
                
                setSuccess(true);
                // Redirect to dashboard
                window.location.href = '/dashboard';
            } else {
                setError(response.message || 'Login failed');
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message 
                || error.message 
                || 'An error occurred during login';
            setError(errorMessage);
            console.error('Login error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleLogin}>
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
            />
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
            />
            
            {error && <div className="error">{error}</div>}
            {success && <div className="success">Login successful!</div>}
            
            <button type="submit" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
            </button>
        </form>
    );
}

// ============================================================================
// ================ EXAMPLE 2: FETCH PRODUCTS API CALL ======================
// ============================================================================

/**
 * Example Products Listing Component with pagination
 */

import { useState, useEffect } from 'react';
import ProductAPI from '../services/productAPI';

export function ProductsListExample() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [category, setCategory] = useState('');

    useEffect(() => {
        fetchProducts();
    }, [page, category]); // Re-fetch when page or category changes

    const fetchProducts = async () => {
        setLoading(true);
        setError(null);

        try {
            // Call fetch products API with filters
            const response = await ProductAPI.getProducts({
                page,
                limit: 12,
                category: category || undefined,
                sortBy: 'createdAt',
                sortOrder: 'desc'
            });

            if (response.success) {
                setProducts(response.data.products);
                setTotalPages(response.data.totalPages);
            } else {
                setError(response.message || 'Failed to fetch products');
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message 
                || 'Failed to load products';
            setError(errorMessage);
            console.error('Products fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (keyword) => {
        setLoading(true);
        setError(null);
        setPage(1);

        try {
            // Search products
            const response = await ProductAPI.searchProducts(keyword, {
                page: 1,
                limit: 12
            });

            if (response.success) {
                setProducts(response.data.products);
                setTotalPages(response.data.totalPages);
            }
        } catch (error) {
            setError('Search failed');
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading products...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div>
            <div>
                <input
                    type="text"
                    placeholder="Search products..."
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            handleSearch(e.target.value);
                        }
                    }}
                />
                
                <select 
                    value={category} 
                    onChange={(e) => {
                        setCategory(e.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">All Categories</option>
                    <option value="vegetables">Vegetables</option>
                    <option value="fruits">Fruits</option>
                    <option value="grains">Grains</option>
                </select>
            </div>

            <div className="products-grid">
                {products.map((product) => (
                    <div key={product._id} className="product-card">
                        <img src={product.images[0]} alt={product.name} />
                        <h3>{product.name}</h3>
                        <p className="category">{product.category}</p>
                        <p className="price">₹{product.price} /{product.unit}</p>
                        <p className="description">{product.description}</p>
                        
                        <button onClick={() => handleAddToCart(product._id)}>
                            Add to Cart
                        </button>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            <div className="pagination">
                <button 
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                >
                    Previous
                </button>
                
                <span>Page {page} of {totalPages}</span>
                
                <button 
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                >
                    Next
                </button>
            </div>
        </div>
    );

    async function handleAddToCart(productId) {
        try {
            const response = await CartAPI.addToCart(productId, 1);
            if (response.success) {
                alert('Added to cart!');
            }
        } catch (error) {
            alert('Failed to add to cart');
        }
    }
}

// ============================================================================
// =============== EXAMPLE 3: PLACE ORDER API CALL ==========================
// ============================================================================

/**
 * Example Checkout Component with order placement
 */

import CartAPI from '../services/cartAPI';
import OrderAPI from '../services/orderAPI';

export function CheckoutExample() {
    const [cart, setCart] = useState(null);
    const [shippingAddress, setShippingAddress] = useState({
        fullName: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pinCode: '',
    });
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadCart();
    }, []);

    const loadCart = async () => {
        try {
            const response = await CartAPI.getCart();
            if (response.success) {
                setCart(response.data);
            }
        } catch (error) {
            setError('Failed to load cart');
        }
    };

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Validate cart
            const cartValidation = await CartAPI.validateCart();
            if (!cartValidation.success) {
                setError('Cart validation failed: ' + cartValidation.message);
                setLoading(false);
                return;
            }

            // Place order
            const response = await OrderAPI.placeOrder({
                items: cart.items,
                shippingAddress,
                email: AuthAPI.getStoredUser().email,
                paymentMethod,
                couponCode: cart.appliedCoupon?.code,
                specialInstructions: document.getElementById('instructions')?.value,
                scheduleDelivery: false
            });

            if (response.success) {
                console.log('Order placed successfully!');
                console.log('Order ID:', response.data._id);
                console.log('Order Number:', response.data.orderNumber);
                
                // Redirect to payment or order confirmation
                window.location.href = `/order-confirmation/${response.data._id}`;
            } else {
                setError(response.message || 'Failed to place order');
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message 
                || 'An error occurred while placing order';
            setError(errorMessage);
            console.error('Place order error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!cart) return <div>Loading checkout...</div>;

    return (
        <div className="checkout">
            <h2>Checkout</h2>
            
            {error && <div className="error">{error}</div>}

            {/* Order Summary */}
            <div className="order-summary">
                <h3>Order Summary</h3>
                <div className="cart-items">
                    {cart.items.map((item) => (
                        <div key={item.product._id} className="cart-item">
                            <span>{item.product.name}</span>
                            <span>Qty: {item.quantity}</span>
                            <span>₹{item.product.price * item.quantity}</span>
                        </div>
                    ))}
                </div>
                
                <div className="totals">
                    <div>Subtotal: ₹{cart.subtotal}</div>
                    <div>Discount: -₹{cart.discount || 0}</div>
                    <div>Shipping: ₹{cart.shippingCost || 0}</div>
                    <h4>Total: ₹{cart.total}</h4>
                </div>
            </div>

            {/* Shipping Address Form */}
            <form onSubmit={handlePlaceOrder}>
                <h3>Shipping Address</h3>
                
                <input
                    type="text"
                    placeholder="Full Name"
                    value={shippingAddress.fullName}
                    onChange={(e) => setShippingAddress({
                        ...shippingAddress,
                        fullName: e.target.value
                    })}
                    required
                />

                <input
                    type="tel"
                    placeholder="Phone Number"
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress({
                        ...shippingAddress,
                        phone: e.target.value
                    })}
                    required
                />

                <input
                    type="text"
                    placeholder="Address"
                    value={shippingAddress.address}
                    onChange={(e) => setShippingAddress({
                        ...shippingAddress,
                        address: e.target.value
                    })}
                    required
                />

                <input
                    type="text"
                    placeholder="City"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({
                        ...shippingAddress,
                        city: e.target.value
                    })}
                    required
                />

                <input
                    type="text"
                    placeholder="State"
                    value={shippingAddress.state}
                    onChange={(e) => setShippingAddress({
                        ...shippingAddress,
                        state: e.target.value
                    })}
                    required
                />

                <input
                    type="text"
                    placeholder="PIN Code"
                    value={shippingAddress.pinCode}
                    onChange={(e) => setShippingAddress({
                        ...shippingAddress,
                        pinCode: e.target.value
                    })}
                    required
                />

                {/* Payment Method Selection */}
                <h3>Payment Method</h3>
                <div>
                    <label>
                        <input
                            type="radio"
                            value="card"
                            checked={paymentMethod === 'card'}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                        />
                        Credit/Debit Card
                    </label>
                    <label>
                        <input
                            type="radio"
                            value="upi"
                            checked={paymentMethod === 'upi'}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                        />
                        UPI
                    </label>
                    <label>
                        <input
                            type="radio"
                            value="netbanking"
                            checked={paymentMethod === 'netbanking'}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                        />
                        Net Banking
                    </label>
                    <label>
                        <input
                            type="radio"
                            value="wallet"
                            checked={paymentMethod === 'wallet'}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                        />
                        Wallet
                    </label>
                </div>

                {/* Special Instructions */}
                <h3>Special Instructions</h3>
                <textarea
                    id="instructions"
                    placeholder="Any special delivery instructions..."
                    rows="3"
                />

                <button type="submit" disabled={loading}>
                    {loading ? 'Placing Order...' : 'Place Order'}
                </button>
            </form>
        </div>
    );
}

// ============================================================================
// ===================== ADDITIONAL USAGE PATTERNS ==========================
// ============================================================================

/**
 * Custom Hook for API calls with loading and error handling
 */
export function useAPI(apiCall) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const execute = async (...args) => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiCall(...args);
            setData(response);
            return response;
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message;
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { data, loading, error, execute };
}

// Usage:
// const { data: products, loading, error, execute: fetchProducts } = 
//     useAPI(ProductAPI.getProducts);

/**
 * Context API setup for managing authentication state
 */
export function useAuth() {
    const [user, setUser] = useState(AuthAPI.getStoredUser());
    const [loading, setLoading] = useState(false);

    const login = async (email, password) => {
        setLoading(true);
        try {
            const response = await AuthAPI.login(email, password);
            setUser(response.data.user);
            return response;
        } catch (error) {
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            await AuthAPI.logout();
            setUser(null);
        } catch (error) {
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return { user, loading, login, logout, isAuthenticated: !!user };
}

// ============================================================================
// ===================== ERROR HANDLING PATTERNS ============================
// ============================================================================

/**
 * Error handling utility
 */
export const handleAPIError = (error) => {
    if (error.response) {
        // Server responded with error
        const status = error.response.status;
        const message = error.response.data?.message || 'An error occurred';

        switch (status) {
            case 401:
                return 'Unauthorized. Please login again.';
            case 403:
                return 'Access denied.';
            case 404:
                return 'Resource not found.';
            case 429:
                return 'Too many requests. Please try again later.';
            case 500:
                return 'Server error. Please try again later.';
            default:
                return message;
        }
    } else if (error.request) {
        // Request made but no response
        return 'Network error. Please check your connection.';
    } else {
        // Error in request setup
        return 'An unexpected error occurred.';
    }
};
