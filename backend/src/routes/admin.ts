import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { z } from 'zod';
import { requireAdmin } from '../middleware/auth';
import { fetchLatestResults, fetchDrawResults, saveDrawResults, parsePdfBuffer, DrawResultInput } from '../services/resultFetcher';
import { runMatchingEngine } from '../services/matchingEngine';
import prisma from '../db';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const adminRouter = Router();
adminRouter.use(requireAdmin);

// POST /admin/results/fetch — fetch latest draw PDF from Bangladesh Bank
// Optional body: { drawNumber: 122 } to fetch a specific draw
adminRouter.post('/results/fetch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { drawNumber } = z.object({ drawNumber: z.number().int().positive().optional() }).parse(req.body);
    const scraped = drawNumber ? await fetchDrawResults(drawNumber) : await fetchLatestResults();
    const saved = await saveDrawResults(scraped);
    const matches = await runMatchingEngine(scraped[0]?.drawNumber);
    res.json({ drawNumber: scraped[0]?.drawNumber, scraped: scraped.length, saved, newMatches: matches });
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

// POST /admin/results/debug-pdf — parse PDF and return raw text + extracted numbers (no DB save)
// Use this to inspect what pdf-parse sees so you can tune the parser.
adminRouter.post('/results/debug-pdf', upload.single('pdf'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file (field: pdf)' });
    const drawNumber = parseInt(req.body.drawNumber ?? '0', 10) || 0;
    const pdfData = await pdfParse(req.file.buffer);
    const text = pdfData.text;
    const numbers7 = text.match(/(?<!\d)\d{7}(?!\d)/g) ?? [];
    // Also show normalized (Bangla → ASCII)
    const { normalizeBanglaDigits } = await import('../utils/banglaDigits');
    const normalizedText = normalizeBanglaDigits(text);
    const normalizedNumbers = normalizedText.match(/(?<!\d)\d{7}(?!\d)/g) ?? [];
    res.json({
      pages: pdfData.numpages,
      rawTextPreview: text.slice(0, 3000),
      normalizedTextPreview: normalizedText.slice(0, 3000),
      sevenDigitNumbersRaw: numbers7,
      sevenDigitNumbersNormalized: normalizedNumbers,
    });
  } catch (err) {
    next(err);
  }
});

// POST /admin/results/upload-pdf — upload PDF file downloaded from Bangladesh Bank
// multipart/form-data: field "pdf" (file) + field "drawNumber" (number)
adminRouter.post('/results/upload-pdf', upload.single('pdf'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded (field name: pdf)' });
    const drawNumber = parseInt(req.body.drawNumber, 10);
    if (!drawNumber || isNaN(drawNumber)) {
      return res.status(400).json({ error: 'drawNumber is required (e.g. 122)' });
    }
    const results = await parsePdfBuffer(req.file.buffer, drawNumber);
    if (results.length === 0) {
      return res.status(422).json({ error: 'Could not extract any winning numbers from PDF. Check the draw number and PDF file.' });
    }
    const saved = await saveDrawResults(results);
    const matches = await runMatchingEngine(drawNumber);
    res.json({ drawNumber, parsed: results.length, saved, newMatches: matches });
  } catch (err) {
    next(err);
  }
});

// POST /admin/results/rematch-all — re-run matching for ALL draws against ALL bonds
// Use this after fixing parser and re-uploading PDFs
adminRouter.post('/results/rematch-all', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const draws = await prisma.drawResult.groupBy({ by: ['drawNumber'] });
    let total = 0;
    for (const { drawNumber } of draws) {
      total += await runMatchingEngine(drawNumber);
    }
    res.json({ drawsChecked: draws.length, newMatches: total });
  } catch (err) {
    next(err);
  }
});

// POST /admin/results/clear — delete all draw results for a draw number (to re-upload clean data)
adminRouter.post('/results/clear', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { drawNumber } = z.object({ drawNumber: z.number().int().positive() }).parse(req.body);
    // Delete match results for this draw first (foreign key)
    const drawResults = await prisma.drawResult.findMany({ where: { drawNumber }, select: { id: true } });
    const ids = drawResults.map((r) => r.id);
    await prisma.matchResult.deleteMany({ where: { drawResultId: { in: ids } } });
    const { count } = await prisma.drawResult.deleteMany({ where: { drawNumber } });
    res.json({ deleted: count });
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
