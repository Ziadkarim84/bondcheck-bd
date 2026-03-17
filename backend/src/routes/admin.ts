import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../middleware/auth';
import { scrapeLatestResults, saveDrawResults, DrawResultInput } from '../services/resultFetcher';
import { runMatchingEngine } from '../services/matchingEngine';
import prisma from '../db';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

// POST /admin/results/fetch — trigger Puppeteer scraper
adminRouter.post('/results/fetch', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const scraped = await scrapeLatestResults();
    const saved = await saveDrawResults(scraped);
    const matches = await runMatchingEngine();
    res.json({ scraped: scraped.length, saved, newMatches: matches });
  } catch (err) {
    next(err);
  }
});

// POST /admin/results/upload — manual fallback: paste results as JSON
adminRouter.post('/results/upload', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resultSchema = z.object({
      drawNumber: z.number().int().positive(),
      drawDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      series: z.string().optional(),
      prizeRank: z.number().int().min(1).max(5),
      prizeAmount: z.number().int().positive(),
      winningNumber: z.string().regex(/^\d{7}$/),
    });

    const { results } = z.object({ results: z.array(resultSchema).min(1) }).parse(req.body);

    const saved = await saveDrawResults(results as DrawResultInput[]);
    const matches = await runMatchingEngine(results[0].drawNumber);

    res.json({ saved, newMatches: matches });
  } catch (err) {
    next(err);
  }
});

// POST /admin/results/match — re-run matching for a draw
adminRouter.post('/results/match', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { drawNumber } = z.object({ drawNumber: z.number().int().optional() }).parse(req.body);
    const matches = await runMatchingEngine(drawNumber);
    res.json({ newMatches: matches });
  } catch (err) {
    next(err);
  }
});

// GET /admin/stats
adminRouter.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [users, bonds, draws, matches] = await Promise.all([
      prisma.user.count(),
      prisma.bond.count(),
      prisma.drawResult.groupBy({ by: ['drawNumber'] }).then((r) => r.length),
      prisma.matchResult.count(),
    ]);
    res.json({ users, bonds, draws, matches });
  } catch (err) {
    next(err);
  }
});
