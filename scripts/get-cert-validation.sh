#!/bin/bash

# Get DNS validation records for ACM certificate

set -e

CERT_ARN="${ACM_CERTIFICATE_ARN}"
REGION="us-east-1"  # CloudFront requires certificates in us-east-1
PROFILE="${AWS_PROFILE:-default}"

if [ -z "${CERT_ARN}" ]; then
  echo "Error: ACM_CERTIFICATE_ARN not set"
  echo "Usage: export ACM_CERTIFICATE_ARN=<cert-arn> && ./scripts/get-cert-validation.sh"
  exit 1
fi

echo "DNS Validation Records for Certificate: ${CERT_ARN}"
echo ""
echo "Add these CNAME records to your DNS provider for ${DOMAIN}:"
echo ""

aws acm describe-certificate \
  --certificate-arn "${CERT_ARN}" \
  --region "${REGION}" \
  --profile "${PROFILE}" \
  --query 'Certificate.DomainValidationOptions[*].[DomainName,ResourceRecord.Name,ResourceRecord.Value]' \
  --output table

echo ""
echo "After adding these DNS records, validation typically takes 5-10 minutes."
echo "Check validation status with:"
echo ""
echo "aws acm describe-certificate \\"
echo "  --certificate-arn ${CERT_ARN} \\"
echo "  --region ${REGION} \\"
echo "  --profile ${PROFILE} \\"
echo "  --query 'Certificate.Status' \\"
echo "  --output text"

