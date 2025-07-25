import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import s3Client, { AWS_BUCKET, generateS3Url } from '../config/s3';
import { v4 as uuidv4 } from 'uuid';

export interface S3UploadResult {
  url: string;
  key: string;
  filename: string;
}

export interface UploadOptions {
  folderPath?: string;
  customFilename?: string;
  preserveExtension?: boolean;
}

// Generic upload function that handles all upload cases
export const uploadFile = async (
  file: Express.Multer.File, 
  options: UploadOptions = {}
): Promise<S3UploadResult> => {
  const { folderPath = 'uploads', customFilename, preserveExtension = true } = options;
  
  const fileExtension = preserveExtension ? file.originalname.split('.').pop() : '';
  const filename = customFilename || `${uuidv4()}${fileExtension ? '.' + fileExtension : ''}`;
  const key = `${folderPath}/${filename}`;

  const command = new PutObjectCommand({
    Bucket: AWS_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);

  const url = generateS3Url(key);

  return { url, key, filename };
};

// Specific upload functions for backward compatibility
export const uploadImageToS3 = async (
  file: Express.Multer.File,
  userId: string
): Promise<S3UploadResult> => {
  return uploadFile(file, {
    folderPath: `images/${userId}`,
  });
};

export const uploadMultipleImages = async (
  files: Express.Multer.File[],
  userId: string
): Promise<S3UploadResult[]> => {
  const uploadPromises = files.map(file => uploadImageToS3(file, userId));
  return Promise.all(uploadPromises);
};

export const deleteFile = async (key: string): Promise<void> => {
  const command = new DeleteObjectCommand({
    Bucket: AWS_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
};

export const s3Service = {
  uploadFile,
  deleteFile,
  uploadImageToS3,
  uploadMultipleImages,
};