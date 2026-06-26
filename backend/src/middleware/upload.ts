import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';

// Store in memory — never write to filesystem
// Buffer is passed directly to Cloudinary
const storage = multer.memoryStorage();

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];

    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
}

export const uploadMiddleware = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
        files: 10,                  // Max 10 images per product
    },
});

// --- Content validation (magic bytes) ---
// multer's fileFilter only sees the client-declared Content-Type, which is
// trivially spoofable (an attacker can label an HTML/SVG/script payload as
// image/png). This middleware runs AFTER the buffer is in memory and verifies
// the actual file signature, so only real JPEG/PNG/WebP bytes get through to
// Cloudinary. Apply it directly after uploadMiddleware.array()/.single().
function detectImageType(buf: Buffer): 'jpeg' | 'png' | 'webp' | null {
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
        return 'jpeg';
    }
    if (
        buf.length >= 8 &&
        buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
        buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
    ) {
        return 'png';
    }
    // WebP = RIFF container: bytes 0–3 "RIFF", bytes 8–11 "WEBP".
    if (
        buf.length >= 12 &&
        buf.toString('ascii', 0, 4) === 'RIFF' &&
        buf.toString('ascii', 8, 12) === 'WEBP'
    ) {
        return 'webp';
    }
    return null;
}

export function validateImageContent(req: Request, res: Response, next: NextFunction) {
    const files: Express.Multer.File[] = Array.isArray(req.files)
        ? req.files
        : req.file
            ? [req.file]
            : [];

    for (const file of files) {
        if (!detectImageType(file.buffer)) {
            return res.status(400).json({
                error: `Invalid image: "${file.originalname}" is not a valid JPEG, PNG, or WebP file.`,
            });
        }
    }

    next();
}