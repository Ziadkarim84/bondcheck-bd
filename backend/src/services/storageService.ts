import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import https from 'https';
import http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadBondImage(buffer: Buffer, userId: string, jobId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `bonds/${userId}`,
        public_id: jobId,
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error('Upload failed'));
        resolve(result.secure_url);
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
}

export async function downloadImageToTemp(imageUrl: string, filename: string): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), filename);
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(tmpPath);
    const protocol = imageUrl.startsWith('https') ? https : http;
    protocol
      .get(imageUrl, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(tmpPath);
        });
      })
      .on('error', (err) => {
        fs.unlink(tmpPath, () => {});
        reject(err);
      });
  });
}

export function cleanupTemp(filePath: string) {
  fs.unlink(filePath, () => {});
}
