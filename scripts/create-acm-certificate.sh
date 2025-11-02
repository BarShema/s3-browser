#!/bin/bash

# Script to create ACM certificate for CloudFront
# Note: CloudFront requires certificates to be in us-east-1 region

set -e

DOMAIN="${DOMAIN:-dev.idit.photos}"
REGION="us-east-1"  # CloudFront requires certificates in us-east-1
PROFILE="${AWS_PROFILE:-default}"

echo "Creating ACM certificate for ${DOMAIN} in ${REGION}..."
echo ""

# Request the certificate
CERT_ARN=$(aws acm request-certificate \
  --domain-name "${DOMAIN}" \
  --validation-method DNS \
  --region "${REGION}" \
  --profile "${PROFILE}" \
  --query 'CertificateArn' \
  --output text)

echo "Certificate requested: ${CERT_ARN}"
echo ""
echo "To validate the certificate, you need to add DNS records."
echo "Get the validation records with:"
echo ""
echo "aws acm describe-certificate \\"
echo "  --certificate-arn ${CERT_ARN} \\"
echo "  --region ${REGION} \\"
echo "  --profile ${PROFILE} \\"
echo "  --query 'Certificate.DomainValidationOptions[*].[DomainName,ResourceRecord.Name,ResourceRecord.Value]' \\"
echo "  --output table"
echo ""
echo "After adding the DNS records, wait for validation (usually 5-10 minutes)."
echo "Check status with:"
echo ""
echo "aws acm describe-certificate \\"
echo "  --certificate-arn ${CERT_ARN} \\"
echo "  --region ${REGION} \\"
echo "  --profile ${PROFILE} \\"
echo "  --query 'Certificate.Status' \\"
echo "  --output text"
echo ""
echo "Once validated, use this certificate ARN in your CloudFormation:"
echo "export ACM_CERTIFICATE_ARN=${CERT_ARN}"
echo ""
echo "Then run: npm run setup:cloudfront"

