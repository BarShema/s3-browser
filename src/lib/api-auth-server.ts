'use server';

import { CognitoJwtVerifier } from 'aws-jwt-verify';

/**
 * Verify the authorization token from the request header
 * This function is intended for server-side use in API routes
 */
export async function verifyAuthorizationToken(
  authHeader: string | null
): Promise<{ valid: boolean; username?: string; error?: string }> {
  if (!authHeader) {
    return { valid: false, error: 'Authorization header is missing' };
  }

  // Extract token from "Bearer <token>" format
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : authHeader;

  if (!token) {
    return { valid: false, error: 'Token is missing from Authorization header' };
  }

  try {
    // Get Cognito User Pool ID from environment
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
    
    if (!userPoolId) {
      // If Cognito is not configured, skip verification (development mode)
      console.warn('Cognito not configured, skipping token verification');
      return { valid: true, username: 'anonymous' };
    }

    // Create verifier (userPoolId format: region_userPoolId, e.g., us-east-1_xxxxxxxx)
    const verifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: 'id',
    });

    // Verify the token
    const payload = await verifier.verify(token);
    
    return {
      valid: true,
      username: payload['cognito:username'] || payload.sub || 'unknown',
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Token verification failed',
    };
  }
}

