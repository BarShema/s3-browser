import { 
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

// Cognito configuration
const poolData = {
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
};

const userPool = new CognitoUserPool(poolData);

export interface AuthUser {
  username: string;
  email?: string;
  session: CognitoUserSession;
}

export class AuthService {
  /**
   * Sign in a user with username and password
   */
  static async signIn(username: string, password: string): Promise<AuthUser> {
    return new Promise((resolve, reject) => {
      const authenticationDetails = new AuthenticationDetails({
        Username: username,
        Password: password,
      });

      const cognitoUser = new CognitoUser({
        Username: username,
        Pool: userPool,
      });

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
          const user: AuthUser = {
            username: result.getIdToken().payload['cognito:username'] || username,
            email: result.getIdToken().payload.email,
            session: result,
          };
          resolve(user);
        },
        onFailure: (err) => {
          console.error('Authentication failed:', err);
          reject(err);
        },
      });
    });
  }

  /**
   * Sign out the current user
   */
  static async signOut(): Promise<void> {
    return new Promise((resolve, reject) => {
      const cognitoUser = userPool.getCurrentUser();
      
      if (cognitoUser) {
        cognitoUser.signOut(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get the current authenticated user
   */
  static async getCurrentUser(): Promise<AuthUser | null> {
    return new Promise((resolve, reject) => {
      // Check if Cognito is configured
      if (!poolData.UserPoolId || !poolData.ClientId) {
        console.warn('Cognito not configured');
        resolve(null);
        return;
      }

      const cognitoUser = userPool.getCurrentUser();
      
      if (!cognitoUser) {
        resolve(null);
        return;
      }

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        resolve(null);
      }, 3000);

      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        clearTimeout(timeout);
        
        if (err || !session) {
          resolve(null);
          return;
        }

        if (!session.isValid()) {
          resolve(null);
          return;
        }

        try {
          const user: AuthUser = {
            username: session.getIdToken().payload['cognito:username'] || cognitoUser.getUsername(),
            email: session.getIdToken().payload.email,
            session: session,
          };

          resolve(user);
        } catch (error) {
          console.error('Error extracting user info:', error);
          resolve(null);
        }
      });
    });
  }

  /**
   * Refresh the current session
   */
  static async refreshSession(): Promise<CognitoUserSession | null> {
    return new Promise((resolve, reject) => {
      const cognitoUser = userPool.getCurrentUser();
      
      if (!cognitoUser) {
        resolve(null);
        return;
      }

      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session) {
          resolve(null);
          return;
        }

        cognitoUser.refreshSession(session.getRefreshToken(), (err, session) => {
          if (err || !session) {
            resolve(null);
          } else {
            resolve(session);
          }
        });
      });
    });
  }

  /**
   * Check if the current session is valid
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return user !== null;
    } catch {
      return false;
    }
  }
}
