import { appConfig } from "./app";

export const bucketConfig = {
  buckets: [
    "idits-drive",
    "portfolio-files2"
  ],
  tempBucket: appConfig.tempBucketName,
  region: appConfig.region,
};
