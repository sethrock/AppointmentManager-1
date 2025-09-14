import multer from "multer";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";

// Helper function to sanitize filenames
const sanitizeFilename = (filename: string): string => {
  // Remove any path traversal attempts and special characters
  const name = path.parse(filename).name.replace(/[^a-zA-Z0-9-_]/g, '_');
  const ext = path.extname(filename);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${name}_${timestamp}_${random}${ext}`;
};

// Helper function to ensure directory exists
const ensureDir = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Photo upload configuration
const photoStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const providerId = req.params.id;
    const uploadPath = path.join("uploads", "providers", providerId, "photos");
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const sanitized = sanitizeFilename(file.originalname);
    cb(null, sanitized);
  }
});

// Document upload configuration
const documentStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const providerId = req.params.id;
    const uploadPath = path.join("uploads", "providers", providerId, "documents");
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const sanitized = sanitizeFilename(file.originalname);
    cb(null, sanitized);
  }
});

// File filter for photos
const photoFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG and WebP images are allowed.'));
  }
};

// File filter for documents
const documentFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG and PNG files are allowed.'));
  }
};

// Photo upload middleware
export const uploadPhoto = multer({
  storage: photoStorage,
  fileFilter: photoFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Document upload middleware
export const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Error handling middleware
export const handleUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large' });
    }
    return res.status(400).json({ message: err.message });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};