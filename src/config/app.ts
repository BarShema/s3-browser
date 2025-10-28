export const appConfig = {
  // Pagination
  defaultItemsPerPage: 20,
  
  // Grid View Configuration
  gridView: {
    defaultItemsPerRow: 6,
    minItemsPerRow: 3,
    maxItemsPerRow: 9,
  },
  
  // Preview View Configuration
  previewView: {
    defaultItemsPerRow: 7,
    minItemsPerRow: 3,
    maxItemsPerRow: 9,
  },
  
  // S3 Configuration
  tempBucketName: "idits-drive-tmp",
  
  // Thumbnail Configuration
  thumbnailMaxWidth: 200,
  thumbnailMaxHeight: 200,
  previewMaxWidth: 1000,
  previewMaxHeight: 1000,
  
  // AWS Configuration
  region: process.env.AWS_REGION || "eu-west-1",
};
