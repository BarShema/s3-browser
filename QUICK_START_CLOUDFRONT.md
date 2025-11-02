# Quick Start: CloudFront Deployment

## Step-by-Step Guide

### Step 1: Create SSL Certificate

CloudFront **requires** an SSL certificate to use custom domains. The certificate must be in the `us-east-1` region.

```bash
# Create certificate for dev.idit.photos
npm run create:cert
```

This outputs a certificate ARN like: `arn:aws:acm:us-east-1:123456789:certificate/abc-123`

### Step 2: Get DNS Validation Records

```bash
# Replace with your certificate ARN from Step 1
export ACM_CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789:certificate/abc-123

# Get validation records
npm run get:cert-validation
```

This shows CNAME records you need to add to your DNS.

### Step 3: Add DNS Validation Records

Go to your DNS provider (where `idit.photos` is managed) and add the CNAME records shown in Step 2.

Example record:
```
Type: CNAME
Name: _abc123.dev.idit.photos
Value: _xyz789.acm-validations.aws.
TTL: 300
```

### Step 4: Wait for Certificate Validation

Check status every few minutes:

```bash
aws acm describe-certificate \
  --certificate-arn ${ACM_CERTIFICATE_ARN} \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text
```

Wait until it shows `ISSUED` (usually 5-10 minutes after adding DNS records).

### Step 5: Create CloudFront Distribution

Once the certificate is validated (`ISSUED`), create the CloudFront distribution:

```bash
# Set required variables
export ACM_CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789:certificate/abc-123
export AWS_PROFILE=your-profile  # Optional
export AWS_REGION=eu-west-1      # Optional, default

# Create the stack
npm run setup:cloudfront
```

This takes 10-15 minutes. The stack will:
- Create S3 bucket for static files
- Create CloudFront distribution
- Configure SSL certificate
- Set up security and caching

### Step 6: Deploy Your Frontend

After the stack completes successfully:

```bash
# Set the distribution ID (from stack outputs)
export CLOUDFRONT_DIST_ID=<distribution-id>

# Set your backend API URL (where API routes will run)
export NEXT_PUBLIC_API_URL=https://api.dev.idit.photos
export NEXT_PUBLIC_CLOUDFRONT=true

# Build and deploy
npm run deploy:cloudfront
```

### Step 7: Configure DNS for CloudFront

Get the CloudFront domain from stack outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name idits-drive-cloudfront-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionDomain`].OutputValue' \
  --output text
```

Add a CNAME record in your DNS:
```
Type: CNAME
Name: dev
Value: <cloudfront-domain>.cloudfront.net
TTL: 300
```

### Step 8: Verify

Wait 10-15 minutes for CloudFront distribution to fully deploy, then access:
- https://dev.idit.photos

## Troubleshooting

### Certificate Validation Taking Too Long?
- Verify DNS records are correct
- Check DNS propagation: `dig _abc123.dev.idit.photos CNAME`
- Ensure certificate is in `us-east-1` region

### CloudFormation Stack Fails?
```bash
# Check stack events for errors
aws cloudformation describe-stack-events \
  --stack-name idits-drive-cloudfront-dev \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`]' \
  --output table
```

### Distribution Not Accessible?
- Verify DNS CNAME points to CloudFront domain
- Check certificate is attached (must be in `us-east-1`)
- Wait 15-20 minutes for full CloudFront deployment
- Check distribution status in AWS Console

## Common Issues

**Error: "certificate does not exist"**
- Certificate must be in `us-east-1` region for CloudFront
- Verify certificate ARN is correct

**Error: "certificate not validated"**
- Certificate status must be `ISSUED`
- Check DNS validation records are correct

**Error: "CNAME already exists"**
- Another CloudFront distribution may be using the domain
- Remove old distribution or use different domain

