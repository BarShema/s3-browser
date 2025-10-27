#!/bin/bash

# S3 File Browser - IAM User Creation Script
# This script creates an IAM user with the necessary policies for the S3 File Browser application

set -e  # Exit on error

# Configuration
IAM_USER_NAME="${1:-s3-file-browser-user}"
BUCKET_NAME="${2:-}"
POLICY_NAME="${IAM_USER_NAME}-policy"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored messages
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials are not configured. Please run 'aws configure' first."
    exit 1
fi

echo ""
echo "=========================================="
echo "  S3 File Browser - IAM User Setup"
echo "=========================================="
echo ""

# Get bucket name if not provided
if [ -z "$BUCKET_NAME" ]; then
    print_info "Enter your S3 bucket name (required for policy):"
    read -r BUCKET_NAME
    
    if [ -z "$BUCKET_NAME" ]; then
        print_error "Bucket name cannot be empty"
        exit 1
    fi
fi

print_info "Configuration:"
echo "  IAM User Name: $IAM_USER_NAME"
echo "  S3 Bucket: $BUCKET_NAME"
echo ""

# Check if user already exists
if aws iam get-user --user-name "$IAM_USER_NAME" &> /dev/null; then
    print_warning "User '$IAM_USER_NAME' already exists"
    read -p "Do you want to continue and create new access keys? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Exiting..."
        exit 0
    fi
else
    # Create IAM user
    print_info "Creating IAM user: $IAM_USER_NAME"
    if aws iam create-user --user-name "$IAM_USER_NAME" --tags Key=Purpose,Value=S3FileBrowser Key=Application,Value=S3FileBrowser &> /dev/null; then
        print_success "IAM user created successfully"
    else
        print_error "Failed to create IAM user"
        exit 1
    fi
fi

# Create policy document
print_info "Creating IAM policy for bucket access"
POLICY_DOC=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3FileBrowserBucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::${BUCKET_NAME}"
    },
    {
      "Sid": "AllowS3FileBrowserObjectOperations",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObjectVersion"
      ],
      "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
    }
  ]
}
EOF
)

# Delete policy if it exists
if aws iam get-policy --policy-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/$POLICY_NAME" &> /dev/null; then
    print_warning "Policy '$POLICY_NAME' already exists. Deleting old version..."
    aws iam delete-policy --policy-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/$POLICY_NAME" 2>/dev/null || true
    sleep 2
fi

# Create new policy
POLICY_ARN=$(echo "$POLICY_DOC" | aws iam create-policy \
    --policy-name "$POLICY_NAME" \
    --policy-document "$POLICY_DOC" \
    --query 'Policy.Arn' \
    --output text 2>/dev/null || echo "")

if [ -n "$POLICY_ARN" ]; then
    print_success "Policy created: $POLICY_ARN"
else
    print_error "Failed to create policy"
    exit 1
fi

# Attach policy to user
print_info "Attaching policy to user"
if aws iam attach-user-policy --user-name "$IAM_USER_NAME" --policy-arn "$POLICY_ARN" &> /dev/null; then
    print_success "Policy attached to user"
else
    print_error "Failed to attach policy"
    exit 1
fi

# Generate access keys
print_info "Generating access keys"
KEYS_OUTPUT=$(aws iam create-access-key --user-name "$IAM_USER_NAME" 2>&1)
ACCESS_KEY_ID=$(echo "$KEYS_OUTPUT" | grep -o '"AccessKeyId": "[^"]*"' | cut -d'"' -f4)
SECRET_ACCESS_KEY=$(echo "$KEYS_OUTPUT" | grep -o '"SecretAccessKey": "[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_KEY_ID" ] || [ -z "$SECRET_ACCESS_KEY" ]; then
    print_error "Failed to generate access keys"
    exit 1
fi

print_success "Access keys generated successfully"

# Get AWS region
AWS_REGION=$(aws configure get region || echo "us-east-1")

# Save credentials to a file
CREDENTIALS_FILE=".env.credentials"
cat > "$CREDENTIALS_FILE" << EOF
# AWS S3 Credentials for S3 File Browser
# Generated on: $(date)
# IAM User: $IAM_USER_NAME
# S3 Bucket: $BUCKET_NAME

AWS_ACCESS_KEY_ID=$ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY
AWS_REGION=$AWS_REGION

# Cognito Configuration (already configured)
NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-west-1_8z9y5UukG
NEXT_PUBLIC_COGNITO_CLIENT_ID=5j11hrr7qev1r38et7rh59htcg
NEXT_PUBLIC_COGNITO_URL=eu-west-18z9y5uukg.auth.eu-west-1.amazoncognito.com
EOF

print_success "Credentials saved to: $CREDENTIALS_FILE"

# Print summary
echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
print_info "IAM User Created: $IAM_USER_NAME"
print_info "Policy Created: $POLICY_NAME"
print_info "S3 Bucket: $BUCKET_NAME"
echo ""
print_info "Access Key ID:"
echo "  $ACCESS_KEY_ID"
echo ""
print_info "Secret Access Key:"
echo "  $SECRET_ACCESS_KEY"
echo ""
print_warning "⚠  IMPORTANT: Save these credentials now! The secret key will not be shown again."
echo ""
print_info "Next steps:"
echo "  1. Review the credentials in: $CREDENTIALS_FILE"
echo "  2. Merge these credentials into your .env.local file:"
echo "     cat $CREDENTIALS_FILE >> .env.local"
echo "  3. Start the application: npm run dev"
echo ""
echo "=========================================="
