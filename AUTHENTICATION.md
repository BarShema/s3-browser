# Authentication Setup Guide

This guide explains how AWS Cognito authentication is integrated into the S3 File Browser application.

## Overview

The application uses AWS Cognito for secure user authentication. All pages require authentication before access.

## Cognito Configuration

The application is already configured with these Cognito settings:

- **User Pool ID**: `eu-west-1_8z9y5UukG`
- **Client ID**: `5j11hrr7qev1r38et7rh59htcg`
- **Cognito URL**: `eu-west-18z9y5uukg.auth.eu-west-1.amazoncognito.com`

These values are configured in your `.env.local` file as `NEXT_PUBLIC_COGNITO_*` variables.

## Authentication Flow

1. **Initial Access**: When users visit the application, they're redirected to `/login` if not authenticated
2. **Login**: Users enter their Cognito username and password
3. **Session**: After successful login, users receive a session token
4. **Page Protection**: All pages check for valid authentication
5. **Logout**: Users can logout from the top right menu, which clears their session

## Features

### Login Page
- Modern, responsive design
- Username and password fields
- Error handling for authentication failures
- Loading states during authentication
- Automatic redirect after successful login

### Protected Routes
- All pages require authentication
- `AuthGuard` component wraps protected content
- Automatic redirect to `/login` for unauthenticated users
- Session checking every 5 minutes

### User Menu
- Displays username and email (if available)
- Logout button in the top right
- Visible on all authenticated pages

### Session Management
- Sessions are validated on app load
- Automatic session refresh
- Session state is managed globally via React Context

## Error Handling

The application handles various authentication errors:

- **UserNotConfirmedException**: Email not verified
- **PasswordResetRequiredException**: Password reset required
- **UserNotFoundException**: User not found
- **NotAuthorizedException**: Incorrect credentials

## Development

### Environment Variables

Required environment variables for authentication:

```env
NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-west-1_8z9y5UukG
NEXT_PUBLIC_COGNITO_CLIENT_ID=5j11hrr7qev1r38et7rh59htcg
NEXT_PUBLIC_COGNITO_URL=eu-west-18z9y5uukg.auth.eu-west-1.amazoncognito.com
```

### Key Components

1. **AuthService** (`src/lib/auth.ts`): Handles Cognito authentication operations
2. **AuthContext** (`src/contexts/AuthContext.tsx`): Global authentication state
3. **AuthGuard** (`src/components/AuthGuard.tsx`): Protects pages from unauthorized access
4. **Login Page** (`src/app/login/page.tsx`): User login interface

### Testing Authentication

1. Start the application: `npm run dev`
2. Navigate to `http://localhost:3000`
3. You should be redirected to `/login`
4. Enter your Cognito credentials
5. After successful login, you'll be redirected to the main page

## Security Best Practices

1. **Credentials**: Never commit `.env.local` to version control
2. **HTTPS**: Always use HTTPS in production
3. **Session Management**: Sessions are automatically validated and refreshed
4. **Token Storage**: Tokens are stored securely by Cognito SDK
5. **Logout**: Always logout when done to clear session

## Troubleshooting

### Login fails with "Invalid username or password"
- Verify your Cognito credentials
- Check that your user exists in the Cognito User Pool
- Ensure the password is correct

### Redirected to login after authentication
- Check browser console for errors
- Verify Cognito configuration in `.env.local`
- Ensure the user is confirmed in Cognito

### "User not found" error
- Verify your username is correct
- Check that the user exists in the Cognito User Pool
- Ensure the User Pool ID matches the configuration

### Session expires immediately
- Check that the Cognito client configuration is correct
- Verify the session refresh token is valid
- Check browser console for Cognito errors

## Production Deployment

When deploying to production:

1. Set environment variables in your hosting platform
2. Ensure all `NEXT_PUBLIC_*` variables are configured
3. Use HTTPS for all connections
4. Configure CORS in Cognito if needed
5. Set up CloudFront/CDN for improved performance

## User Management

Users are managed through AWS Cognito Console:
- AWS Console → Cognito → User Pools
- Create new users
- Reset passwords
- Configure user attributes
- Manage user permissions

## Additional Resources

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [Cognito JavaScript SDK](https://docs.amplify.aws/sdk/auth/)
- [Next.js Authentication](https://nextjs.org/docs/authentication)
