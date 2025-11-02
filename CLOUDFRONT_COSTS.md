# CloudFront & ACM Certificate Costs

## SSL Certificate Cost

**ACM (AWS Certificate Manager) certificates are 100% FREE** ✅

- No charge for certificate issuance
- No charge for certificate renewal (automatic)
- No charge for certificate validation
- No charge for using with CloudFront

## CloudFront Costs

You only pay for CloudFront usage:

### Data Transfer Out
- **First 10 TB/month**: $0.085 per GB
- **Next 40 TB/month**: $0.080 per GB
- **Next 100 TB/month**: $0.060 per GB
- **Over 150 TB/month**: $0.040 per GB

### HTTP/HTTPS Requests
- **HTTPS Requests**: $0.0075 per 10,000 requests
- **HTTP Requests**: $0.0075 per 10,000 requests

### Origin Requests (to S3)
- **GET Requests**: $0.005 per 1,000 requests

### Free Tier (First 12 Months)
- **50 GB data transfer out** - FREE
- **2,000,000 HTTP/HTTPS requests** - FREE

## S3 Costs (for static hosting)

### Storage
- **First 50 TB/month**: $0.023 per GB

### Requests
- **GET Requests**: $0.0004 per 1,000 requests

### Data Transfer
- **Data transfer TO CloudFront**: FREE
- **Data transfer FROM S3**: $0.009 per GB (first 10 TB)

## Example Monthly Costs

For a moderate traffic site:
- **50,000 page views/month**
- **2 GB data transfer**
- **5 GB S3 storage**

Estimated costs:
- **ACM Certificate**: $0.00
- **CloudFront**: ~$0.17 (2 GB × $0.085/GB) - FREE in first year
- **S3 Storage**: ~$0.12 (5 GB × $0.023/GB)
- **S3 Requests**: ~$0.02 (50,000 requests × $0.0004/1000)
- **Total**: ~$0.31/month (FREE in first 12 months with free tier)

## Cost Optimization Tips

1. **Enable Compression**: Reduces data transfer costs
2. **Use CloudFront Cache**: Reduces origin requests
3. **Optimize Assets**: Smaller files = less data transfer
4. **Use CloudFront Free Tier**: First 12 months get significant free usage
5. **Monitor Usage**: Set up billing alerts in AWS Console

## Important Notes

- ACM certificates only work with AWS services (CloudFront, ELB, API Gateway)
- If you need a certificate for non-AWS services, you'd need a paid certificate (typically $50-200/year)
- Certificate renewal is automatic and free
- No expiration date concerns - AWS handles renewals

