import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export interface UploadResult {
    url: string;
    publicId: string;
    width: number;
    height: number;
    format: string;
}

// Upload a buffer directly to Cloudinary (no temp file written to disk)
export async function uploadImage(
    buffer: Buffer,
    folder: string = 'aranya-ceylon',
): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'image',
                format: 'webp',           // Auto-convert to WebP for best compression
                quality: 'auto:good',     // Cloudinary picks optimal quality
                transformation: [
                    { width: 1200, height: 1200, crop: 'limit' }, // Max dimensions
                ],
            },
            (error, result) => {
                if (error || !result) return reject(error);
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                    width: result.width,
                    height: result.height,
                    format: result.format,
                });
            },
        );
        stream.end(buffer);
    });
}

// Delete an image from Cloudinary by public ID
export async function deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
}