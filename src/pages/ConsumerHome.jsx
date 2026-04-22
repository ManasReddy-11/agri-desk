import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import OrderAPI from '../services/orderAPI';
import ProductAPI from '../services/productAPI';

export default function ConsumerHome() {
  const { addItem, cartItems } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [orders, setOrders] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [favoritesError, setFavoritesError] = useState('');
  const [productsError, setProductsError] = useState('');
  const [trackingByOrder, setTrackingByOrder] = useState({});
  const [trackingLoadingByOrder, setTrackingLoadingByOrder] = useState({});
  const [expandedTrackingOrderId, setExpandedTrackingOrderId] = useState('');

  const normalizeOrders = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.orders)) return payload.orders;
    if (Array.isArray(payload?.data?.orders)) return payload.data.orders;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  };

  const normalizeFavorites = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  };

  const getProductImage = (product) => {
    const imageUrl = product?.images?.[0]?.url || product?.thumbnail;
    if (imageUrl) {
      return <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />;
    }

    const productName = (product?.name || '').toLowerCase();
    const productKeywordEmoji = [
      { keywords: ['honey'], emoji: '🍯' },
      { keywords: ['carrot'], emoji: '🥕' },
      { keywords: ['mango'], emoji: '🥭' },
      { keywords: ['milk'], emoji: '🥛' },
      { keywords: ['tomato'], emoji: '🍅' },
      { keywords: ['onion'], emoji: '🧅' },
      { keywords: ['spinach'], emoji: '🥬' },
      { keywords: ['egg'], emoji: '🥚' },
      { keywords: ['pepper'], emoji: '🫑' },
      { keywords: ['potato'], emoji: '🥔' },
      { keywords: ['apple'], emoji: '🍎' },
      { keywords: ['banana'], emoji: '🍌' },
      { keywords: ['grape'], emoji: '🍇' },
    ];

    const keywordMatch = productKeywordEmoji.find(({ keywords }) =>
      keywords.some((keyword) => productName.includes(keyword))
    );

    if (keywordMatch) {
      return <span className="text-6xl drop-shadow-sm">{keywordMatch.emoji}</span>;
    }

    const categoryEmoji = {
      vegetables: '🥬',
      fruits: '🍎',
      dairy: '🥛',
      grains: '🌾',
      honey: '🍯',
      spices: '🌶️',
      meat: '🍖',
    };

    return <span className="text-6xl drop-shadow-sm">{categoryEmoji[product?.category] || '🧺'}</span>;
  };

  // Fetch orders when orders tab is active
  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Fetch favorites when favorites tab is active
  useEffect(() => {
    if (activeTab === 'favorites') {
      fetchFavorites();
    }
  }, [activeTab]);

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      setOrdersError('');
      const response = await OrderAPI.getOrders({ limit: 50 });
      setOrders(normalizeOrders(response));
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrdersError(error.response?.data?.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      setLoadingFavorites(true);
      setFavoritesError('');
      try {
        const response = await ProductAPI.getFavorites();
        setFavorites(normalizeFavorites(response));
      } catch (error) {
        // If favorites endpoint doesn't exist, show friendly message
        if (error.response?.status === 404) {
          setFavorites([]);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setFavorites([]);
      // Don't show error for missing favorites feature
    } finally {
      setLoadingFavorites(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      setProductsError('');
      const response = await ProductAPI.getProducts({ limit: 50 });
      const productsList = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];
      setProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProductsError(error.response?.data?.message || 'Failed to load products');
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const addFavorite = async (productId) => {
    try {
      await ProductAPI.addToFavorites(productId);
      if (activeTab === 'favorites') {
        fetchFavorites();
      }
    } catch (error) {
      console.error('Error adding favorite:', error);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.farmer?.name || product.farmerName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusClass = (status) => {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'delivered') return 'bg-green-100 text-green-700';
    if (normalized === 'pending') return 'bg-yellow-100 text-yellow-700';
    if (normalized === 'cancelled' || normalized === 'rejected') return 'bg-red-100 text-red-700';
    return 'bg-blue-100 text-blue-700';
  };

  const formatDate = (value) => {
    if (!value) return 'Pending';
    return new Date(value).toLocaleString();
  };

  const handleTrackOrder = async (orderId) => {
    if (!orderId) return;

    const isExpanded = expandedTrackingOrderId === orderId;
    if (isExpanded) {
      setExpandedTrackingOrderId('');
      return;
    }

    setExpandedTrackingOrderId(orderId);

    if (trackingByOrder[orderId]) {
      return;
    }

    try {
      setTrackingLoadingByOrder((prev) => ({ ...prev, [orderId]: true }));
      const response = await OrderAPI.getOrderTracking(orderId);
      const tracking = response?.data || response;
      setTrackingByOrder((prev) => ({ ...prev, [orderId]: tracking }));
    } catch (error) {
      console.error('Error fetching tracking details:', error);
      setTrackingByOrder((prev) => ({
        ...prev,
        [orderId]: {
          error: error.response?.data?.message || 'Failed to load tracking details',
        },
      }));
    } finally {
      setTrackingLoadingByOrder((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'orders', label: 'Orders', icon: '📦' },
    { id: 'favorites', label: 'Favorites', icon: '❤️' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100">
      {/* Header */}
      <Header showLogout={true} showCart={true} cartCount={cartItems.length} />

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-32">
        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products or farmers..."
            className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors placeholder-gray-400 text-gray-800 shadow-sm"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['All', 'Vegetables', 'Fruits', 'Dairy', 'Organic'].map((filter) => (
            <button
              key={filter}
              className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap bg-white text-gray-700 border border-gray-200 hover:border-green-500 hover:text-green-600 transition-all"
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'home' && (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Fresh Products</h2>
            
            {loadingProducts ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading products...</p>
              </div>
            ) : productsError ? (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-4">
                <p className="text-sm font-medium">{productsError}</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {filteredProducts.map((product) => (
                  <div
                    key={product._id || product.id}
                    className="bg-white rounded-3xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    {/* Product Image */}
                    <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-6 text-center min-h-[140px] flex items-center justify-center">
                      {getProductImage(product)}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <div>
                        <h3 className="font-bold text-gray-800 text-sm mb-1 line-clamp-2">
                          {product.name}
                        </h3>
                        <p className="text-xs text-gray-500 mb-2">{product.farmer?.name || product.farmerName || 'Local Farmer'}</p>

                        {/* Unit Badge */}
                        <div className="inline-block bg-green-50 px-2 py-1 rounded-full text-xs text-green-700 font-medium mb-3">
                          {product.unit || 'per kg'}
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-1">
                          <span className="text-amber-400">⭐</span>
                          <span className="text-xs font-medium text-gray-700">
                            {product.ratings || product.rating || 4.5}
                          </span>
                        </div>
                      </div>

                      {/* Price and Button */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xl font-bold text-green-600">
                            ₹{product.price}
                          </div>
                        </div>
                        <button
                          onClick={() => addFavorite(product._id)}
                          className="w-full mb-2 px-3 py-2 rounded-2xl border border-green-600 text-green-700 text-sm font-semibold hover:bg-green-50 transition-colors active:scale-95"
                        >
                          Add to Favorites
                        </button>
                        <button
                          onClick={() => addItem(product)}
                          className="w-full px-3 py-2 rounded-2xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors active:scale-95">
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-2xl mb-2">🔍</p>
                <p className="text-gray-500">No products found</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'orders' && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">My Orders</h2>
            
            {loadingOrders ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading orders...</p>
              </div>
            ) : ordersError ? (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-4">
                <p className="text-sm font-medium">{ordersError}</p>
              </div>
            ) : orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order._id}
                    className="bg-white rounded-2xl shadow-md p-4 hover:shadow-lg transition-all"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-600">
                          Order #{order.orderNumber || order._id.slice(-6).toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusClass(order.status)}`}>
                        {order.status?.toUpperCase() || 'PROCESSING'}
                      </span>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-sm text-gray-700 mb-2">
                        {order.items?.length || 0} items
                      </p>
                      <p className="text-lg font-bold text-green-600">
                        ₹{order.total || order.totalAmount || 0}
                      </p>

                      <button
                        onClick={() => handleTrackOrder(order._id)}
                        className="mt-3 w-full px-3 py-2 rounded-xl border border-green-600 text-green-700 text-sm font-semibold hover:bg-green-50 transition-colors"
                      >
                        {expandedTrackingOrderId === order._id ? 'Hide Tracking' : 'Track Order'}
                      </button>

                      {expandedTrackingOrderId === order._id && (
                        <div className="mt-3 bg-green-50 border border-green-100 rounded-xl p-3">
                          {trackingLoadingByOrder[order._id] ? (
                            <p className="text-sm text-gray-600">Loading tracking details...</p>
                          ) : trackingByOrder[order._id]?.error ? (
                            <p className="text-sm text-red-600">{trackingByOrder[order._id].error}</p>
                          ) : (
                            <>
                              <div className="mb-3">
                                <p className="text-xs text-gray-500">Tracking Number</p>
                                <p className="text-sm font-semibold text-gray-800">
                                  {trackingByOrder[order._id]?.trackingNumber || 'Not assigned yet'}
                                </p>
                              </div>

                              <div className="mb-3">
                                <p className="text-xs text-gray-500">Estimated Delivery</p>
                                <p className="text-sm font-semibold text-gray-800">
                                  {trackingByOrder[order._id]?.estimatedDelivery
                                    ? new Date(trackingByOrder[order._id].estimatedDelivery).toLocaleDateString()
                                    : 'Not available yet'}
                                </p>
                              </div>

                              <div className="space-y-2">
                                {(trackingByOrder[order._id]?.timeline || [
                                  { key: 'ordered', label: 'Order Placed', completedAt: trackingByOrder[order._id]?.orderDate },
                                  { key: 'accepted', label: 'Accepted', completedAt: trackingByOrder[order._id]?.acceptedDate },
                                  { key: 'packed', label: 'Packed', completedAt: trackingByOrder[order._id]?.packedDate },
                                  { key: 'shipped', label: 'Shipped', completedAt: trackingByOrder[order._id]?.shippedDate },
                                  { key: 'delivered', label: 'Delivered', completedAt: trackingByOrder[order._id]?.deliveredDate },
                                ]).map((step) => {
                                  const completed = Boolean(step.completedAt);
                                  const isCurrent = trackingByOrder[order._id]?.currentStep === step.key;

                                  return (
                                    <div key={step.key} className="flex items-start gap-2">
                                      <span className={`mt-1 h-2.5 w-2.5 rounded-full ${
                                        completed ? 'bg-green-600' : isCurrent ? 'bg-blue-600' : 'bg-gray-300'
                                      }`} />
                                      <div>
                                        <p className="text-sm font-medium text-gray-800">{step.label}</p>
                                        <p className="text-xs text-gray-500">{formatDate(step.completedAt)}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-2xl mb-2">📦</p>
                <p className="text-gray-600">No orders yet. Start shopping!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'favorites' && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">My Favorites</h2>
            
            {loadingFavorites ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading favorites...</p>
              </div>
            ) : favoritesError ? (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-4">
                <p className="text-sm font-medium">{favoritesError}</p>
              </div>
            ) : favorites.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {favorites.map((product) => (
                  <div
                    key={product._id}
                    className="bg-white rounded-3xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    {/* Product Image */}
                    <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-6 text-center min-h-[140px] flex items-center justify-center">
                      {getProductImage(product)}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <div>
                        <h3 className="font-bold text-gray-800 text-sm mb-1 line-clamp-2">
                          {product.name}
                        </h3>
                        <p className="text-xs text-gray-500 mb-2">{product.farmerName || product.farmer?.name || 'Local Farmer'}</p>

                        {/* Unit Badge */}
                        <div className="inline-block bg-green-50 px-2 py-1 rounded-full text-xs text-green-700 font-medium mb-3">
                          {product.unit || 'per kg'}
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-1">
                          <span className="text-amber-400">⭐</span>
                          <span className="text-xs font-medium text-gray-700">
                            {product.ratings || product.rating || 4.5}
                          </span>
                        </div>
                      </div>

                      {/* Price and Button */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xl font-bold text-green-600">
                            ₹{product.price || 0}
                          </div>
                        </div>
                        <button
                          onClick={() => addItem(product)}
                          className="w-full px-3 py-2 rounded-2xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors active:scale-95">
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-2xl mb-2">❤️</p>
                <p className="text-gray-600">No favorite products yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mx-auto flex items-center justify-center text-4xl font-bold text-white mb-2">
                👤
              </div>
              <h3 className="text-lg font-bold text-gray-800">Consumer User</h3>
              <p className="text-sm text-gray-600">consumer@agri.com</p>
            </div>
            <div className="space-y-3">
              <div className="pb-3 border-b border-gray-200">
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold text-gray-800">consumer@agri.com</p>
              </div>
              <div className="pb-3 border-b border-gray-200">
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-semibold text-gray-800">Mumbai, India</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Member Since</p>
                <p className="font-semibold text-gray-800">March 2026</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-20">
        <div className="max-w-lg mx-auto px-4 flex justify-around">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors ${
                activeTab === tab.id
                  ? 'text-green-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-semibold">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
