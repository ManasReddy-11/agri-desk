import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useState } from 'react';
import { useCart } from '../context/CartContext';
import CartAPI from '../services/cartAPI';
import OrderAPI from '../services/orderAPI';

export default function Checkout() {
  const { cartItems, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    city: '',
    zipCode: '',
    phone: '',
    paymentMethod: 'cod',
  });

  const [errors, setErrors] = useState({});
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState('');

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.zipCode.trim()) newErrors.zipCode = 'Zip code is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!/^\d{10}$/.test(formData.phone)) newErrors.phone = 'Enter valid 10-digit phone number';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setPlacingOrder(true);
      setErrors((prev) => ({ ...prev, submit: '' }));

      // Rebuild server-side cart from current UI cart so backend can create order from cart.
      try {
        await CartAPI.clearCart();
      } catch (error) {
        const status = error.response?.status;
        const message = (error.response?.data?.message || '').toLowerCase();

        // Backend returns "Cart not found" if this user has never created a cart.
        if (!(status === 404 || message.includes('cart not found'))) {
          throw error;
        }
      }

      for (const item of cartItems) {
        const productId = item._id || item.id;
        if (!productId || typeof productId !== 'string') {
          throw new Error('One or more items are demo products. Re-add items from Home before checkout.');
        }

        await CartAPI.addToCart(productId, item.quantity || 1);
      }

      const orderResponse = await OrderAPI.placeOrder({
        shippingAddress: {
          fullName: formData.fullName,
          address: formData.address,
          city: formData.city,
          zipCode: formData.zipCode,
          phone: formData.phone,
        },
        paymentMethod: formData.paymentMethod,
      });

      const orderId = orderResponse?.data?.order?._id || '';
      setPlacedOrderId(orderId);
      setOrderPlaced(true);

      setTimeout(() => {
        clearCart();
        navigate('/consumer');
      }, 2000);
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to place order';
      setErrors((prev) => ({ ...prev, submit: message }));
    } finally {
      setPlacingOrder(false);
    }
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-sm w-full">
          <div className="text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Order Confirmed!</h2>
          <p className="text-gray-600 mb-6">
            Your order has been placed successfully. We'll deliver it soon!
          </p>
          <div className="bg-green-50 rounded-2xl p-4 mb-6">
            <p className="text-sm text-gray-600">Order ID</p>
            <p className="text-lg font-bold text-green-600">{placedOrderId ? `#${placedOrderId.slice(-8).toUpperCase()}` : 'Order Created'}</p>
          </div>
          <p className="text-sm text-gray-500">Redirecting to home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100">
      <Header showLogout={true} showCart={false} />

      <div className="max-w-lg mx-auto px-4 py-6 pb-32">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Checkout</h1>
          <p className="text-gray-600">Complete your order</p>
        </div>

        <form onSubmit={handlePlaceOrder} className="space-y-6">
          {errors.submit && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
              <p className="text-sm font-medium">{errors.submit}</p>
            </div>
          )}

          {/* Delivery Address Section */}
          <div className="bg-white rounded-3xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              📍 Delivery Address
            </h3>
            
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Your full name"
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none ${
                    errors.fullName 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:border-green-500'
                  } text-gray-800 placeholder-gray-400`}
                />
                {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="House / Apt, Street name"
                  rows={3}
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none resize-none ${
                    errors.address 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:border-green-500'
                  } text-gray-800 placeholder-gray-400`}
                />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
              </div>

              {/* City and Zip */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="City"
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none ${
                      errors.city 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 focus:border-green-500'
                    } text-gray-800 placeholder-gray-400`}
                  />
                  {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zip Code *
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    placeholder="Zip code"
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none ${
                      errors.zipCode 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 focus:border-green-500'
                    } text-gray-800 placeholder-gray-400`}
                  />
                  {errors.zipCode && <p className="text-red-500 text-xs mt-1">{errors.zipCode}</p>}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none ${
                    errors.phone 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:border-green-500'
                  } text-gray-800 placeholder-gray-400`}
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>
            </div>
          </div>

          {/* Payment Method Section */}
          <div className="bg-white rounded-3xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              💳 Payment Method
            </h3>
            
            <div className="space-y-3">
              {[
                { id: 'cod', label: 'Cash on Delivery', icon: '💵' },
                { id: 'card', label: 'Credit / Debit Card', icon: '💳' },
                { id: 'upi', label: 'UPI', icon: '📱' },
              ].map((method) => (
                <label
                  key={method.id}
                  className={`flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                    formData.paymentMethod === method.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={formData.paymentMethod === method.id}
                    onChange={handleChange}
                    className="w-5 h-5 text-green-600"
                  />
                  <span className="text-xl">{method.icon}</span>
                  <span className="font-medium text-gray-800">{method.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Order Summary Section */}
          <div className="bg-white rounded-3xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              📦 Order Summary
            </h3>
            
            <div className="space-y-3 mb-4 pb-4 border-b-2 border-gray-200 max-h-48 overflow-y-auto">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      ₹{item.price} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-bold text-green-600 text-sm">
                    ₹{item.price * item.quantity}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal ({cartItems.length} items)</span>
                <span>₹{totalPrice}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Delivery Charges</span>
                <span className="text-green-600 font-semibold">Free</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t-2 border-gray-200">
              <span className="text-lg font-bold text-gray-800">Total Amount</span>
              <span className="text-2xl font-bold text-green-600">₹{totalPrice}</span>
            </div>
          </div>

          {/* Place Order Button */}
          <button
            type="submit"
            disabled={placingOrder}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-2xl hover:shadow-lg transition-all active:scale-95 text-lg sticky bottom-6"
          >
            {placingOrder ? 'Placing Order...' : 'Place Order'}
          </button>
        </form>
      </div>
    </div>
  );
}