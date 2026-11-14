import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import AppError from "../../shared/utils/AppError.js";

export const MAX_FILE_SIZE = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const getUploadDir = (): string =>
  path.resolve(process.env.UPLOAD_DIR ?? "uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      const dir = getUploadDir();
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (error) {
      cb(error as Error, "");
    }
  },
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${EXTENSIONS[file.mimetype] ?? ""}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (EXTENSIONS[file.mimetype]) {
      cb(null, true);
      return;
    }
    cb(new AppError("Only JPEG, PNG and WebP images are allowed", 400));
  },
});

export const uploadSingleImage = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  upload.single("file")(req, res, (error?: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(new AppError("File too large (max 5 MB)", 413));
        return;
      }
      if (error.code === "LIMIT_UNEXPECTED_FILE") {
        next(new AppError('Unexpected file field, use "file"', 400));
        return;
      }
      next(new AppError(error.message, 400));
      return;
    }

    next(error);
  });
};

export const removeFile = async (storageKey: string): Promise<boolean> => {
  try {
    await fs.promises.unlink(
      path.join(getUploadDir(), path.basename(storageKey)),
    );
    return true;
  } catch {
    return false;
  }
};

export const cleanupUploadOnError = async (
  error: unknown,
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  if (req.file) {
    await removeFile(req.file.filename);
  }
  next(error);
};

const SIGNATURE_CHECKS: Record<string, (b: Buffer) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) =>
    b
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (b) =>
    b.subarray(0, 4).toString("ascii") === "RIFF" &&
    b.subarray(8, 12).toString("ascii") === "WEBP",
};

export const hasValidImageSignature = async (
  filePath: string,
  mimeType: string,
): Promise<boolean> => {
  const check = SIGNATURE_CHECKS[mimeType];
  if (!check) return false;

  const handle = await fs.promises.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(12);
    await handle.read(buffer, 0, 12, 0);
    return check(buffer);
  } finally {
    await handle.close();
  }
};