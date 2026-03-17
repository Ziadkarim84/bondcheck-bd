import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

// PUT /notifications/token — register device push token
notificationsRouter.put('/token', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { fcmToken, expoPushToken } = z.object({
      fcmToken: z.string().optional(),
      expoPushToken: z.string().optional(),
    }).parse(req.body);

    await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(fcmToken !== undefined && { fcmToken }),
        ...(expoPushToken !== undefined && { expoPushToken }),
      },
    });

    res.json({ message: 'Token updated' });
  } catch (err) {
    next(err);
  }
});
