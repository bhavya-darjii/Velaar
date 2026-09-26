/**
 * Centralized API base URL resolver.
 *
 * - Production (Vercel): reads VITE_API_BASE_URL and always ensures it ends in /api
 *   e.g. "https://velaar-api.onrender.com" → "https://velaar-api.onrender.com/api"
 *   e.g. "https://velaar-api.onrender.com/api" → "https://velaar-api.onrender.com/api" (unchanged)
 * - Localhost: returns '' (empty string) so relative /api/* paths go through the Vite dev proxy
 *   which forwards them to http://localhost:5000
 */

export const getApiBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    const cleaned = envUrl.trim().replace(/\/$/, ''); // strip trailing slash
    // Always ensure URL ends with /api
    return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
  }

  // On localhost, return '' so callers use relative paths (/api/...)
  // Vite's dev server proxy (vite.config.ts) forwards them to http://localhost:5000
  return '';
};
