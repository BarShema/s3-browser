#!/bin/bash

# CloudFront Deployment Script
# This script builds the frontend, uploads to S3, and creates/updates CloudFront distribution

set -e

# Configuration
BUCKET_NAME="${S3_BUCKET_NAME:-idits-drive-frontend-dev}"
CLOUDFRONT_DOMAIN="${CLOUDFRONT_DOMAIN:-dev.idit.photos}"
DISTRIBUTION_ID="${CLOUDFRONT_DIST_ID:-}"
REGION="${AWS_REGION:-eu-west-1}"
PROFILE="${AWS_PROFILE:-default}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting CloudFront deployment...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Step 1: Build the static export
echo -e "${YELLOW}Step 1: Building static export...${NC}"
export NEXT_EXPORT=true
npm run build

if [ ! -d "out" ]; then
    echo -e "${RED}Error: Build output directory 'out' not found. Build may have failed.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build completed successfully${NC}"

# Step 2: Create S3 bucket if it doesn't exist
echo -e "${YELLOW}Step 2: Ensuring S3 bucket exists...${NC}"
if ! aws s3 ls "s3://${BUCKET_NAME}" --profile "${PROFILE}" 2>&1 | grep -q 'NoSuchBucket'; then
    echo "Bucket ${BUCKET_NAME} exists"
else
    echo "Creating bucket ${BUCKET_NAME}..."
    aws s3 mb "s3://${BUCKET_NAME}" --region "${REGION}" --profile "${PROFILE}"
    
    # Enable static website hosting
    aws s3 website "s3://${BUCKET_NAME}" \
        --index-document index.html \
        --error-document index.html \
        --profile "${PROFILE}"
    
    # Set bucket policy for CloudFront (will be updated when CloudFront is created)
    echo "Bucket created successfully"
fi

# Step 3: Upload files to S3
echo -e "${YELLOW}Step 3: Uploading files to S3...${NC}"
aws s3 sync out/ "s3://${BUCKET_NAME}" \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "*.html" \
    --profile "${PROFILE}"

# Upload HTML files with no-cache
aws s3 sync out/ "s3://${BUCKET_NAME}" \
    --delete \
    --cache-control "public, max-age=0, must-revalidate" \
    --include "*.html" \
    --profile "${PROFILE}"

# Upload with correct content types
aws s3 cp out/ "s3://${BUCKET_NAME}" \
    --recursive \
    --content-type "text/html" \
    --exclude "*" \
    --include "*.html" \
    --metadata-directive REPLACE \
    --profile "${PROFILE}"

echo -e "${GREEN}✓ Files uploaded to S3${NC}"

# Step 4: Create or update CloudFront distribution
echo -e "${YELLOW}Step 4: Setting up CloudFront distribution...${NC}"

if [ -z "${DISTRIBUTION_ID}" ]; then
    echo "Creating new CloudFront distribution..."
    
    # Get ACM certificate ARN if provided
    CERT_ARN="${ACM_CERTIFICATE_ARN:-}"
    
    # Create CloudFront distribution
    DIST_CONFIG=$(cat <<EOF
{
  "CallerReference": "idits-drive-dev-$(date +%s)",
  "Comment": "CloudFront distribution for ${CLOUDFRONT_DOMAIN}",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-${BUCKET_NAME}",
        "DomainName": "${BUCKET_NAME}.s3.${REGION}.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-${BUCKET_NAME}",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "Compress": true,
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000,
    "ForwardedValues": {
      "QueryString": true,
      "Cookies": {
        "Forward": "none"
      },
      "Headers": {
        "Quantity": 1,
        "Items": ["CloudFront-Forwarded-Proto"]
      }
    }
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      }
    ]
  },
  "PriceClass": "PriceClass_100",
  "Aliases": {
    "Quantity": 1,
    "Items": ["${CLOUDFRONT_DOMAIN}"]
  }
}
EOF
)
    
    # Add SSL certificate if provided
    if [ -n "${CERT_ARN}" ]; then
        DIST_CONFIG=$(echo "${DIST_CONFIG}" | jq ".ViewerCertificate = { 
            \"ACMCertificateArn\": \"${CERT_ARN}\",
            \"SSLSupportMethod\": \"sni-only\",
            \"MinimumProtocolVersion\": \"TLSv1.2_2021\"
        }")
    else
        DIST_CONFIG=$(echo "${DIST_CONFIG}" | jq ".ViewerCertificate = {
            \"CloudFrontDefaultCertificate\": true
        }")
    fi
    
    # Create distribution
    DIST_OUTPUT=$(aws cloudfront create-distribution \
        --distribution-config "${DIST_CONFIG}" \
        --profile "${PROFILE}" \
        --output json)
    
    DISTRIBUTION_ID=$(echo "${DIST_OUTPUT}" | jq -r '.Distribution.Id')
    DISTRIBUTION_DOMAIN=$(echo "${DIST_OUTPUT}" | jq -r '.Distribution.DomainName')
    
    echo -e "${GREEN}✓ CloudFront distribution created: ${DISTRIBUTION_ID}${NC}"
    echo -e "${GREEN}✓ Distribution domain: ${DISTRIBUTION_DOMAIN}${NC}"
    echo ""
    echo -e "${YELLOW}Important:${NC}"
    echo "1. Save this Distribution ID for future deployments: ${DISTRIBUTION_ID}"
    echo "2. Distribution deployment takes 10-15 minutes"
    echo "3. Update DNS to point ${CLOUDFRONT_DOMAIN} to ${DISTRIBUTION_DOMAIN}"
    echo ""
    echo "To get distribution status, run:"
    echo "  aws cloudfront get-distribution --id ${DISTRIBUTION_ID} --profile ${PROFILE}"
else
    echo "Updating existing CloudFront distribution: ${DISTRIBUTION_ID}"
    
    # Get current distribution config
    DIST_ETAG=$(aws cloudfront get-distribution-config \
        --id "${DISTRIBUTION_ID}" \
        --profile "${PROFILE}" \
        --query 'ETag' \
        --output text)
    
    # Create invalidation
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "${DISTRIBUTION_ID}" \
        --paths "/*" \
        --profile "${PROFILE}" \
        --query 'Invalidation.Id' \
        --output text)
    
    echo -e "${GREEN}✓ CloudFront invalidation created: ${INVALIDATION_ID}${NC}"
    echo "Invalidation will complete in a few minutes"
fi

echo ""
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Wait for CloudFront distribution to deploy (10-15 minutes)"
echo "2. Update DNS records for ${CLOUDFRONT_DOMAIN}"
echo "3. Access your site at https://${CLOUDFRONT_DOMAIN}"

