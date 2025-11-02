#!/bin/bash
# CloudFront Infrastructure Setup Script
# Creates or updates CloudFormation stack for CloudFront and S3

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check AWS_STAGE is set
if [ -z "${AWS_STAGE}" ]; then
    echo -e "${RED}Error: AWS_STAGE environment variable is required${NC}"
    echo "Valid values: dev, staging, prd, prod, production"
    echo "Usage: export AWS_STAGE=dev && npm run setup:cloudfront"
    exit 1
fi

# Validate AWS_STAGE
case "${AWS_STAGE}" in
    dev|staging|prd|prod|production)
        ;;
    *)
        echo -e "${RED}Error: Invalid AWS_STAGE '${AWS_STAGE}'${NC}"
        echo "Valid values: dev, staging, prd, prod, production"
        exit 1
        ;;
esac

# Configuration
REGION="${AWS_REGION:-eu-west-1}"
PROFILE="${AWS_PROFILE:-default}"
STACK_NAME="idits-drive-cloudfront-${AWS_STAGE}"
TEMPLATE_FILE="scripts/create-cloudfront-cf.yaml"

# Stage-specific defaults
case "${AWS_STAGE}" in
    dev)
        BUCKET_NAME="${S3_BUCKET_NAME:-idits-drive-frontend-dev}"
        DOMAIN_NAME="${DOMAIN_NAME:-dev.idit.photos}"
        ;;
    staging)
        BUCKET_NAME="${S3_BUCKET_NAME:-idits-drive-frontend-staging}"
        DOMAIN_NAME="${DOMAIN_NAME:-staging.idit.photos}"
        ;;
    prd|prod|production)
        BUCKET_NAME="${S3_BUCKET_NAME:-idits-drive-frontend-prd}"
        DOMAIN_NAME="${DOMAIN_NAME:-idit.photos}"
        ;;
esac

CERTIFICATE_ARN="${CERTIFICATE_ARN:-}"

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Check template file exists
if [ ! -f "${TEMPLATE_FILE}" ]; then
    echo -e "${RED}Error: Template file not found: ${TEMPLATE_FILE}${NC}"
    exit 1
fi

echo -e "${YELLOW}Setting up CloudFront infrastructure...${NC}"
echo "Stage: ${AWS_STAGE}"
echo "Stack: ${STACK_NAME}"
echo "Region: ${REGION}"
echo "Bucket: ${BUCKET_NAME}"
echo "Domain: ${DOMAIN_NAME}"

# Prepare CloudFormation parameters
PARAMS="ParameterKey=BucketName,ParameterValue=${BUCKET_NAME}"
PARAMS="${PARAMS} ParameterKey=DomainName,ParameterValue=${DOMAIN_NAME}"

if [ -n "${CERTIFICATE_ARN}" ]; then
    PARAMS="${PARAMS} ParameterKey=CertificateArn,ParameterValue=${CERTIFICATE_ARN}"
    echo "Certificate ARN: ${CERTIFICATE_ARN}"
else
    PARAMS="${PARAMS} ParameterKey=CertificateArn,ParameterValue="
    echo "Using CloudFront default certificate"
fi

# Check if stack exists
if aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${REGION}" \
    --profile "${PROFILE}" \
    &> /dev/null; then
    echo -e "${YELLOW}Stack exists, updating...${NC}"
    OPERATION="update-stack"
else
    echo -e "${GREEN}Stack does not exist, creating...${NC}"
    OPERATION="create-stack"
fi

# Create or update stack
if aws cloudformation ${OPERATION} \
    --stack-name "${STACK_NAME}" \
    --template-body file://"${TEMPLATE_FILE}" \
    --parameters ${PARAMS} \
    --capabilities CAPABILITY_IAM \
    --region "${REGION}" \
    --profile "${PROFILE}"; then
    
    echo -e "${GREEN}✓ Stack ${OPERATION} initiated${NC}"
    echo "Waiting for stack operation to complete..."
    
    aws cloudformation wait stack-${OPERATION%-stack}-complete \
        --stack-name "${STACK_NAME}" \
        --region "${REGION}" \
        --profile "${PROFILE}"
    
    echo -e "${GREEN}✓ Stack operation completed successfully${NC}"
    
    # Get outputs
    DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_NAME}" \
        --region "${REGION}" \
        --profile "${PROFILE}" \
        --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
        --output text)
    
    DISTRIBUTION_DOMAIN=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_NAME}" \
        --region "${REGION}" \
        --profile "${PROFILE}" \
        --query 'Stacks[0].Outputs[?OutputKey==`DistributionDomain`].OutputValue' \
        --output text)
    
    echo ""
    echo -e "${GREEN}Setup completed successfully!${NC}"
    echo "Distribution ID: ${DISTRIBUTION_ID}"
    echo "Distribution Domain: ${DISTRIBUTION_DOMAIN}"
    echo ""
    if [ -n "${CERTIFICATE_ARN}" ]; then
        echo "Website URL: https://${DOMAIN_NAME}"
    else
        echo "Website URL: https://${DISTRIBUTION_DOMAIN}"
    fi
else
    if [ "${OPERATION}" = "update-stack" ]; then
        # Check if update was because no changes
        if aws cloudformation describe-stacks \
            --stack-name "${STACK_NAME}" \
            --region "${REGION}" \
            --profile "${PROFILE}" \
            --query 'Stacks[0].StackStatus' \
            --output text | grep -q "UPDATE_COMPLETE\|CREATE_COMPLETE"; then
            echo -e "${GREEN}✓ Stack is up to date (no changes)${NC}"
            exit 0
        fi
    fi
    echo -e "${RED}Error: Stack operation failed${NC}"
    exit 1
fi

