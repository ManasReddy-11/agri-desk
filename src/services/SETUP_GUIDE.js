/**
 * AgriDesk Frontend - API Integration Setup Guide
 * Quick start configuration
 */

// ============================================================================
// STEP 1: INSTALL DEPENDENCIES
// ============================================================================

/*
Run in your project root:

npm install axios

Optional (recommended for production):
npm install --save-dev react-query
npm install --save-dev swr

*/

// ============================================================================
// STEP 2: ENVIRONMENT VARIABLES
// ============================================================================

/*
Create .env file in project root:

# Development
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
REACT_APP_DEBUG=true

# Production (update these for your deployment)
# REACT_APP_API_URL=https://api.agridesks.com/api
# REACT_APP_ENV=production
# REACT_APP_DEBUG=false

Note: .env file should be in .gitignore
*/

// ============================================================================
// STEP 3: UPDATE VITE CONFIG (if using Vite)
// ============================================================================

/*
In vite.config.js, add proxy for development:

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  }
})
*/

// ============================================================================
// STEP 4: IMPORT SERVICES IN YOUR APP
// ============================================================================

/*
In your main App.jsx or main component:

import { AuthAPI, ProductAPI, CartAPI, OrderAPI, PaymentAPI } from './services';

// Check authentication on app load
useEffect(() => {
    const user = AuthAPI.getStoredUser();
    if (user) {
        console.log('User logged in as:', user.name);
        // Set user in app state
    }
}, []);
*/

// ============================================================================
// STEP 5: AUTHENTICATE USER
// ============================================================================

/*
Example: Login Component Implementation

import { AuthAPI } from './services';
import { useState } from 'react';

function LoginComponent() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleLogin(e) {
        e.preventDefault();
        setLoading(true);
        
        try {
            const response = await AuthAPI.login(email, password);
            
            if (response.success) {
                // Token is automatically stored by AuthAPI
                // Redirect to dashboard
                window.location.href = '/dashboard';
            }
        } catch (error) {
            console.error('Login failed:', error);
            alert(error.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    }

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
            <button type="submit" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
            </button>
        </form>
    );
}
*/

// ============================================================================
// STEP 6: FETCH PRODUCTS
// ============================================================================

/*
Example: Products Listing Component

import { ProductAPI } from './services';
import { useState, useEffect } from 'react';

function ProductsComponent() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetchProducts();
    }, [page]);

    async function fetchProducts() {
        setLoading(true);
        try {
            const response = await ProductAPI.getProducts({
                page,
                limit: 12
            });
            
            if (response.success) {
                setProducts(response.data.products);
            }
        } catch (error) {
            console.error('Failed to load products:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div>Loading...</div>;

    return (
        <div className="products-grid">
            {products.map(product => (
                <div key={product._id} className="product-card">
                    <h3>{product.name}</h3>
                    <p>₹{product.price}</p>
                    {/* Add to cart button */}
                </div>
            ))}
        </div>
    );
}
*/

// ============================================================================
// STEP 7: MANAGE SHOPPING CART
// ============================================================================

/*
Example: Cart Management

import { CartAPI } from './services';

// Add item to cart
async function addToCart(productId, quantity) {
    try {
        const response = await CartAPI.addToCart(productId, quantity);
        console.log('Item added. Cart total:', response.data.total);
    } catch (error) {
        console.error('Failed to add to cart:', error);
    }
}

// Get cart
async function getCart() {
    try {
        const response = await CartAPI.getCart();
        console.log('Cart items:', response.data.items);
        console.log('Cart total:', response.data.total);
    } catch (error) {
        console.error('Failed to load cart:', error);
    }
}

// Apply coupon
async function applyCoupon(code) {
    try {
        const response = await CartAPI.applyCoupon(code);
        console.log('Discount applied:', response.data.discount);
    } catch (error) {
        console.error('Invalid coupon:', error);
    }
}
*/

// ============================================================================
// STEP 8: PLACE ORDER
// ============================================================================

/*
Example: Checkout and Order Placement

import { OrderAPI, CartAPI } from './services';

async function checkoutOrder(shippingData, paymentMethod) {
    try {
        // Get current cart
        const cartResponse = await CartAPI.getCart();
        const cart = cartResponse.data;

        // Place order
        const orderResponse = await OrderAPI.placeOrder({
            items: cart.items,
            shippingAddress: shippingData,
            email: user.email,
            paymentMethod,
            couponCode: cart.appliedCoupon?.code
        });

        if (orderResponse.success) {
            console.log('Order placed! ID:', orderResponse.data._id);
            return orderResponse.data;
        }
    } catch (error) {
        console.error('Order placement failed:', error);
        throw error;
    }
}

// Track order
async function trackOrder(orderId) {
    try {
        const response = await OrderAPI.getOrderTracking(orderId);
        console.log('Status:', response.data.status);
        console.log('Location:', response.data.currentLocation);
    } catch (error) {
        console.error('Failed to track order:', error);
    }
}
*/

// ============================================================================
// STEP 9: PROCESS PAYMENT
// ============================================================================

/*
Example: Payment Processing

import { PaymentAPI } from './services';

// Card payment
async function payWithCard(cardDetails) {
    try {
        const response = await PaymentAPI.processCardPayment({
            orderId: order._id,
            amount: order.total,
            cardNumber: cardDetails.number,
            cardHolderName: cardDetails.name,
            expiryDate: cardDetails.expiry,
            cvv: cardDetails.cvv
        });

        if (response.success) {
            console.log('Payment successful!');
            console.log('Transaction ID:', response.data.transactionId);
        }
    } catch (error) {
        console.error('Payment failed:', error);
    }
}

// UPI payment
async function payWithUPI(upiId) {
    try {
        const response = await PaymentAPI.processUPIPayment({
            orderId: order._id,
            amount: order.total,
            upiId
        });

        if (response.success) {
            console.log('UPI payment successful!');
        }
    } catch (error) {
        console.error('UPI payment failed:', error);
    }
}

// Wallet payment
async function payWithWallet() {
    try {
        const response = await PaymentAPI.processWalletPayment({
            orderId: order._id,
            amount: order.total
        });

        if (response.success) {
            console.log('Wallet payment successful!');
        }
    } catch (error) {
        console.error('Wallet payment failed:', error);
    }
}
*/

// ============================================================================
// STEP 10: HANDLE AUTHENTICATION STATE
// ============================================================================

/*
Example: Auth Context Setup

import { createContext, useContext, useState, useEffect } from 'react';
import { AuthAPI } from './services';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is already logged in
        const storedUser = AuthAPI.getStoredUser();
        if (storedUser) {
            setUser(storedUser);
        }
        setLoading(false);
    }, []);

    async function login(email, password) {
        try {
            const response = await AuthAPI.login(email, password);
            setUser(response.data.user);
            return response;
        } catch (error) {
            throw error;
        }
    }

    async function logout() {
        try {
            await AuthAPI.logout();
            setUser(null);
        } catch (error) {
            throw error;
        }
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}

// Usage in components:
function Dashboard() {
    const { user } = useAuth();
    return <h1>Welcome, {user?.name}!</h1>;
}
*/

// ============================================================================
// STEP 11: PROTECTED ROUTES
// ============================================================================

/*
Example: Protected Route Component

import { useAuth } from './context/AuthContext';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    return children;
}

// Usage:
<Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route 
        path="/dashboard" 
        element={
            <ProtectedRoute>
                <Dashboard />
            </ProtectedRoute>
        } 
    />
</Routes>
*/

// ============================================================================
// STEP 12: ERROR HANDLING & DEBUGGING
// ============================================================================

/*
Enable detailed logging in development:

// Add to axiosConfig.js response interceptor
if (process.env.NODE_ENV === 'development') {
    console.log('[API Response]', {
        status: response.status,
        url: response.config.url,
        data: response.data
    });
}

// Check network requests in DevTools
// Network tab -> XHR -> Check headers and payload

// Check localStorage for token
localStorage.getItem('authToken')

// Check browser console for error messages
console.error(error)
*/

// ============================================================================
// TROUBLESHOOTING CHECKLIST
// ============================================================================

/*
✓ Dependencies installed (npm install axios)
✓ .env file created with API_URL
✓ Backend server running on correct port
✓ CORS enabled on backend
✓ Token stored after login (check localStorage)
✓ Token included in requests (check Network tab)
✓ Environment variables loaded (check import.meta.env)
✓ Protected routes configured
✓ Error messages displayed to user
✓ Loading states properly managed

Common errors and fixes:

Error: "Cannot find module 'axios'"
Fix: npm install axios

Error: "Cannot read property 'data' of undefined"
Fix: Check response structure, use response?.data?.data

Error: CORS error
Fix: Enable CORS on backend for your frontend URL

Error: 401 Unauthorized
Fix: Check token in localStorage, clear and re-login

Error: Blank page after login
Fix: Check protected routes configuration, check console errors

Error: Cart not updating
Fix: Ensure user is authenticated, check token in requests
*/

// ============================================================================
// NEXT STEPS
// ============================================================================

/*
1. Install axios: npm install axios
2. Create .env file with API_URL
3. Copy service files to src/services/
4. Update App.jsx to use services
5. Test login flow
6. Test product listing
7. Test cart operations
8. Test checkout and payment
9. Deploy to production
10. Monitor error logs
*/

export const setupGuide = {
    step1: "Install axios: npm install axios",
    step2: "Create .env file with REACT_APP_API_URL",
    step3: "Copy API service files to src/services/",
    step4: "Import services in components",
    step5: "Use AuthAPI for login/logout",
    step6: "Use ProductAPI for fetching products",
    step7: "Use CartAPI for cart management",
    step8: "Use OrderAPI for order operations",
    step9: "Use PaymentAPI for payments",
    step10: "Test all flows before production"
};
