# AgriDesk Frontend API Integration Guide

## Overview

This directory contains production-grade Axios API integration files for the AgriDesk frontend application. The API services are organized by domain and follow RESTful conventions.

## File Structure

```
src/services/
├── axiosConfig.js       # Base axios instance with interceptors
├── authAPI.js           # Authentication endpoints
├── productAPI.js        # Product listing, search, reviews
├── cartAPI.js           # Cart management, discounts
├── orderAPI.js          # Order creation, tracking, returns
├── paymentAPI.js        # Payment processing, receipts
├── apiExamples.jsx      # Usage examples and patterns
├── index.js             # Central exports
└── README.md            # This file
```

## Installation

### 1. Install Dependencies

```bash
npm install axios
```

### 2. Environment Configuration

Create a `.env` file in your project root:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

For production:

```env
REACT_APP_API_URL=https://api.agridesks.com/api
REACT_APP_ENV=production
```

### 3. Import Services

```javascript
import { AuthAPI, ProductAPI, CartAPI, OrderAPI, PaymentAPI } from './services';

// Or import individual services
import AuthAPI from './services/authAPI';
import ProductAPI from './services/productAPI';
```

## API Services

### AuthAPI - Authentication

Handles user authentication, registration, profile management.

**Key Methods:**
- `login(email, password)` - User login
- `register(userData)` - Register new user
- `logout()` - User logout
- `getProfile()` - Get current user profile
- `updateProfile(profileData)` - Update profile
- `changePassword(oldPassword, newPassword)` - Change password
- `requestPasswordReset(email)` - Reset password request
- `isAuthenticated()` - Check auth status

**Example:**
```javascript
try {
    const response = await AuthAPI.login('user@example.com', 'password123');
    console.log('Login successful!');
    console.log('User:', response.data.user);
} catch (error) {
    console.error('Login failed:', error);
}
```

### ProductAPI - Products

Handles product listing, search, filtering, reviews.

**Key Methods:**
- `getProducts(options)` - Fetch products with pagination/filters
- `getProduct(productId)` - Get single product
- `searchProducts(keyword, options)` - Search products
- `getProductsByCategory(category, options)` - Filter by category
- `addReview(productId, reviewData)` - Add product review
- `getReviews(productId, options)` - Get product reviews
- `createProduct(productData)` - Create product (farmer only)

**Example:**
```javascript
const response = await ProductAPI.getProducts({
    page: 1,
    limit: 20,
    category: 'vegetables',
    sortBy: 'price',
    sortOrder: 'asc'
});

console.log('Products:', response.data.products);
console.log('Total Pages:', response.data.totalPages);
```

**Search Example:**
```javascript
const results = await ProductAPI.searchProducts('tomato', {
    page: 1,
    limit: 10
});
```

### CartAPI - Shopping Cart

Handles cart operations, discounts, shipping estimates.

**Key Methods:**
- `getCart()` - Get user's cart
- `addToCart(productId, quantity)` - Add item
- `updateCartItem(productId, quantity)` - Update quantity
- `removeFromCart(productId)` - Remove item
- `clearCart()` - Clear entire cart
- `applyCoupon(couponCode)` - Apply coupon
- `estimateShipping(shippingData)` - Get shipping cost
- `validateCart()` - Validate cart items

**Example:**
```javascript
// Add to cart
const response = await CartAPI.addToCart('product123', 5);
console.log('Updated cart:', response.data);

// Apply coupon
const discountResponse = await CartAPI.applyCoupon('SAVE20');
console.log('Discount applied:', discountResponse.data.discount);

// Get cart summary
const summary = await CartAPI.getCartSummary();
console.log('Total: ₹' + summary.data.total);
```

### OrderAPI - Orders

Handles order creation, tracking, returns, cancellations.

**Key Methods:**
- `placeOrder(orderData)` - Place new order
- `getOrders(options)` - Get user's orders
- `getOrder(orderId)` - Get order details
- `cancelOrder(orderId, reason)` - Cancel order
- `getOrderTracking(orderId)` - Get tracking info
- `requestReturn(orderId, returnData)` - Request return
- `getInvoice(orderId)` - Get invoice

**Example: Place Order**
```javascript
const response = await OrderAPI.placeOrder({
    items: cartItems,
    shippingAddress: {
        fullName: 'John Doe',
        phone: '9876543210',
        address: '123 Main St',
        city: 'Bangalore',
        state: 'Karnataka',
        pinCode: '560001'
    },
    email: 'john@example.com',
    paymentMethod: 'card',
    couponCode: 'SAVE20'
});

console.log('Order created!');
console.log('Order ID:', response.data._id);
console.log('Order Number:', response.data.orderNumber);
```

**Get Order Tracking:**
```javascript
const tracking = await OrderAPI.getOrderTracking(orderId);
console.log('Status:', tracking.data.status);
console.log('Current Location:', tracking.data.currentLocation);
console.log('Estimated Delivery:', tracking.data.estimatedDelivery);
```

### PaymentAPI - Payments

Handles payment processing, methods, receipts.

**Key Methods:**
- `initiatePayment(paymentData)` - Initiate payment
- `processCardPayment(paymentData)` - Process card payment
- `processUPIPayment(paymentData)` - Process UPI payment
- `processNetBankingPayment(paymentData)` - Process net banking
- `verifyPayment(paymentId)` - Verify payment status
- `refundPayment(paymentId, refundData)` - Refund payment
- `getWalletBalance()` - Get wallet balance
- `addMoneyToWallet(amount, paymentMethod)` - Add to wallet

**Example: Process Card Payment**
```javascript
const response = await PaymentAPI.processCardPayment({
    orderId: order._id,
    amount: order.total,
    cardNumber: '4111111111111111',
    cardHolderName: 'John Doe',
    expiryDate: '12/25',
    cvv: '123',
    saveCard: true
});

if (response.success) {
    console.log('Payment successful!');
    console.log('Transaction ID:', response.data.transactionId);
}
```

**Example: Process UPI Payment**
```javascript
const response = await PaymentAPI.processUPIPayment({
    orderId: order._id,
    amount: order.total,
    upiId: 'user@upi',
    transactionId: 'UPI123456'
});
```

## Error Handling

All API methods return promises and handle errors consistently.

```javascript
try {
    const response = await ProductAPI.getProducts();
    // Handle success
} catch (error) {
    // error.response.status - HTTP status code
    // error.response.data.message - Error message from server
    // error.message - Axios error message
    
    if (error.response?.status === 401) {
        // Unauthorized - redirect to login
        window.location.href = '/login';
    } else if (error.response?.status === 404) {
        console.error('Resource not found');
    } else {
        console.error('An error occurred:', error.message);
    }
}
```

## Request/Response Interceptors

The `axiosConfig.js` file includes automatic interceptors:

**Request Interceptor:**
- Adds Authorization token from localStorage
- Logs requests in development mode

**Response Interceptor:**
- Handles 401 Unauthorized responses (redirect to login)
- Handles 403 Forbidden, 404 Not Found, 429 Rate Limit, 5xx Server errors
- Logs responses in development mode

## Best Practices

### 1. Use Loading States

```javascript
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
        const response = await ProductAPI.getProducts();
        // Handle success
    } catch (error) {
        setError(error.response?.data?.message || 'Error');
    } finally {
        setLoading(false);
    }
};
```

### 2. Handle Cleanup in Effects

```javascript
useEffect(() => {
    if (!mounted) return; // Prevent state update on unmounted component
    
    fetchData();
    
    return () => {
        mounted = false;
    };
}, []);
```

### 3. Store Auth Data Securely

```javascript
// Store token after login
localStorage.setItem('authToken', response.data.token);

// Retrieve in axios interceptor
const token = localStorage.getItem('authToken');

// Clear on logout
localStorage.removeItem('authToken');
localStorage.removeItem('user');
```

### 4. Validate User Input

```javascript
const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

if (!validateEmail(email)) {
    setError('Invalid email format');
    return;
}
```

### 5. Rate Limiting

The API enforces rate limiting. Handle 429 errors gracefully:

```javascript
if (error.response?.status === 429) {
    setTimeout(() => {
        retryRequest();
    }, 5000); // Retry after 5 seconds
}
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| REACT_APP_API_URL | API base URL | http://localhost:5000/api |
| REACT_APP_ENV | Environment (development/production) | development |

## Common Issues & Solutions

### Issue: Token Not Included in Requests

**Solution:** Ensure localStorage is being set correctly after login:

```javascript
localStorage.setItem('authToken', response.data.token);
```

### Issue: CORS Errors

**Solution:** Ensure backend has CORS enabled for your frontend URL.

### Issue: 401 Unauthorized After Login

**Solution:** Check token expiration and refresh token if needed:

```javascript
const response = await AuthAPI.refreshToken();
localStorage.setItem('authToken', response.data.token);
```

### Issue: Cart Not Persisting

**Solution:** Ensure AuthAPI is storing token correctly and subsequent requests include it.

## Testing

Example test file:

```javascript
// __tests__/ProductAPI.test.js
import ProductAPI from '../services/productAPI';

describe('ProductAPI', () => {
    it('should fetch products', async () => {
        const response = await ProductAPI.getProducts();
        expect(response.success).toBe(true);
        expect(Array.isArray(response.data.products)).toBe(true);
    });

    it('should search products', async () => {
        const response = await ProductAPI.searchProducts('tomato');
        expect(response.success).toBe(true);
    });
});
```

## Additional Resources

- [Axios Documentation](https://axios-http.com/docs/intro)
- [REST API Best Practices](https://restfulapi.net/)
- [Error Handling in React](https://reactjs.org/docs/error-boundaries.html)

## Troubleshooting

For more detailed debugging:

1. Check browser console for API request logs
2. Check Network tab in DevTools for request/response details
3. Verify environment variables are set correctly
4. Check backend logs for server-side errors
5. Ensure CORS is properly configured

## Support

For issues or questions, refer to the backend API documentation or contact the development team.
