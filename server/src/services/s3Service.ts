import { PutObjectCommand } from '@aws-sdk/client-s3';
import s3Client, { AWS_BUCKET } from '../config/s3';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  url: string;
  key: string;
}

export const uploadImageToS3 = async (
  file: Express.Multer.File,
  userId: string
): Promise<UploadResult> => {
  const fileExtension = file.originalname.split('.').pop();
  const key = `images/${userId}/${uuidv4()}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: AWS_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);

  const url = `https://${AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${key}`;

  return { url, key };
};

export const uploadMultipleImages = async (
  files: Express.Multer.File[],
  userId: string
): Promise<UploadResult[]> => {
  const uploadPromises = files.map(file => uploadImageToS3(file, userId));
  return Promise.all(uploadPromises);
};