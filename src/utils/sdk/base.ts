/**
 * Base API Class
 * 
 * Provides core functionality for making HTTP requests with a configurable base URL.
 * Can be used as a base class for specific API modules.
 */
export class BaseAPI {
  protected baseUrl: string;

  constructor(baseUrl?: string | null) {
    // Get base URL from environment variable first, then constructor, or throw error
    const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    
    if (envBaseUrl !== undefined && envBaseUrl !== null) {
      this.baseUrl = envBaseUrl;
    } else if (baseUrl !== undefined && baseUrl !== null) {
      this.baseUrl = baseUrl;
    } else {
      throw new Error(
        "API base URL is required. Provide it via constructor or set NEXT_PUBLIC_API_BASE_URL environment variable."
      );
    }
  }

  /**
   * Get the current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Set a new base URL
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  /**
   * Build a full URL from an endpoint path
   */
  protected buildUrl(endpoint: string): string {
    // Remove leading slash from endpoint if present
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
    
    // If baseUrl is empty string, use relative URLs
    if (this.baseUrl === "") {
      return `/${cleanEndpoint}`;
    }
    
    // Remove trailing slash from baseUrl if present
    const cleanBaseUrl = this.baseUrl.endsWith("/") ? this.baseUrl.slice(0, -1) : this.baseUrl;
    
    return `${cleanBaseUrl}/${cleanEndpoint}`;
  }

  /**
   * Make a fetch request with error handling
   */
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = this.buildUrl(endpoint);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
        },
      });

      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Handle empty responses
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      }
      
      // For non-JSON responses, return the response object
      return response as unknown as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  }
}

