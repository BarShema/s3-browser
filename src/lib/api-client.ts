import { getAuthorizationToken } from './api-auth';

/**
 * Custom fetch wrapper that automatically adds Authorization header
 * to all API requests
 */
export async function apiFetch(
  url: string | URL,
  options: RequestInit = {}
): Promise<Response> {
  // Get authorization token
  const token = await getAuthorizationToken();

  // Merge headers
  const headers = new Headers(options.headers);

  // Add Authorization header if token is available
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Merge the headers back into options
  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  return fetch(url, fetchOptions);
}

