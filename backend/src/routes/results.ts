import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../db';

export const resultsRouter = Router();

// GET /results
resultsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(String(req.query.page ?? '1'), 10);
    const limit = 20;
    const skip = (page - 1) * limit;

    const draws = await prisma.drawResult.groupBy({
      by: ['drawNumber', 'drawDate'],
      orderBy: { drawNumber: 'desc' },
      skip,
      take: limit,
    });

    res.json({ draws, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /results/latest
resultsRouter.get('/latest', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const latest = await prisma.drawResult.findFirst({ orderBy: { drawNumber: 'desc' } });
    if (!latest) return res.json(null);

    const results = await prisma.drawResult.findMany({
      where: { drawNumber: latest.drawNumber },
      orderBy: [{ prizeRank: 'asc' }, { winningNumber: 'asc' }],
    });

    res.json({ drawNumber: latest.drawNumber, drawDate: latest.drawDate, results });
  } catch (err) {
    next(err);
  }
});

// GET /results/:drawNumber
resultsRouter.get('/:drawNumber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const drawNumber = parseInt(req.params.drawNumber, 10);
    const results = await prisma.drawResult.findMany({
      where: { drawNumber },
      orderBy: [{ prizeRank: 'asc' }, { winningNumber: 'asc' }],
    });
    if (!results.length) return res.status(404).json({ error: 'Draw not found' });
    res.json({ drawNumber, drawDate: results[0].drawDate, results });
  } catch (err) {
    next(err);
  }
});
