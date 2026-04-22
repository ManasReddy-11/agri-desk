import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';

export default function CartPage() {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeItem, totalPrice } = useCart();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100">
      <Header showLogout={true} showCart={false} />

      <div className="max-w-lg mx-auto px-4 py-6 pb-32">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Your Cart</h1>
          <p className="text-gray-600">
            {cartItems.length === 0 ? 'No items yet' : `${cartItems.length} item${cartItems.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-md p-12 text-center">
            <p className="text-5xl mb-4">🛒</p>
            <p className="text-gray-600 text-lg font-medium mb-6">Your cart is empty</p>
            <button
              onClick={() => navigate('/consumer')}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-2xl hover:bg-green-700 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="space-y-4 mb-6">
              {cartItems.map((item) => (
                <div
                  key={item.id || item._id}
                  className="bg-white rounded-3xl shadow-md p-4 flex gap-4 hover:shadow-lg transition-shadow"
                >
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center text-4xl">
                      {typeof item.image === 'string' && (item.image.startsWith('http://') || item.image.startsWith('https://')) ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <span>{item.image || '🧺'}</span>
                      )}
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="flex-grow">
                    <h3 className="font-bold text-gray-800 text-sm mb-1">{item.name}</h3>
                    <p className="text-xs text-gray-500 mb-2">{item.farmerName || item.farmer?.name || (typeof item.farmer === 'string' ? item.farmer : 'Local Farmer')}</p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                        {item.unit}
                      </span>
                      <p className="text-sm font-bold text-green-600">₹{item.price}</p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 bg-gray-100 rounded-full w-fit px-2 py-1">
                      <button
                        onClick={() => updateQuantity(item.id || item._id, -1)}
                        className="w-6 h-6 rounded-full bg-white text-gray-600 font-bold hover:bg-gray-200 transition-colors flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="px-2 font-semibold text-gray-800 min-w-[2rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id || item._id, 1)}
                        className="w-6 h-6 rounded-full bg-white text-gray-600 font-bold hover:bg-gray-200 transition-colors flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Price and Remove */}
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => removeItem(item.id || item._id)}
                      className="text-red-500 hover:text-red-700 text-xl font-bold transition-colors"
                      title="Remove from cart"
                    >
                      ✕
                    </button>
                    <div className="text-right">
                      <p className="text-xs text-gray-600 mb-1">Subtotal</p>
                      <p className="text-lg font-bold text-green-600">
                        ₹{item.price * item.quantity}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-3xl shadow-md p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Order Summary</h3>
              
              <div className="space-y-2 mb-4 pb-4 border-b-2 border-gray-200">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span>₹{totalPrice}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Delivery</span>
                  <span className="text-green-600 font-semibold">Free</span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="text-lg font-bold text-gray-800">Total</span>
                <span className="text-2xl font-bold text-green-600">₹{totalPrice}</span>
              </div>

              <button
                onClick={() => navigate('/consumer/checkout')}
                className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-2xl hover:shadow-lg transition-all active:scale-95 text-lg"
              >
                Proceed to Checkout
              </button>
            </div>

            {/* Continue Shopping */}
            <button
              onClick={() => navigate('/consumer')}
              className="w-full py-3 border-2 border-green-600 text-green-600 font-semibold rounded-2xl hover:bg-green-50 transition-colors"
            >
              Continue Shopping
            </button>
          </>
        )}
      </div>
    </div>
  );
}