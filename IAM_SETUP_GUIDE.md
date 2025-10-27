# AWS IAM Setup Guide

This guide explains how to create an IAM user with the minimum permissions required for the S3 File Browser application.

## Required Permissions

The application needs the following S3 permissions:

- **s3:ListBucket** - List objects and folders in the bucket
- **s3:GetObject** - Download files
- **s3:PutObject** - Upload files
- **s3:DeleteObject** - Delete files
- **s3:GetObjectVersion** - Get object versions (optional, for versioned buckets)
- **s3:PutObjectAcl** - Set object ACLs (optional)

## Step-by-Step Setup

### 1. Create IAM User

1. Go to AWS Console → IAM → Users → Add user
2. Enter a username (e.g., `s3-file-browser-user`)
3. Select **"Provide user access to the AWS Management Console"** if you want console access, or **"Command Line Interface (CLI)"** for programmatic access only
4. Click Next

### 2. Set Permissions

**Option A: Use Attach Policies Directly**
- Click "Attach policies directly"
- Note: There's no predefined AWS policy for this exact use case, so proceed to Option B

**Option B: Create Custom Policy**
1. Click "Create policy"
2. Go to the JSON tab
3. Paste the policy from `AWS_IAM_POLICY.json` (replace `YOUR_BUCKET_NAME` with your actual bucket name)
4. Name the policy: `S3FileBrowserPolicy`
5. Create the policy
6. Return to user creation and attach this new policy

### 3. Complete User Creation

1. Review and create the user
2. **Save the Access Key ID and Secret Access Key** immediately
3. Add these to your `.env.local` file:

```env
AWS_ACCESS_KEY_ID=*
AWS_SECRET_ACCESS_KEY=*
AWS_REGION=us-east-1
```

## Security Best Practices

### 1. Principle of Least Privilege
- Only grant permissions to the specific bucket(s) needed
- Don't use wildcard `*` unless absolutely necessary
- Consider using path-based restrictions if accessing a shared bucket

### 2. Bucket-Specific Policy

Replace `YOUR_BUCKET_NAME` in the policy with your actual bucket name:

```json
"Resource": [
  "arn:aws:s3:::my-s3-bucket",
  "arn:aws:s3:::my-s3-bucket/*"
]
```

### 3. Path-Based Restrictions (Optional)

If you're using a shared bucket, restrict access to specific paths:

```json
{
  "Action": "s3:ListBucket",
  "Resource": "arn:aws:s3:::MY_BUCKET",
  "Condition": {
    "StringLike": {
      "s3:prefix": ["my-app/*"]
    }
  }
},
{
  "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
  "Resource": "arn:aws:s3:::MY_BUCKET/my-app/*"
}
```

### 4. Additional Security Recommendations

- Enable MFA (Multi-Factor Authentication) for the IAM user if providing console access
- Use separate IAM users for different environments (dev, staging, prod)
- Rotate access keys regularly
- Set up CloudTrail to monitor S3 API calls
- Consider using IAM roles instead of users if running on EC2

### 5. Bucket-Level Permissions

Make sure your bucket policy allows the IAM user:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowIAMUserAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:user/s3-file-browser-user"
      },
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR_BUCKET_NAME",
        "arn:aws:s3:::YOUR_BUCKET_NAME/*"
      ]
    }
  ]
}
```

## Testing the Permissions

After setting up the IAM user, test that everything works:

1. Start the application: `npm run dev`
2. Configure your bucket name in the app
3. Try to list files
4. Upload a test file
5. Download a file
6. Rename a file
7. Delete a file

If any operation fails, check CloudTrail logs to see which permission is missing.

## Troubleshooting

### Error: Access Denied
- Verify the bucket name in your policy matches your actual bucket
- Check that the IAM user has the correct permissions
- Ensure bucket policy allows the IAM user

### Error: Invalid Access Key
- Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local
- Make sure there are no extra spaces or quotes
- Re-generate access keys if needed

### Error: SignatureDoesNotMatch
- Check your AWS_SECRET_ACCESS_KEY
- Verify your system time is correct
- Ensure you're using the correct AWS region

## Cost Optimization

The application uses AWS S3, which charges for:
- **Storage**: GB-month of data stored
- **Requests**: PUT, GET, and DELETE requests
- **Data Transfer**: Outbound data transfer

To minimize costs:
- Enable S3 Lifecycle policies to move old files to cheaper storage classes
- Use CloudFront for frequently accessed files
- Enable S3 Intelligent-Tiering for automatic cost optimization
- Compress files before uploading

## Summary

The minimum permissions needed are:
1. List objects in your bucket
2. Get/download objects
3. Put/upload objects
4. Delete objects

These permissions are scoped to your specific bucket only, following the principle of least privilege for security.
