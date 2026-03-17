import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../db';
import { REDIS_URL } from '../lib/redis';
import { uploadBondImage } from '../services/storageService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const bondsRouter = Router();
bondsRouter.use(authenticate);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const ocrQueue = new Queue('ocr-queue', { connection: { url: REDIS_URL } });

// GET /bonds
bondsRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bonds = await prisma.bond.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bonds);
  } catch (err) {
    next(err);
  }
});

// POST /bonds — manual add
bondsRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { number, series } = z.object({
      number: z.string().regex(/^\d{7}$/, '7-digit bond number required'),
      series: z.string().optional(),
    }).parse(req.body);

    const bond = await prisma.bond.create({
      data: { userId: req.userId!, number, series, addedVia: 'manual' },
    });
    res.status(201).json(bond);
  } catch (err) {
    next(err);
  }
});

// DELETE /bonds/:id
bondsRouter.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bond = await prisma.bond.findUnique({ where: { id: req.params.id } });
    if (!bond || bond.userId !== req.userId) throw new AppError(404, 'Bond not found');
    await prisma.bond.delete({ where: { id: req.params.id } });
    res.json({ message: 'Bond deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /bonds/ocr — upload image and start OCR job
bondsRouter.post('/ocr', upload.single('image'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError(400, 'Image file is required');

    const jobId = uuidv4();

    // Upload to Cloudinary
    const imageUrl = await uploadBondImage(req.file.buffer, req.userId!, jobId);

    // Create OCR job record
    await prisma.ocrJob.create({
      data: { id: jobId, userId: req.userId!, imageUrl, status: 'pending' },
    });

    // Enqueue BullMQ job
    await ocrQueue.add('process-ocr', { jobId, imageUrl, userId: req.userId }, { jobId });

    res.status(202).json({ jobId, status: 'pending' });
  } catch (err) {
    next(err);
  }
});

// GET /bonds/ocr/:jobId — poll status
bondsRouter.get('/ocr/:jobId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const job = await prisma.ocrJob.findUnique({ where: { id: req.params.jobId } });
    if (!job || job.userId !== req.userId) throw new AppError(404, 'OCR job not found');
    res.json(job);
  } catch (err) {
    next(err);
  }
});

// POST /bonds/ocr/:jobId/confirm — save confirmed bond numbers
bondsRouter.post('/ocr/:jobId/confirm', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { numbers } = z.object({
      numbers: z.array(z.string().regex(/^\d{7}$/)).min(1),
    }).parse(req.body);

    const job = await prisma.ocrJob.findUnique({ where: { id: req.params.jobId } });
    if (!job || job.userId !== req.userId) throw new AppError(404, 'OCR job not found');
    if (job.status !== 'done') throw new AppError(400, 'OCR job is not complete');

    const created = await Promise.all(
      numbers.map((number) =>
        prisma.bond.upsert({
          where: { unique_bond_per_user: { userId: req.userId!, number } },
          create: { userId: req.userId!, number, imageUrl: job.imageUrl, addedVia: 'ocr' },
          update: {},
        })
      )
    );

    res.status(201).json({ saved: created.length, bonds: created });
  } catch (err) {
    next(err);
  }
});

// GET /bonds/stats
bondsRouter.get('/stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.bond.count({ where: { userId: req.userId } });
    const wins = await prisma.matchResult.count({ where: { userId: req.userId } });
    res.json({ totalBonds: count, totalWins: wins });
  } catch (err) {
    next(err);
  }
});
