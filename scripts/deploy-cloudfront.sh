#!/bin/bash
# CloudFront Deployment Script
# Builds Next.js app and deploys to S3/CloudFront

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check environment variable is set
if [ -z "${env}" ]; then
    echo -e "${RED}Error: 'env' environment variable is required${NC}"
    echo "Valid values: dev, staging, prd, prod, production"
    echo "Usage: export env=dev && npm run deploy:cloudfront"
    exit 1
fi

cp .env.$env .env

# Validate env
case "${env}" in
    dev|staging|prd|prod|production)
        ;;
    *)
        echo -e "${RED}Error: Invalid env '${env}'${NC}"
        echo "Valid values: dev, staging, prd, prod, production"
        exit 1
        ;;
esac

# Configuration
REGION="${AWS_REGION:-eu-west-1}"
PROFILE="${AWS_PROFILE:-default}"
DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-EYU8H6F81BLU0}"
BUCKET_NAME="idits-drive-frontend-${env}"
BUILD_DIR="out"
S3_PREFIX=""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}CloudFront Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Environment: ${env}"
echo "Bucket: ${BUCKET_NAME}"
echo "Distribution ID: ${DISTRIBUTION_ID}"
echo "Region: ${REGION}"
echo ""

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Check if bucket exists
if ! aws s3 ls "s3://${BUCKET_NAME}" --region "${REGION}" --profile "${PROFILE}" &> /dev/null; then
    echo -e "${YELLOW}Bucket '${BUCKET_NAME}' does not exist. Creating...${NC}"
    aws s3 mb "s3://${BUCKET_NAME}" --region "${REGION}" --profile "${PROFILE}"
    echo -e "${GREEN}✓ Bucket created${NC}"
fi

# Step 1: Build Next.js app
echo -e "${YELLOW}Step 1: Building Next.js application...${NC}"
if [ -d "${BUILD_DIR}" ]; then
    rm -rf "${BUILD_DIR}"
fi

# Set environment variables for build
export NODE_ENV=production
export NEXT_PUBLIC_ENV="${env}"

npm run build

if [ ! -d "${BUILD_DIR}" ]; then
    echo -e "${RED}Error: Build output directory '${BUILD_DIR}' not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build completed${NC}"
echo ""

# Step 2: Upload to S3
echo -e "${YELLOW}Step 2: Uploading files to S3...${NC}"

# First, sync all static assets (JS, CSS, images, etc.) with long cache
aws s3 sync "${BUILD_DIR}/" "s3://${BUCKET_NAME}${S3_PREFIX}" \
    --region "${REGION}" \
    --profile "${PROFILE}" \
    --delete \
    --exact-timestamps \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "*.html" \
    --exclude "*.json" \
    --exclude "_next/static/*/BUILD_ID"

# Upload HTML files with no-cache for proper updates
aws s3 sync "${BUILD_DIR}/" "s3://${BUCKET_NAME}${S3_PREFIX}" \
    --region "${REGION}" \
    --profile "${PROFILE}" \
    --cache-control "public, max-age=0, must-revalidate" \
    --content-type "text/html; charset=utf-8" \
    --include "*.html"

# Upload JSON files (manifests, etc.) with no-cache
aws s3 sync "${BUILD_DIR}/" "s3://${BUCKET_NAME}${S3_PREFIX}" \
    --region "${REGION}" \
    --profile "${PROFILE}" \
    --cache-control "public, max-age=0, must-revalidate" \
    --content-type "application/json" \
    --include "*.json"

# Fix SPA routing: Handle /login route (only static route we need to support)
# All other routes (drives, files, directories) are fully dynamic and handled by
# CloudFront CustomErrorResponses serving index.html for 404/403 errors
echo -e "${YELLOW}Setting up SPA routing...${NC}"

# Copy /login/index.html to /login (without trailing slash) so /login URL works
if [ -f "${BUILD_DIR}/login/index.html" ]; then
    aws s3 cp "${BUILD_DIR}/login/index.html" "s3://${BUCKET_NAME}${S3_PREFIX}/login" \
        --region "${REGION}" \
        --profile "${PROFILE}" \
        --cache-control "public, max-age=0, must-revalidate" \
        --content-type "text/html; charset=utf-8" \
        --metadata-directive REPLACE \
        2>/dev/null && echo "  ✓ Created route: /login" || echo "  ✗ Failed: /login"
fi

# Note: All other routes (like /idits-drive, /portfolio-files2, /any/file/path) are dynamic.
# CloudFront CustomErrorResponses will serve /index.html for 404/403, and the client-side
# router will handle rendering the correct content based on the URL path.

echo -e "${GREEN}✓ Upload completed${NC}"
echo ""

# Step 3: Invalidate CloudFront cache
echo -e "${YELLOW}Step 3: Invalidating CloudFront cache...${NC}"

INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "${DISTRIBUTION_ID}" \
    --paths "/*" \
    --region "${REGION}" \
    --profile "${PROFILE}" \
    --query 'Invalidation.Id' \
    --output text)

if [ -n "${INVALIDATION_ID}" ]; then
    echo -e "${GREEN}✓ Cache invalidation created: ${INVALIDATION_ID}${NC}"
    echo -e "${YELLOW}Waiting for invalidation to complete...${NC}"
    
    # Wait for invalidation to complete (with timeout)
    TIMEOUT=300  # 5 minutes
    ELAPSED=0
    while [ $ELAPSED -lt $TIMEOUT ]; do
        STATUS=$(aws cloudfront get-invalidation \
            --distribution-id "${DISTRIBUTION_ID}" \
            --id "${INVALIDATION_ID}" \
            --region "${REGION}" \
            --profile "${PROFILE}" \
            --query 'Invalidation.Status' \
            --output text 2>/dev/null || echo "InProgress")
        
        if [ "${STATUS}" = "Completed" ]; then
            echo -e "${GREEN}✓ Cache invalidation completed${NC}"
            break
        fi
        
        sleep 5
        ELAPSED=$((ELAPSED + 5))
        echo -e "${BLUE}  Status: ${STATUS} (${ELAPSED}s elapsed)${NC}"
    done
    
    if [ $ELAPSED -ge $TIMEOUT ]; then
        echo -e "${YELLOW}Warning: Invalidation timeout reached. It will continue in the background.${NC}"
    fi
else
    echo -e "${RED}Error: Failed to create cache invalidation${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Distribution ID: ${DISTRIBUTION_ID}"
echo "Bucket: ${BUCKET_NAME}"
echo "Invalidation ID: ${INVALIDATION_ID}"
echo ""
echo "Your application should be available shortly at the CloudFront distribution URL."

