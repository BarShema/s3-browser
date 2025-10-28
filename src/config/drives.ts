import { appConfig } from "./app";

export const driveConfig = {
  drives: [
    "idits-drive",
    "portfolio-files2"
  ],
  tempDrive: appConfig.tempBucketName,
  region: appConfig.region,
};
