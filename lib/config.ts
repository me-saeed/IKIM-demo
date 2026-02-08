/**
 * API base URL. Prefer NEXT_PUBLIC_API_BASE_URL from .env.local.
 * In development, falls back so the app works locally without env set.
 */
export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (process.env.NODE_ENV === 'development') {
    return 'https://api.ovok.com';
  }
  return '';
}
