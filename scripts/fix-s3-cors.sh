#!/bin/bash
# Fix S3 CORS Configuration for Large File Uploads
# Configures CORS on S3 buckets to allow PUT requests from the frontend

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

# Get frontend origin from environment or use default
FRONTEND_ORIGIN="${FRONTEND_ORIGIN:-*}"

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Function to configure CORS for a bucket
configure_cors() {
    local bucket_name=$1
    local origin=$2
    
    echo -e "${BLUE}Configuring CORS for bucket: ${bucket_name}${NC}"
    
    # Create CORS configuration JSON
    local cors_config=$(cat <<EOF
{
    "CORSRules": [
        {
            "AllowedOrigins": ["${origin}"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
            "AllowedHeaders": ["*"],
            "ExposeHeaders": ["ETag", "x-amz-server-side-encryption", "x-amz-request-id", "x-amz-id-2"],
            "MaxAgeSeconds": 3600
        }
    ]
}
EOF
)
    
    # Save CORS config to temp file
    local temp_file=$(mktemp)
    echo "${cors_config}" > "${temp_file}"
    
    # Apply CORS configuration
    if aws s3api put-bucket-cors \
        --bucket "${bucket_name}" \
        --cors-configuration "file://${temp_file}" \
        --region "${REGION}" \
        --profile "${PROFILE}" 2>/dev/null; then
        echo -e "${GREEN}✓ CORS configured successfully for ${bucket_name}${NC}"
        
        # Verify CORS configuration
        echo -e "${YELLOW}Verifying CORS configuration...${NC}"
        aws s3api get-bucket-cors \
            --bucket "${bucket_name}" \
            --region "${REGION}" \
            --profile "${PROFILE}" | jq '.' || echo -e "${YELLOW}Note: jq not installed, skipping pretty print${NC}"
    else
        echo -e "${RED}✗ Failed to configure CORS for ${bucket_name}${NC}"
        echo -e "${YELLOW}Make sure you have s3:PutBucketCORS permission${NC}"
        rm -f "${temp_file}"
        return 1
    fi
    
    # Clean up temp file
    rm -f "${temp_file}"
}

# Function to list all S3 buckets (drive buckets)
list_drive_buckets() {
    echo -e "${YELLOW}Listing S3 buckets...${NC}"
    
    aws s3api list-buckets \
        --region "${REGION}" \
        --profile "${PROFILE}" \
        --query 'Buckets[?contains(Name, `drive`) || contains(Name, `idits`)].Name' \
        --output text | tr '\t' '\n' | grep -v '^$' || echo ""
}

# Main execution
main() {
    echo -e "${GREEN}=== S3 CORS Configuration Fix ===${NC}"
    echo ""
    echo "Region: ${REGION}"
    echo "Profile: ${PROFILE}"
    echo "Frontend Origin: ${FRONTEND_ORIGIN}"
    echo ""
    
    # Check if bucket name is provided as argument
    if [ $# -gt 0 ]; then
        # Configure CORS for specified bucket(s)
        for bucket in "$@"; do
            echo ""
            configure_cors "${bucket}" "${FRONTEND_ORIGIN}"
        done
    else
        # Auto-detect drive buckets
        echo -e "${YELLOW}No bucket specified. Attempting to auto-detect drive buckets...${NC}"
        echo ""
        
        buckets=$(list_drive_buckets)
        
        if [ -z "${buckets}" ]; then
            echo -e "${RED}No drive buckets found.${NC}"
            echo ""
            echo "Usage:"
            echo "  $0 <bucket-name-1> [bucket-name-2] ..."
            echo "  FRONTEND_ORIGIN=https://example.com $0 <bucket-name>"
            echo ""
            echo "Or set FRONTEND_ORIGIN environment variable:"
            echo "  export FRONTEND_ORIGIN=https://dev.idit.photos"
            echo "  $0 idits-drive-dev"
            exit 1
        fi
        
        echo -e "${GREEN}Found buckets:${NC}"
        echo "${buckets}" | while read -r bucket; do
            echo "  - ${bucket}"
        done
        echo ""
        
        # Ask for confirmation
        read -p "Configure CORS for these buckets? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Cancelled.${NC}"
            exit 0
        fi
        
        # Configure CORS for each bucket
        echo "${buckets}" | while read -r bucket; do
            if [ -n "${bucket}" ]; then
                echo ""
                configure_cors "${bucket}" "${FRONTEND_ORIGIN}"
            fi
        done
    fi
    
    echo ""
    echo -e "${GREEN}=== CORS Configuration Complete ===${NC}"
    echo ""
    echo -e "${YELLOW}Note:${NC} If you're still experiencing CORS errors:"
    echo "  1. Make sure FRONTEND_ORIGIN matches your actual frontend URL"
    echo "  2. Clear browser cache and try again"
    echo "  3. Check browser console for specific CORS error messages"
    echo "  4. Verify the bucket name is correct"
}

# Run main function
main "$@"

