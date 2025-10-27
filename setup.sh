#!/bin/bash

# S3 File Browser Setup Script

echo "🚀 Setting up S3 File Browser..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
# AWS S3 Configuration
# Fill in your AWS credentials below

AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1

# AWS Cognito Configuration
NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-west-1_8z9y5UukG
NEXT_PUBLIC_COGNITO_CLIENT_ID=5j11hrr7qev1r38et7rh59htcg
NEXT_PUBLIC_COGNITO_URL=eu-west-18z9y5uukg.auth.eu-west-1.amazoncognito.com
EOF
    echo "✅ .env.local created!"
else
    echo "✅ .env.local already exists."
fi

echo ""
echo "📋 Next steps:"
echo "1. Edit .env.local with your AWS S3 credentials (AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY)"
echo "2. The Cognito configuration is already set up"
echo "3. Run 'npm run dev' to start the development server"
echo "4. Open http://localhost:3000 in your browser"
echo "5. You'll be redirected to login - use your Cognito credentials"
echo "6. After login, configure your S3 bucket name in the application"
echo ""
echo "🎉 Setup complete!"
