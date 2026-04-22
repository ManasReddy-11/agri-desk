export const ROLE_HOME_ROUTES = {
  consumer: '/consumer',
  farmer: '/farmer',
  admin: '/admin',
};

export const LOGIN_ROUTE = '/login';

export function getUserRole(user) {
  return user?.role || user?.type || 'consumer';
}

export function getHomeRouteByRole(role) {
  return ROLE_HOME_ROUTES[role] || ROLE_HOME_ROUTES.consumer;
}
