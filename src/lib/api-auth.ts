import { AuthService } from './auth';

/**
 * Get the authorization token from the current Cognito session
 * This function is intended for client-side use
 */
export async function getAuthorizationToken(): Promise<string | null> {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user || !user.session) {
      return null;
    }

    const idToken = user.session.getIdToken();
    return idToken.getJwtToken();
  } catch (error) {
    console.error('Error getting authorization token:', error);
    return null;
  }
}

