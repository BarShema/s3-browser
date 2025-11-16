#!/bin/bash
# Script to fix CloudFront SPA routing by adding a CloudFront Function
# This updates the existing distribution to handle routes without trailing slashes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGION="${AWS_REGION:-eu-west-1}"
PROFILE="${AWS_PROFILE:-default}"
DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-EYU8H6F81BLU0}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}CloudFront SPA Routing Fix${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Distribution ID: ${DISTRIBUTION_ID}"
echo "Region: ${REGION}"
echo ""

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Get current distribution config
echo -e "${YELLOW}Fetching current CloudFront distribution configuration...${NC}"
DIST_CONFIG=$(aws cloudfront get-distribution-config \
    --id "${DISTRIBUTION_ID}" \
    --region "${REGION}" \
    --profile "${PROFILE}")

ETAG=$(echo "${DIST_CONFIG}" | jq -r '.ETag')
CONFIG=$(echo "${DIST_CONFIG}" | jq '.DistributionConfig')

# Create CloudFront Function code for SPA routing
FUNCTION_NAME="spa-routing-rewrite"
FUNCTION_CODE='function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Skip rewriting for static assets (JS, CSS, images, etc.)
    if (uri.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|map)$/i)) {
        return request;
    }
    
    // For _next static assets, serve as-is
    if (uri.startsWith("/_next/")) {
        return request;
    }
    
    // If URI doesn\'t end with a slash and doesn\'t have a file extension
    if (!uri.match(/\/$/) && !uri.match(/\.[a-zA-Z0-9]+$/)) {
        // Try the path with /index.html (for Next.js trailingSlash: true)
        request.uri = uri + "/index.html";
    } else if (uri.match(/\/$/)) {
        // If it ends with slash, append index.html
        request.uri = uri + "index.html";
    }
    
    return request;
}'

# Check if function exists, create if not
FUNCTION_EXISTS=$(aws cloudfront list-functions \
    --region "${REGION}" \
    --profile "${PROFILE}" \
    --query "FunctionList.Items[?Name=='${FUNCTION_NAME}'].Name" \
    --output text 2>/dev/null || echo "")

if [ -z "${FUNCTION_EXISTS}" ]; then
    echo -e "${YELLOW}Creating CloudFront Function...${NC}"
    
    # Create function
    FUNCTION_ETAG=$(aws cloudfront create-function \
        --name "${FUNCTION_NAME}" \
        --function-code "${FUNCTION_CODE}" \
        --function-config Comment="SPA routing rewrite",Runtime="cloudfront-js-1.0" \
        --region "${REGION}" \
        --profile "${PROFILE}" \
        --query 'ETag' \
        --output text)
    
    echo -e "${GREEN}✓ Function created${NC}"
else
    echo -e "${YELLOW}Updating existing CloudFront Function...${NC}"
    
    # Get current function config
    FUNC_CONFIG=$(aws cloudfront describe-function \
        --name "${FUNCTION_NAME}" \
        --region "${REGION}" \
        --profile "${PROFILE}")
    
    FUNC_ETAG=$(echo "${FUNC_CONFIG}" | jq -r '.ETag')
    
    # Update function
    FUNCTION_ETAG=$(aws cloudfront update-function \
        --name "${FUNCTION_NAME}" \
        --if-match "${FUNC_ETAG}" \
        --function-code "${FUNCTION_CODE}" \
        --function-config Comment="SPA routing rewrite",Runtime="cloudfront-js-1.0" \
        --region "${REGION}" \
        --profile "${PROFILE}" \
        --query 'ETag' \
        --output text)
    
    echo -e "${GREEN}✓ Function updated${NC}"
fi

# Get function ARN
FUNCTION_ARN=$(aws cloudfront describe-function \
    --name "${FUNCTION_NAME}" \
    --region "${REGION}" \
    --profile "${PROFILE}" \
    --query 'FunctionSummary.FunctionARN' \
    --output text)

echo "Function ARN: ${FUNCTION_ARN}"

# Publish function
echo -e "${YELLOW}Publishing function...${NC}"
PUBLISH_ETAG=$(aws cloudfront publish-function \
    --name "${FUNCTION_NAME}" \
    --if-match "${FUNCTION_ETAG}" \
    --region "${REGION}" \
    --profile "${PROFILE}" \
    --query 'FunctionSummary.FunctionARN' \
    --output text 2>&1)

echo -e "${GREEN}✓ Function published${NC}"

# Update distribution config to use the function
echo -e "${YELLOW}Updating CloudFront distribution to use the function...${NC}"

# Update the default cache behavior to include the function
UPDATED_CONFIG=$(echo "${CONFIG}" | jq ".DefaultCacheBehavior.FunctionAssociations = {
    \"Quantity\": 1,
    \"Items\": [
        {
            \"FunctionARN\": \"${FUNCTION_ARN}\",
            \"EventType\": \"viewer-request\"
        }
    ]
}")

# Update distribution
UPDATE_RESULT=$(aws cloudfront update-distribution \
    --id "${DISTRIBUTION_ID}" \
    --if-match "${ETAG}" \
    --distribution-config "${UPDATED_CONFIG}" \
    --region "${REGION}" \
    --profile "${PROFILE}" \
    --query 'Distribution.Id' \
    --output text 2>&1 || echo "ERROR")

if [[ "${UPDATE_RESULT}" == "ERROR"* ]] || [ -z "${UPDATE_RESULT}" ]; then
    echo -e "${RED}Error: Failed to update distribution${NC}"
    echo "This might be because the distribution is being updated or the ETag has changed."
    echo "Please try again in a few moments."
    exit 1
fi

echo -e "${GREEN}✓ Distribution updated${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}SPA routing fix applied!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "The CloudFront distribution has been updated with a function that:"
echo "  - Rewrites /login to /login/index.html"
echo "  - Rewrites /idits-drive to /idits-drive/index.html"
echo "  - Handles all routes without trailing slashes"
echo ""
echo "Note: It may take a few minutes for the changes to propagate."

