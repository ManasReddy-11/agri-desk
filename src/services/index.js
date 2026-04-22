/**
 * API Services Index
 * Central export for all API services
 */

export { default as axiosInstance } from './axiosConfig';
export { default as AuthAPI } from './authAPI';
export { default as ProductAPI } from './productAPI';
export { default as CartAPI } from './cartAPI';
export { default as OrderAPI } from './orderAPI';
export { default as PaymentAPI } from './paymentAPI';

// Export utility functions if they exist
export * from './apiExamples';
