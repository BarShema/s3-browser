export const appConfig = {
  // Pagination
  defaultItemsPerPage: 20,

  // Grid View Configuration
  gridView: {
    defaultItemsPerRow: 6,
    minItemsPerRow: 3,
    maxItemsPerRow: 9,
    // Mobile responsive settings
    mobile: {
      defaultItemsPerRow: 2,
      minItemsPerRow: 1,
      maxItemsPerRow: 3,
    },
    tablet: {
      defaultItemsPerRow: 4,
      minItemsPerRow: 2,
      maxItemsPerRow: 6,
    },
  },

  // Preview View Configuration
  previewView: {
    defaultItemsPerRow: 7,
    minItemsPerRow: 3,
    maxItemsPerRow: 9,
    // Mobile responsive settings
    mobile: {
      defaultItemsPerRow: 2,
      minItemsPerRow: 1,
      maxItemsPerRow: 3,
    },
    tablet: {
      defaultItemsPerRow: 4,
      minItemsPerRow: 2,
      maxItemsPerRow: 6,
    },
  },

  // S3 Configuration
  tempBucketName: "idits-drive-tmp",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000",

  // Thumbnail Configuration
  thumbnailMaxWidth: 200,
  thumbnailMaxHeight: 200,
  previewMaxWidth: 1000,
  previewMaxHeight: 1000,

  // AWS Configuration
  region: process.env.AWS_REGION || "eu-west-1",
};
