/**
 * Centralized API SDK instance
 * 
 * This file exports a single SDK instance that uses the environment variable
 * for the base URL. All components should import from this file instead of
 * creating their own SDK instances.
 */

import api from "@/utils/sdk";

export { api };

