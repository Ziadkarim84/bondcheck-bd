import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { bondsRouter } from './routes/bonds';
import { resultsRouter } from './routes/results';
import { matchesRouter } from './routes/matches';
import { notificationsRouter } from './routes/notifications';
import { adminRouter } from './routes/admin';
import { referralsRouter } from './routes/referrals';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return cb(null, true);
        if (allowedOrigins.some((o) => origin.startsWith(o))) return cb(null, true);
        cb(new Error(`CORS: ${origin} not allowed`));
      },
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/v1/auth', authRouter);
  app.use('/v1/bonds', bondsRouter);
  app.use('/v1/results', resultsRouter);
  app.use('/v1/matches', matchesRouter);
  app.use('/v1/notifications', notificationsRouter);
  app.use('/v1/admin', adminRouter);
  app.use('/v1/referrals', referralsRouter);

  app.use(errorHandler);

  return app;
}
