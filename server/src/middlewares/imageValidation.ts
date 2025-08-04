import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { Request } from 'express';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 10;

const storage = multer.memoryStorage();

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.',
      ),
    );
  }
};

export const imageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
});

export const singleImageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

interface MulterRequest extends Request {
  files?: Express.Multer.File[];
}

export const validateImageBatch = async (
  req: MulterRequest,
  res: any,
  next: any,
) => {
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files provided' });
  }

  if (files.length > MAX_FILES) {
    return res
      .status(400)
      .json({ error: `Maximum ${MAX_FILES} files allowed` });
  }

  let totalSize = 0;
  for (const file of files) {
    totalSize += file.size;

    // Validate actual file type using buffer
    if (file.buffer) {
      const type = await fileTypeFromBuffer(file.buffer);
      if (!type || !ALLOWED_MIME_TYPES.includes(type.mime)) {
        return res.status(400).json({
          error: `Invalid file type for ${file.originalname}. Only JPEG, PNG, GIF, and WebP images are allowed.`,
        });
      }
    }
  }

  if (totalSize > MAX_FILE_SIZE) {
    return res.status(400).json({ error: 'Total file size exceeds 5MB limit' });
  }

  next();
};

interface SingleFileRequest extends Request {
  file: Express.Multer.File;
}

export const validateSingleImage = async (
  req: SingleFileRequest,
  res: any,
  next: any,
) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  if (file.size > MAX_FILE_SIZE) {
    return res.status(400).json({ error: 'File size exceeds 5MB limit' });
  }

  const buffer = file.buffer;
  const type = await fileTypeFromBuffer(buffer);

  if (!type || !ALLOWED_MIME_TYPES.includes(type.mime)) {
    return res.status(400).json({
      error:
        'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.',
    });
  }

  next();
};
