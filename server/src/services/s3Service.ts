import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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

export const deleteFile = async (key: string): Promise<void> => {
  const command = new DeleteObjectCommand({
    Bucket: AWS_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
};

export interface S3UploadResult {
  url: string;
  key: string;
  filename: string;
}

export const uploadFile = async (file: Express.Multer.File): Promise<S3UploadResult> => {
  const fileExtension = file.originalname.split('.').pop();
  const filename = `${uuidv4()}.${fileExtension}`;
  const key = `group-photos/${filename}`;

  const command = new PutObjectCommand({
    Bucket: AWS_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);

  const url = `https://${AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${key}`;

  return { url, key, filename };
};

export const s3Service = {
  uploadFile,
  deleteFile,
  uploadImageToS3,
  uploadMultipleImages,
};