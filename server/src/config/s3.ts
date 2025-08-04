import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const AWS_BUCKET = process.env.AWS_BUCKET!;
export const AWS_REGION = process.env.AWS_DEFAULT_REGION!;

// Generate S3 URL from key
export const generateS3Url = (key: string): string => {
  return `https://${AWS_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
};

// Extract storage key from full S3 URL
export const extractStorageKeyFromUrl = (url: string): string => {
  const baseUrl = `https://${AWS_BUCKET}.s3.${AWS_REGION}.amazonaws.com/`;
  return url.replace(baseUrl, '');
};

export default s3Client;