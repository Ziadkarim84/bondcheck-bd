import 'dotenv/config';
import { Worker } from 'bullmq';
import { REDIS_URL } from '../lib/redis';
import { runOCR } from '../services/ocrService';
import { downloadImageToTemp, cleanupTemp } from '../services/storageService';
import prisma from '../db';

export interface OcrJobData {
  jobId: string;
  imageUrl: string;
  userId: string;
}

const worker = new Worker<OcrJobData>(
  'ocr-queue',
  async (job) => {
    const { jobId, imageUrl } = job.data;
    console.log(`Processing OCR job ${jobId}`);

    await prisma.ocrJob.update({
      where: { id: jobId },
      data: { status: 'processing' },
    });

    const tmpPath = await downloadImageToTemp(imageUrl, `${jobId}.jpg`);
    try {
      const { numbers, rawText } = await runOCR(tmpPath);

      await prisma.ocrJob.update({
        where: { id: jobId },
        data: {
          status: numbers.length > 0 ? 'done' : 'failed',
          resultJson: { numbers, rawText: rawText.slice(0, 2000) },
          error: numbers.length === 0 ? 'No bond numbers detected' : null,
        },
      });

      console.log(`OCR job ${jobId} done. Found: ${numbers.join(', ') || 'none'}`);
      return { numbers };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.ocrJob.update({
        where: { id: jobId },
        data: { status: 'failed', error: message },
      });
      throw err;
    } finally {
      cleanupTemp(tmpPath);
    }
  },
  {
    connection: { url: REDIS_URL },
    concurrency: 2,
  }
);

worker.on('completed', (job) => {
  console.log(`OCR Worker: job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`OCR Worker: job ${job?.id} failed:`, err.message);
});

console.log('OCR Worker started');
