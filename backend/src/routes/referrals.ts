import { Router, Response, NextFunction } from 'express';
import prisma from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getFreeBondLimit, BONUS_PER_REFERRAL, MAX_REFERRAL_BONUS } from '../utils/bondLimit';

export const referralsRouter = Router();
referralsRouter.use(authenticate);

// GET /referrals
referralsRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { referralCode: true },
    });
    const referralCount = await prisma.user.count({
      where: { referredById: req.userId },
    });
    const bondLimit = await getFreeBondLimit(req.userId!);
    const maxReferrals = MAX_REFERRAL_BONUS / BONUS_PER_REFERRAL;

    res.json({
      referralCode: user?.referralCode,
      referralCount,
      bonusSlots: Math.min(referralCount * BONUS_PER_REFERRAL, MAX_REFERRAL_BONUS),
      bondLimit,
      maxReferrals,
    });
  } catch (err) {
    next(err);
  }
});
