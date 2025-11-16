# Idits Drive

A modern, full-featured file browser for Amazon S3 buckets built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🔐 **Secure Authentication**: AWS Cognito-based user authentication
- 🗂️ **File Management**: Browse, upload, download, rename, and delete files
- 📁 **Directory Navigation**: Navigate through S3 bucket folders with breadcrumb navigation
- 👁️ **Multiple View Modes**: List view, grid view, and preview view
- 🖼️ **Media Preview**: Preview images and videos directly in the browser
- ✏️ **Text Editing**: Edit text files directly in the browser
- 📤 **Drag & Drop Upload**: Easy file uploads with drag and drop support
- 🎨 **Modern UI**: Clean, responsive interface with Tailwind CSS
- 🔒 **Secure**: AWS credentials stored securely on the backend

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: Node.js 20+)
- AWS S3 bucket with appropriate permissions
- AWS Cognito User Pool (already configured)
- AWS Access Key ID and Secret Access Key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd idits-drive
```

2. Install dependencies:
```bash
npm install
```

3. **Option A: Automatically create IAM user (Recommended)**
   ```bash
   # Run the IAM setup script
   ./create-iam-user.sh my-bucket-name
   
   # This will:
   # - Create an IAM user
   # - Create and attach necessary policies
   # - Generate access keys
   # - Save credentials to .env.credentials
   
   # Merge credentials into .env.local
   cat .env.credentials >> .env.local
   ```

3. **Option B: Manual setup**
   Create a `.env.local` file in the root directory with your AWS credentials:

   ```env
   # AWS S3 Configuration
   AWS_ACCESS_KEY_ID=your_access_key_here
   AWS_SECRET_ACCESS_KEY=your_secret_key_here
   AWS_REGION=eu-west-1

   # AWS Cognito Configuration
   NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-west-1_8z9y5UukG
   NEXT_PUBLIC_COGNITO_CLIENT_ID=5j11hrr7qev1r38et7rh59htcg
   NEXT_PUBLIC_COGNITO_URL=eu-west-18z9y5uukg.auth.eu-west-1.amazoncognito.com
   ```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.
   - You'll be automatically redirected to the login page
   - Sign in with your Cognito credentials

### Authentication

The application uses AWS Cognito for authentication:
- **Login Required**: All pages require authentication
- **Automatic Redirect**: Unauthenticated users are redirected to `/login`
- **Session Management**: Sessions are automatically refreshed
- **Logout**: Users can logout from the top right menu

### Configuration

1. After logging in, you'll be prompted to configure your S3 bucket.
2. Enter your S3 bucket name in the configuration modal.
3. The application will use the AWS credentials from your environment variables to access the bucket.

## Usage

### File Operations

- **Upload**: Click the "Upload" button or drag and drop files onto the upload area
- **Download**: Click the download icon next to any file
- **Rename**: Click the edit icon next to any file or folder
- **Delete**: Click the delete icon next to any file or folder
- **Edit**: Double-click on text files to edit them directly in the browser

### View Modes

- **List View**: Traditional file list with details
- **Grid View**: Card-based layout with icons
- **Preview View**: Large preview cards with thumbnails

### Navigation

- Click on folders to navigate into them
- Use the breadcrumb navigation to go back to parent directories
- The "Root" button takes you back to the bucket root

## API Endpoints

The application provides several API endpoints for S3 operations:

- `GET /api/s3` - List files and directories
- `POST /api/s3` - Upload files
- `DELETE /api/s3` - Delete files
- `PATCH /api/s3` - Rename files
- `GET /api/s3/download` - Get download URLs
- `GET /api/s3/content` - Get file content for editing
- `PUT /api/s3/content` - Save file content

## Security

- AWS credentials are stored securely on the backend
- All S3 operations are performed server-side
- Signed URLs are used for secure file downloads
- No sensitive information is exposed to the client

## Technologies Used

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **AWS Integration**: AWS SDK v3
- **UI Components**: Lucide React icons
- **File Handling**: React Dropzone
- **Notifications**: React Hot Toast

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.