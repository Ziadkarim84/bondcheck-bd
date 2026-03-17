import { Router, Response, NextFunction } from 'express';
import prisma from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

export const matchesRouter = Router();
matchesRouter.use(authenticate);

// GET /matches
matchesRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const matches = await prisma.matchResult.findMany({
      where: { userId: req.userId },
      include: {
        bond: true,
        drawResult: true,
      },
      orderBy: { drawResult: { drawNumber: 'desc' } },
    });
    res.json(matches);
  } catch (err) {
    next(err);
  }
});

// GET /matches/:drawNumber
matchesRouter.get('/:drawNumber', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const drawNumber = parseInt(req.params.drawNumber, 10);
    const matches = await prisma.matchResult.findMany({
      where: { userId: req.userId, drawResult: { drawNumber } },
      include: { bond: true, drawResult: true },
    });
    res.json(matches);
  } catch (err) {
    next(err);
  }
});
