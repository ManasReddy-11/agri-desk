import { useState } from 'react';
import Header from '../components/Header';

export default function FarmerDashboard() {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [products, setProducts] = useState([
    { id: 1, name: 'Organic Tomatoes', quantity: 50, price: 45, status: 'Available' },
    { id: 2, name: 'Fresh Carrots', quantity: 75, price: 35, status: 'Available' },
    { id: 3, name: 'Sweet Potatoes', quantity: 30, price: 55, status: 'Low Stock' },
  ]);

  const [newProduct, setNewProduct] = useState({
    name: '',
    quantity: '',
    price: '',
  });

  const handleAddProduct = (e) => {
    e.preventDefault();
    if (newProduct.name && newProduct.quantity && newProduct.price) {
      setProducts([
        ...products,
        {
          id: products.length + 1,
          name: newProduct.name,
          quantity: parseInt(newProduct.quantity),
          price: parseInt(newProduct.price),
          status: 'Available',
        },
      ]);
      setNewProduct({ name: '', quantity: '', price: '' });
      setShowAddProduct(false);
    }
  };

  const handleDeleteProduct = (id) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  // Summary stats
  const totalProducts = products.reduce((sum, p) => sum + p.quantity, 0);
  const totalValue = products.reduce((sum, p) => sum + p.quantity * p.price, 0);
  const totalOrders = 24; // Sample data
  const completedOrders = 18; // Sample data

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100">
      {/* Header */}
      <Header showLogout={true} />

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-lg p-6 text-white mb-6">
          <h2 className="text-2xl font-bold mb-2">Welcome Back, Farmer!</h2>
          <p className="text-green-100">Manage your products and track orders</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-md p-4">
            <p className="text-gray-600 text-sm font-medium mb-1">Total Products</p>
            <p className="text-3xl font-bold text-green-600">{totalProducts}</p>
            <p className="text-xs text-gray-500 mt-2">Units in stock</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-4">
            <p className="text-gray-600 text-sm font-medium mb-1">Inventory Value</p>
            <p className="text-2xl font-bold text-green-600">₹{totalValue.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-2">Total worth</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-4">
            <p className="text-gray-600 text-sm font-medium mb-1">Orders</p>
            <p className="text-3xl font-bold text-green-600">{totalOrders}</p>
            <p className="text-xs text-gray-500 mt-2">Total received</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-4">
            <p className="text-gray-600 text-sm font-medium mb-1">Completed</p>
            <p className="text-3xl font-bold text-green-600">{completedOrders}</p>
            <p className="text-xs text-gray-500 mt-2">Orders done</p>
          </div>
        </div>

        {/* Add Product Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Your Products</h3>
            <button
              onClick={() => setShowAddProduct(!showAddProduct)}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              + Add Product
            </button>
          </div>

          {/* Add Product Form */}
          {showAddProduct && (
            <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
              <form onSubmit={handleAddProduct} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, name: e.target.value })
                    }
                    placeholder="e.g., Tomatoes"
                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:outline-none text-gray-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity (kg)
                    </label>
                    <input
                      type="number"
                      value={newProduct.quantity}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          quantity: e.target.value,
                        })
                      }
                      placeholder="50"
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:outline-none text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (₹/kg)
                    </label>
                    <input
                      type="number"
                      value={newProduct.price}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, price: e.target.value })
                      }
                      placeholder="50"
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:outline-none text-gray-800"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Add Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(false)}
                    className="flex-1 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Product List */}
        <div className="space-y-3">
          {products.length > 0 ? (
            products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl shadow-md p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 mb-1">{product.name}</h4>
                  <div className="flex gap-4 text-sm text-gray-600 mb-2">
                    <span>📦 {product.quantity} kg</span>
                    <span>₹{product.price}/kg</span>
                  </div>
                  <div
                    className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                      product.status === 'Available'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {product.status}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  🗑️
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl shadow-md">
              <p className="text-gray-500">No products added yet</p>
            </div>
          )}
        </div>

        {/* Order Summary Section */}
        <div className="mt-8 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Orders</h3>
          <div className="space-y-3">
            <div className="bg-white rounded-2xl shadow-md p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-800">Order #001</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  Completed
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">20 kg Tomatoes</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">18 Mar, 2026</span>
                <span className="font-bold text-green-600">₹900</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-800">Order #002</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  Processing
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">15 kg Carrots</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">19 Mar, 2026</span>
                <span className="font-bold text-green-600">₹525</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
