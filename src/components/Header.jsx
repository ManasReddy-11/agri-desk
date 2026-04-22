import Logo from './Logo';
import { useNavigate } from 'react-router-dom';
import AuthAPI from '../services/authAPI';

export default function Header({ showLogout = true, showCart = false, cartCount = 0 }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await AuthAPI.logout();
    } catch (error) {
      // Local auth state is cleared in AuthAPI even if the request fails.
    }

    navigate('/');
  };

  const goToCart = () => {
    navigate('/consumer/cart');
  };

  return (
    <div className="w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex-1">
          <Logo />
        </div>
        {showCart && (
          <button
            onClick={goToCart}
            className="relative mr-4 p-2 text-xl text-green-600 hover:text-green-700"
          >
            🛒
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        )}
        {showLogout && (
          <button
            onClick={handleLogout}
            className="ml-4 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            Logout
          </button>
        )}
      </div>
    </div>
  );
}
