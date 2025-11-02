#!/bin/bash

# Setup CloudFront distribution using AWS CloudFormation
# This creates the S3 bucket and CloudFront distribution

set -e

# Configuration
STACK_NAME="${STACK_NAME:-idits-drive-cloudfront-dev}"
DOMAIN_NAME="${DOMAIN_NAME:-dev.idit.photos}"
BUCKET_NAME="${BUCKET_NAME:-idits-drive-frontend-dev}"
CERT_ARN="${ACM_CERTIFICATE_ARN:-}"
REGION="${AWS_REGION:-eu-west-1}"
PROFILE="${AWS_PROFILE:-default}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Setting up CloudFront distribution with CloudFormation...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed.${NC}"
    exit 1
fi

# Check if stack exists
if aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --profile "${PROFILE}" &>/dev/null; then
    echo -e "${YELLOW}Stack ${STACK_NAME} exists. Updating...${NC}"
    OPERATION="update-stack"
    WAIT_OPERATION="stack-update-complete"
else
    echo -e "${YELLOW}Creating new stack ${STACK_NAME}...${NC}"
    OPERATION="create-stack"
    WAIT_OPERATION="stack-create-complete"
fi

# Build CloudFormation parameters
PARAMS="ParameterKey=DomainName,ParameterValue=${DOMAIN_NAME} ParameterKey=BucketName,ParameterValue=${BUCKET_NAME}"

if [ -n "${CERT_ARN}" ]; then
    PARAMS="${PARAMS} ParameterKey=CertificateArn,ParameterValue=${CERT_ARN}"
fi

# Execute CloudFormation operation
if [ "${OPERATION}" = "create-stack" ]; then
    aws cloudformation create-stack \
        --stack-name "${STACK_NAME}" \
        --template-body file://scripts/create-cloudfront-cf.yaml \
        --parameters ${PARAMS} \
        --region "${REGION}" \
        --profile "${PROFILE}" \
        --capabilities CAPABILITY_IAM
    
    echo -e "${YELLOW}Waiting for stack creation (this may take 10-15 minutes)...${NC}"
    aws cloudformation wait "${WAIT_OPERATION}" \
        --stack-name "${STACK_NAME}" \
        --region "${REGION}" \
        --profile "${PROFILE}"
else
    aws cloudformation update-stack \
        --stack-name "${STACK_NAME}" \
        --template-body file://scripts/create-cloudfront-cf.yaml \
        --parameters ${PARAMS} \
        --region "${REGION}" \
        --profile "${PROFILE}" \
        --capabilities CAPABILITY_IAM || {
        if [ $? -eq 254 ]; then
            echo -e "${YELLOW}No updates to be performed.${NC}"
        else
            exit 1
        fi
    }
    
    echo -e "${YELLOW}Waiting for stack update...${NC}"
    aws cloudformation wait "${WAIT_OPERATION}" \
        --stack-name "${STACK_NAME}" \
        --region "${REGION}" \
        --profile "${PROFILE}" || true
fi

# Get stack outputs
echo -e "${GREEN}Stack operation completed. Getting outputs...${NC}"
OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${REGION}" \
    --profile "${PROFILE}" \
    --query 'Stacks[0].Outputs' \
    --output json)

DISTRIBUTION_ID=$(echo "${OUTPUTS}" | jq -r '.[] | select(.OutputKey=="DistributionId") | .OutputValue')
DISTRIBUTION_DOMAIN=$(echo "${OUTPUTS}" | jq -r '.[] | select(.OutputKey=="DistributionDomain") | .OutputValue')

echo ""
echo -e "${GREEN}✓ CloudFront distribution setup complete!${NC}"
echo ""
echo "Distribution ID: ${DISTRIBUTION_ID}"
echo "Distribution Domain: ${DISTRIBUTION_DOMAIN}"
echo "Bucket Name: ${BUCKET_NAME}"
echo ""
echo "Next steps:"
echo "1. Wait for CloudFront distribution to fully deploy (10-15 minutes)"
echo "2. Update DNS for ${DOMAIN_NAME} to point to ${DISTRIBUTION_DOMAIN}"
echo "3. Run deployment script: ./scripts/deploy-cloudfront.sh"
echo ""
echo "To check distribution status:"
echo "  aws cloudfront get-distribution --id ${DISTRIBUTION_ID} --profile ${PROFILE}"

