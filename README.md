# IDITS Drive - Frontend

A modern, dynamic frontend application for managing files and directories in S3-based drive storage.

## Overview

This is a **frontend-only** Next.js application that connects to an external API server. All content is dynamically rendered as it changes frequently per user and drive.

## Features

- 🎨 Modern, responsive UI with theme support
- 📁 File and directory management
- 🔐 Authentication via AWS Cognito
- 🖼️ Image and video previews
- 📄 Text file editing
- 🔍 Advanced filtering and search
- 📱 Mobile-friendly interface

## Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- Access to an external IDITS Drive API server

## Installation

```bash
# Install dependencies
npm install
# or
yarn install
# or
pnpm install
```

## Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Required: API Base URL
# Point this to your external API server
NEXT_PUBLIC_API_BASE_URL=https://api.example.com

# Optional: AWS Region
AWS_REGION=eu-west-1
```

**Important**: The `NEXT_PUBLIC_API_BASE_URL` environment variable is **required**. The application will not work without it.

### API Server

This frontend requires a separate API server running the IDITS Drive Backend API. The API should be accessible at the URL specified in `NEXT_PUBLIC_API_BASE_URL`.

See the API documentation in `swagger.yaml` for the expected API structure.

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The application will be available at `http://localhost:3000` (or the port specified by Next.js).

## Architecture

### Dynamic Rendering

All pages are configured for **dynamic rendering** because:
- Content changes frequently per user
- Each drive has different content
- File listings are user-specific
- Authentication state is dynamic

No static generation is used - all pages are rendered on-demand.

### SDK

The application uses a centralized SDK located in `src/utils/sdk/` that handles all API communication. The SDK:

- Uses `NEXT_PUBLIC_API_BASE_URL` for the API base URL
- Provides type-safe API methods
- Handles all HTTP requests to the external API

See `src/utils/sdk/README.md` for detailed SDK documentation.

## Project Structure

```
src/
├── app/              # Next.js app router pages
│   ├── page.tsx      # Home page (drive selection)
│   ├── [...path]/    # Dynamic route for file explorer
│   └── login/        # Login page
├── components/       # React components
├── contexts/         # React contexts (Auth, Theme)
├── config/           # Configuration files
├── lib/              # Utilities and SDK instance
└── utils/
    └── sdk/          # API SDK (standalone, reusable)
```

## Deployment

This is a frontend-only application. Deploy it to:

- **Vercel** (recommended for Next.js)
- **AWS Amplify**
- **Netlify**
- **Any Node.js hosting** that supports Next.js

**Important**: Make sure to set the `NEXT_PUBLIC_API_BASE_URL` environment variable in your deployment platform.

### Build Output

The application builds as a standard Next.js application (not static export). It requires a Node.js server to run.

## API Integration

The frontend communicates with an external API server. Ensure:

1. The API server is running and accessible
2. CORS is properly configured on the API server to allow requests from your frontend domain
3. The `NEXT_PUBLIC_API_BASE_URL` environment variable points to the correct API server

## Authentication

Authentication is handled via AWS Cognito. Configure your Cognito settings in the authentication context.

## License

Copyright © IDITS Drive

