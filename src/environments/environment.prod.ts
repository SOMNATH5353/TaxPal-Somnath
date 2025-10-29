// Updated: ensure apiBaseUrl includes '/api' so constructed endpoints resolve correctly on production
export const environment = {
  production: true,
  apiBaseUrl: 'https://taxpal-backend.onrender.com/api',
  // legacy alias for any remaining references
  apiUrl: 'https://taxpal-backend.onrender.com/api'
};
