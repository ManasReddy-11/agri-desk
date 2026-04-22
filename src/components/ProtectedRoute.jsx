import { Navigate, useLocation } from 'react-router-dom';
import AuthAPI from '../services/authAPI';
import { getHomeRouteByRole, getUserRole, LOGIN_ROUTE } from '../constants/roleRoutes';

export default function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const user = AuthAPI.getStoredUser();
  const token = AuthAPI.getStoredToken();

  if (!user || !token) {
    const redirect = encodeURIComponent(location.pathname);
    return <Navigate to={`${LOGIN_ROUTE}?redirect=${redirect}`} replace />;
  }

  const userRole = getUserRole(user);

  if (allowedRoles?.length && !allowedRoles.includes(userRole)) {
    return <Navigate to={getHomeRouteByRole(userRole)} replace />;
  }

  return children;
}