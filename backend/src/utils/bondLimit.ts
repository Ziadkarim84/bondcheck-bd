import prisma from '../db';

export const FREE_BASE_LIMIT = 25;
export const BONUS_PER_REFERRAL = 5;
export const MAX_REFERRAL_BONUS = 100; // 20 referrals max

export async function getFreeBondLimit(userId: string): Promise<number> {
  const referralCount = await prisma.user.count({
    where: { referredById: userId },
  });
  const bonus = Math.min(referralCount * BONUS_PER_REFERRAL, MAX_REFERRAL_BONUS);
  return FREE_BASE_LIMIT + bonus;
}
