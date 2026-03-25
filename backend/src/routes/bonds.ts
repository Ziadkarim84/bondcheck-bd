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
import { checkBondAgainstAllResults } from '../services/matchingEngine';
import { getFreeBondLimit } from '../utils/bondLimit';

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

// GET /bonds/export — CSV download (Premium only)
bondsRouter.get('/export', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user?.tier !== 'premium') throw new AppError(403, 'Export is a Premium feature. Upgrade to download your bonds.');

    const bonds = await prisma.bond.findMany({
      where: { userId: req.userId },
      orderBy: { number: 'asc' },
    });

    const rows = ['Number,Series,AddedVia,CreatedAt']
      .concat(bonds.map((b) => `${b.number},${b.series ?? ''},${b.addedVia},${b.createdAt.toISOString()}`))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=my-bonds.csv');
    res.send(rows);
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

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user?.tier === 'free') {
      const limit = await getFreeBondLimit(req.userId!);
      const count = await prisma.bond.count({ where: { userId: req.userId } });
      if (count >= limit) {
        throw new AppError(403, `Free limit of ${limit} bonds reached. Refer friends or upgrade to Premium for more.`);
      }
    }

    const bond = await prisma.bond.create({
      data: { userId: req.userId!, number, series, addedVia: 'manual' },
    });

    checkBondAgainstAllResults(bond.id, bond.number, req.userId!).catch((e) =>
      console.error('[Bonds] Post-add match check failed:', e)
    );

    res.status(201).json(bond);
  } catch (err) {
    next(err);
  }
});

// POST /bonds/range — add a consecutive range
bondsRouter.post('/range', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { from, to, series } = z.object({
      from:   z.string().regex(/^\d{7}$/, 'from must be a 7-digit number'),
      to:     z.string().regex(/^\d{7}$/, 'to must be a 7-digit number'),
      series: z.string().optional(),
    }).parse(req.body);

    const start = parseInt(from, 10);
    const end   = parseInt(to,   10);
    if (start > end) throw new AppError(400, '"from" must be ≤ "to"');
    const rangeCount = end - start + 1;
    if (rangeCount > 1000) throw new AppError(400, 'Range too large — max 1000 bonds at once');

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user?.tier === 'free') {
      const limit = await getFreeBondLimit(req.userId!);
      const existing = await prisma.bond.count({ where: { userId: req.userId } });
      if (existing + rangeCount > limit) {
        throw new AppError(403, `Adding ${rangeCount} bonds would exceed your free limit of ${limit}. Refer friends or upgrade to Premium for more.`);
      }
    }

    const created: string[] = [];
    for (let n = start; n <= end; n++) {
      const number = String(n).padStart(7, '0');
      const bond = await prisma.bond.upsert({
        where: { unique_bond_per_user: { userId: req.userId!, number } },
        create: { userId: req.userId!, number, series, addedVia: 'manual' },
        update: {},
      });
      created.push(bond.id);
      checkBondAgainstAllResults(bond.id, number, req.userId!).catch(() => {});
    }

    res.status(201).json({ added: created.length, from, to });
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
    const imageUrl = await uploadBondImage(req.file.buffer, req.userId!, jobId);

    await prisma.ocrJob.create({
      data: { id: jobId, userId: req.userId!, imageUrl, status: 'pending' },
    });

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

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user?.tier === 'free') {
      const limit = await getFreeBondLimit(req.userId!);
      const existing = await prisma.bond.count({ where: { userId: req.userId } });
      if (existing + numbers.length > limit) {
        throw new AppError(403, `Adding ${numbers.length} bonds would exceed your free limit of ${limit}. Refer friends or upgrade to Premium for more.`);
      }
    }

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
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const [count, matches] = await Promise.all([
      prisma.bond.count({ where: { userId: req.userId } }),
      prisma.matchResult.findMany({
        where: { userId: req.userId },
        include: { drawResult: true },
      }),
    ]);
    const totalPrizeEarned = matches.reduce((sum, m) => sum + m.drawResult.prizeAmount, 0);
    res.json({
      totalBonds: count,
      totalWins: matches.length,
      totalPrizeEarned,
      afterTaxEarned: Math.floor(totalPrizeEarned * 0.8),
      tier: user?.tier ?? 'free',
      bondLimit: user?.tier === 'premium' ? null : await getFreeBondLimit(req.userId!),
    });
  } catch (err) {
    next(err);
  }
});
