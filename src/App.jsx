import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ConsumerHome from './pages/ConsumerHome';
import FarmerDashboard from './pages/FarmerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CartPage from './pages/Cart';
import Checkout from './pages/Checkout';
import { ROLE_HOME_ROUTES, LOGIN_ROUTE } from './constants/roleRoutes';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <CartProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path={LOGIN_ROUTE} element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path={ROLE_HOME_ROUTES.consumer} element={<ProtectedRoute allowedRoles={['consumer']}><ConsumerHome /></ProtectedRoute>} />
          <Route path="/consumer/cart" element={<ProtectedRoute allowedRoles={['consumer']}><CartPage /></ProtectedRoute>} />
          <Route path="/consumer/checkout" element={<ProtectedRoute allowedRoles={['consumer']}><Checkout /></ProtectedRoute>} />
          <Route path={ROLE_HOME_ROUTES.farmer} element={<ProtectedRoute allowedRoles={['farmer']}><FarmerDashboard /></ProtectedRoute>} />
          <Route path={ROLE_HOME_ROUTES.admin} element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        </Routes>
      </Router>
    </CartProvider>
  );
}
