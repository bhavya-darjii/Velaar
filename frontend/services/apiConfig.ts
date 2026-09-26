/**
 * Centralized API base URL resolver.
 * Handles development (localhost) and production (velaar.vercel.app) cleanly.
 */

export const getApiBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/$/, '');
  }

  // If in browser and on production domain, use Render backend
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return 'https://velaar-api.onrender.com/api';
  }

  return 'http://localhost:5000/api';
};
