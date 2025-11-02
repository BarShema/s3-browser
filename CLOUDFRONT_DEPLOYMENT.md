# CloudFront Deployment Guide

This guide explains how to deploy the frontend of Idits Drive to AWS CloudFront with the domain `dev.idit.photos`.

## Prerequisites

1. **AWS CLI** installed and configured with appropriate credentials
2. **AWS Account** with permissions for:
   - S3 (create buckets, upload files)
   - CloudFront (create distributions, invalidations)
   - CloudFormation (create/update stacks)
   - ACM (request and validate certificates)
3. **Domain DNS** access to create CNAME records for `dev.idit.photos`
4. **SSL Certificate** (required for custom domain) - ACM certificate for the domain

## Important: SSL Certificate Required

**CloudFront requires an SSL certificate to use a custom domain name.** You must create and validate an ACM certificate before creating the CloudFront distribution.

## Architecture

- **S3 Bucket**: Stores static frontend files (HTML, CSS, JS)
- **CloudFront Distribution**: CDN that serves files from S3
- **Custom Domain**: `dev.idit.photos` points to CloudFront
- **API Backend**: Should be deployed separately (e.g., `api.dev.idit.photos`)

## Quick Start

### 0. Create SSL Certificate (Required First Step)

**CloudFront requires an SSL certificate in `us-east-1` region** to use custom domains.

```bash
# Create the certificate
npm run create:cert
# or
export DOMAIN=dev.idit.photos
./scripts/create-acm-certificate.sh
```

This will output the certificate ARN. Save it, then get DNS validation records:

```bash
# Get DNS validation records
export ACM_CERTIFICATE_ARN=<certificate-arn-from-above>
npm run get:cert-validation
# or
./scripts/get-cert-validation.sh
```

Add the CNAME records to your DNS provider (wherever `idit.photos` DNS is managed). Validation typically takes 5-10 minutes after adding the DNS records.

Check validation status:
```bash
aws acm describe-certificate \
  --certificate-arn ${ACM_CERTIFICATE_ARN} \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text
```

Wait until it shows `ISSUED` before proceeding.

### 1. Setup CloudFront Distribution (One-time)

```bash
# Set environment variables (REQUIRED)
export AWS_PROFILE=your-profile  # Optional
export AWS_REGION=eu-west-1      # Optional, default

# REQUIRED: SSL certificate ARN (must be validated and in us-east-1)
export ACM_CERTIFICATE_ARN=arn:aws:acm:us-east-1:...:certificate/...

# Run CloudFormation setup
npm run setup:cloudfront
# or
./scripts/setup-cloudfront.sh
```

This will:
- Create S3 bucket: `idits-drive-frontend-dev`
- Create CloudFront distribution
- Configure origin access control
- Set up custom error handling for SPA routing

### 2. Deploy Frontend

```bash
# Build and deploy to CloudFront
export CLOUDFRONT_DIST_ID=<distribution-id-from-setup>
export S3_BUCKET_NAME=idits-drive-frontend-dev
./scripts/deploy-cloudfront.sh
```

Or set the distribution ID for automatic updates:

```bash
export CLOUDFRONT_DIST_ID=<your-distribution-id>
```

## Detailed Steps

### Step 1: Create CloudFront Distribution

#### Option A: Using CloudFormation (Recommended)

```bash
cd scripts
./setup-cloudfront.sh
```

This creates:
- S3 bucket with proper configuration
- CloudFront distribution with OAC
- Bucket policy for CloudFront access
- Error handling for SPA routing

#### Option B: Manual Setup

1. Create S3 bucket:
   ```bash
   aws s3 mb s3://idits-drive-frontend-dev --region eu-west-1
   ```

2. Create CloudFront distribution via AWS Console or CLI
3. Configure origin access control
4. Set up custom error responses (404 → 200 with index.html)

### Step 2: Build Static Export

The build process creates a static export of the Next.js frontend:

```bash
export NEXT_EXPORT=true
npm run build
```

This creates the `out/` directory with all static files.

### Step 3: Deploy to S3

```bash
# Upload static files
aws s3 sync out/ s3://idits-drive-frontend-dev \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html"

# Upload HTML files with no-cache
aws s3 sync out/ s3://idits-drive-frontend-dev \
  --delete \
  --cache-control "public, max-age=0, must-revalidate" \
  --include "*.html"
```

Or use the deployment script:

```bash
./scripts/deploy-cloudfront.sh
```

### Step 4: Invalidate CloudFront Cache

```bash
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"
```

The deployment script does this automatically.

### Step 5: Configure DNS

Create a CNAME record in your DNS provider:

```
Type: CNAME
Name: dev
Value: <cloudfront-distribution-domain>.cloudfront.net
TTL: 300
```

You can find the CloudFront domain in:
- AWS Console → CloudFront → Distribution → Domain Name
- Output from `setup-cloudfront.sh`
- CloudFormation stack outputs

## Environment Configuration

The frontend automatically detects CloudFront deployment via environment variables:

```bash
# Enable CloudFront mode
export NEXT_PUBLIC_CLOUDFRONT=true
# or
export NEXT_PUBLIC_DEPLOY_TARGET=cloudfront
```

This will:
- Use CloudFront-specific API URL configuration
- Optimize for static hosting

### API Backend URL

Since API routes can't run on CloudFront, configure the backend URL:

```bash
# In your build/deployment environment
export NEXT_PUBLIC_API_URL=https://api.dev.idit.photos
# or set in env.ts cloudfrontConfig
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_EXPORT` | Enable static export | `false` |
| `S3_BUCKET_NAME` | S3 bucket for static files | `idits-drive-frontend-dev` |
| `CLOUDFRONT_DOMAIN` | Custom domain name | `dev.idit.photos` |
| `CLOUDFRONT_DIST_ID` | CloudFront distribution ID | (required) |
| `AWS_PROFILE` | AWS CLI profile | `default` |
| `AWS_REGION` | AWS region | `eu-west-1` |
| `ACM_CERTIFICATE_ARN` | SSL certificate ARN | (optional) |
| `NEXT_PUBLIC_API_URL` | Backend API URL | (required) |
| `NEXT_PUBLIC_CLOUDFRONT` | Enable CloudFront mode | `false` |

## Continuous Deployment

### GitHub Actions Example

```yaml
name: Deploy to CloudFront

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-west-1
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build and deploy
        env:
          NEXT_EXPORT: true
          CLOUDFRONT_DIST_ID: ${{ secrets.CLOUDFRONT_DIST_ID }}
          S3_BUCKET_NAME: idits-drive-frontend-dev
          NEXT_PUBLIC_CLOUDFRONT: true
          NEXT_PUBLIC_API_URL: https://api.dev.idit.photos
        run: ./scripts/deploy-cloudfront.sh
```

## Troubleshooting

### Build Fails

- Check Node.js version (should be 18+)
- Ensure all dependencies are installed
- Check for TypeScript errors

### Files Not Updating

- CloudFront cache: Create invalidation
- Browser cache: Hard refresh (Ctrl+Shift+R)
- Check S3 bucket contents: `aws s3 ls s3://idits-drive-frontend-dev --recursive`

### 404 Errors on Routes

- Ensure custom error responses are configured (404 → 200 → index.html)
- Check that HTML files have correct content-type
- Verify S3 bucket website configuration

### SSL Certificate Issues

- Ensure certificate is in `us-east-1` region (CloudFront requirement)
- Verify certificate covers `dev.idit.photos`
- Check certificate is validated in ACM

### API Calls Failing

- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check CORS configuration on API backend
- Ensure API backend allows requests from `dev.idit.photos`

## Cost Considerations

- **S3**: ~$0.023 per GB storage, $0.005 per 1,000 requests
- **CloudFront**: 
  - Data transfer: $0.085 per GB (first 10TB)
  - Requests: $0.0075 per 10,000 HTTPS requests
- **SSL Certificate**: Free with ACM

## Maintenance

### Update Distribution

```bash
./scripts/deploy-cloudfront.sh
```

### Check Distribution Status

```bash
aws cloudfront get-distribution \
  --id <DISTRIBUTION_ID> \
  --query 'Distribution.Status' \
  --output text
```

### View Distribution Logs

Enable CloudFront logging in AWS Console:
- CloudFront → Distribution → General → Logging

## Security Notes

1. **Origin Access Control (OAC)**: Prevents direct S3 access, only CloudFront can access
2. **HTTPS Only**: CloudFront redirects HTTP to HTTPS
3. **Custom Domain**: Use ACM certificate for custom SSL
4. **API Backend**: Deploy separately with proper authentication

## Next Steps

1. Set up CI/CD pipeline for automatic deployments
2. Configure monitoring and alerts
3. Set up staging environment (e.g., `staging.idit.photos`)
4. Configure CDN logging for analytics

