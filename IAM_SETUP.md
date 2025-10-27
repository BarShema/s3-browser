# IAM User Creation Guide

This guide explains how to use the automated IAM user creation script for the S3 File Browser application.

## Quick Start

The easiest way to set up your AWS IAM user is to use the automated script:

```bash
./create-iam-user.sh my-bucket-name
```

Or using npm:

```bash
npm run create-iam-user my-bucket-name
```

## What the Script Does

The `create-iam-user.sh` script automatically:

1. ✅ Creates an IAM user (default: `s3-file-browser-user`)
2. ✅ Creates an IAM policy with necessary S3 permissions
3. ✅ Attaches the policy to the user
4. ✅ Generates access keys (Access Key ID and Secret Access Key)
5. ✅ Saves credentials to `.env.credentials` file
6. ✅ Displays summary and next steps

## Prerequisites

Before running the script, make sure you have:

1. **AWS CLI installed**
   ```bash
   # Check if AWS CLI is installed
   aws --version
   
   # If not installed, install it:
   # macOS: brew install awscli
   # Linux: apt-get install awscli
   # Windows: Download from AWS website
   ```

2. **AWS credentials configured**
   ```bash
   # Configure your AWS credentials
   aws configure
   
   # You'll need:
   # - AWS Access Key ID (for your admin account)
   # - AWS Secret Access Key (for your admin account)
   # - Default region name (e.g., us-east-1)
   # - Default output format (json)
   ```

3. **Administrative permissions**
   - The AWS credentials you use with `aws configure` must have permissions to create IAM users and policies
   - These are typically admin-level permissions

## Usage

### Basic Usage

```bash
# Run with default user name and prompt for bucket name
./create-iam-user.sh

# Run with bucket name as argument
./create-iam-user.sh my-s3-bucket

# Run with custom user name and bucket name
./create-iam-user.sh my-custom-user my-s3-bucket
```

### Parameters

- **First parameter** (optional): IAM user name (default: `s3-file-browser-user`)
- **Second parameter** (optional): S3 bucket name

If you don't provide the bucket name, the script will prompt you to enter it.

### Example

```bash
# Example 1: Run with prompt
./create-iam-user.sh
# Script will ask for bucket name

# Example 2: Run with bucket name
./create-iam-user.sh my-awesome-bucket

# Example 3: Run with custom user name and bucket
./create-iam-user.sh my-app-user my-storage-bucket
```

## Permissions Created

The script creates a policy with these S3 permissions for your bucket:

### Bucket-Level Permissions
- `s3:ListBucket` - List objects in the bucket
- `s3:GetBucketLocation` - Get bucket location

### Object-Level Permissions
- `s3:GetObject` - Download files
- `s3:PutObject` - Upload files
- `s3:DeleteObject` - Delete files
- `s3:GetObjectVersion` - Get object versions (for versioned buckets)

## Output

After running the script, you'll see:

1. ✅ Confirmation that the user was created
2. ✅ Policy creation confirmation
3. ✅ Policy attachment confirmation
4. ✅ Access keys generated
5. ✅ Credentials saved to `.env.credentials`

The script will display your credentials:

```
==========================================
  Setup Complete!
==========================================

✓ IAM User Created: s3-file-browser-user
✓ Policy Created: s3-file-browser-user-policy
ℹ S3 Bucket: my-bucket-name

ℹ Access Key ID:
  AKIAIOSFODNN7EXAMPLE

ℹ Secret Access Key:
  wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

⚠  IMPORTANT: Save these credentials now! The secret key will not be shown again.
```

## Using the Generated Credentials

The script creates a `.env.credentials` file with your credentials. To use them:

```bash
# Option 1: Copy credentials manually
# Open .env.credentials and copy the values to .env.local

# Option 2: Append to .env.local
cat .env.credentials >> .env.local

# Then edit .env.local to add your bucket name
# Add: S3_BUCKET_NAME=my-bucket-name
```

## Environment Variables Format

The `.env.credentials` file will contain:

```env
# AWS S3 Credentials for S3 File Browser
# Generated on: [date]
# IAM User: s3-file-browser-user
# S3 Bucket: my-bucket-name

AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1

# Cognito Configuration (already configured)
NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-west-1_8z9y5UukG
NEXT_PUBLIC_COGNITO_CLIENT_ID=5j11hrr7qev1r38et7rh59htcg
NEXT_PUBLIC_COGNITO_URL=eu-west-18z9y5uukg.auth.eu-west-1.amazoncognito.com
```

## Troubleshooting

### Error: AWS CLI is not installed

**Solution:**
```bash
# Install AWS CLI
# macOS
brew install awscli

# Linux (Ubuntu/Debian)
apt-get update && apt-get install awscli

# Linux (CentOS/RHEL)
yum install awscli
```

### Error: AWS credentials are not configured

**Solution:**
```bash
# Configure AWS credentials
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export AWS_DEFAULT_REGION=us-east-1
```

### Error: Access Denied

**Solution:**
- Ensure your AWS credentials have IAM permissions
- You need permissions to:
  - Create IAM users
  - Create IAM policies
  - Attach policies to users
  - Create access keys

### Error: User already exists

**Solution:**
- The script will offer to continue and create new access keys
- Type 'y' to continue
- Or use a different user name: `./create-iam-user.sh my-custom-user my-bucket`

### Error: Policy already exists

**Solution:**
- The script automatically deletes the old policy before creating a new one
- If this fails, manually delete the policy in AWS Console

## Security Best Practices

1. **Use Separate IAM Users**
   - Don't reuse existing users for different applications
   - Create a dedicated user for S3 File Browser

2. **Rotate Access Keys**
   - Periodically rotate access keys
   - Delete old access keys in AWS Console

3. **Limit Permissions**
   - The script creates minimal necessary permissions
   - Only the specified bucket is accessible

4. **Monitor Usage**
   - Enable CloudTrail to monitor API calls
   - Set up CloudWatch alarms for unusual activity

5. **Delete When Not Needed**
   - If you no longer need the user, delete it
   - This prevents unauthorized access

## Manual IAM Setup (Alternative)

If you prefer to set up IAM manually:

1. Go to AWS Console → IAM → Users
2. Click "Create user"
3. Enter username (e.g., `s3-file-browser-user`)
4. Select "Programmatic access"
5. Click "Next"
6. Click "Create policy"
7. Use the JSON policy from `iam-policy-example.json`
8. Replace `YOUR_BUCKET_NAME` with your actual bucket name
9. Name the policy and create it
10. Attach the policy to the user
11. Generate access keys
12. Save the credentials

## Viewing Created Resources

After running the script, you can view the created resources:

```bash
# View the IAM user
aws iam get-user --user-name s3-file-browser-user

# List attached policies
aws iam list-user-policies --user-name s3-file-browser-user
aws iam list-attached-user-policies --user-name s3-file-browser-user

# View the policy
aws iam get-policy --policy-arn arn:aws:iam::ACCOUNT_ID:policy/s3-file-browser-user-policy

# View access keys
aws iam list-access-keys --user-name s3-file-browser-user
```

## Clean Up

To delete the created resources:

```bash
# Delete access keys
aws iam delete-access-key --user-name s3-file-browser-user --access-key-id YOUR_ACCESS_KEY_ID

# Detach policy
aws iam detach-user-policy --user-name s3-file-browser-user --policy-arn arn:aws:iam::ACCOUNT_ID:policy/s3-file-browser-user-policy

# Delete policy
aws iam delete-policy --policy-arn arn:aws:iam::ACCOUNT_ID:policy/s3-file-browser-user-policy

# Delete user
aws iam delete-user --user-name s3-file-browser-user
```

## Summary

The automated script simplifies the IAM setup process:

✅ **Automated**: No manual steps in AWS Console  
✅ **Secure**: Creates minimal necessary permissions  
✅ **Fast**: Complete setup in seconds  
✅ **Easy**: Simple command-line interface  
✅ **Reliable**: Error handling and validation  

Just run: `./create-iam-user.sh my-bucket-name` and you're done!
