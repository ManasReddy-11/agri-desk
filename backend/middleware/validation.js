import { validationResult } from 'express-validator';
import { AppError } from './errorHandler.js';

/**
 * Validation Error Handler Middleware
 * Checks for validation errors from express-validator
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => ({
      field: err.param,
      message: err.msg,
    }));

    throw new AppError(
      `Validation Error: ${errorMessages.map((e) => e.message).join(', ')}`,
      400
    );
  }

  next();
};

export default handleValidationErrors;
