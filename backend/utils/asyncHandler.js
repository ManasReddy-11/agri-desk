/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors automatically
 * Usage: router.get('/route', asyncHandler(controllerFunction))
 */

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
