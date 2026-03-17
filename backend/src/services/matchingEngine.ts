import prisma from '../db';
import { sendWinNotification } from './notificationService';
import { sendWinEmail } from './emailService';

export async function runMatchingEngine(drawNumber?: number): Promise<number> {
  // Find the latest draw (or specific draw)
  const latestResult = await prisma.drawResult.findFirst({
    where: drawNumber ? { drawNumber } : undefined,
    orderBy: { drawNumber: 'desc' },
  });

  if (!latestResult) {
    console.log('No draw results found to match against');
    return 0;
  }

  const targetDraw = drawNumber ?? latestResult.drawNumber;

  const winningNumbers = await prisma.drawResult.findMany({
    where: { drawNumber: targetDraw },
  });

  console.log(`Matching against draw #${targetDraw} with ${winningNumbers.length} winning numbers`);
  let matchCount = 0;

  for (const result of winningNumbers) {
    const matchingBonds = await prisma.bond.findMany({
      where: { number: result.winningNumber },
      include: { user: true },
    });

    for (const bond of matchingBonds) {
      // Skip if match already recorded
      const existing = await prisma.matchResult.findFirst({
        where: { bondId: bond.id, drawResultId: result.id },
      });
      if (existing) continue;

      await prisma.matchResult.create({
        data: {
          userId: bond.userId,
          bondId: bond.id,
          drawResultId: result.id,
        },
      });

      matchCount++;

      // Send notifications
      await sendWinNotification(
        bond.user.fcmToken,
        bond.user.expoPushToken,
        bond.number,
        result.prizeAmount,
        result.drawNumber,
        result.prizeRank
      );

      if (bond.user.email) {
        await sendWinEmail(
          bond.user.email,
          bond.number,
          result.prizeAmount,
          result.drawNumber,
          result.prizeRank
        );
      }

      // Mark as notified
      await prisma.matchResult.updateMany({
        where: { bondId: bond.id, drawResultId: result.id },
        data: { notifiedAt: new Date() },
      });
    }
  }

  console.log(`Matching complete. ${matchCount} new matches found for draw #${targetDraw}`);
  return matchCount;
}

/**
 * Check a single newly-added bond against all existing draw results.
 * Called after POST /bonds so users immediately see wins for past draws.
 */
export async function checkBondAgainstAllResults(
  bondId: string,
  bondNumber: string,
  userId: string
): Promise<number> {
  const winningResults = await prisma.drawResult.findMany({
    where: { winningNumber: bondNumber },
  });

  if (winningResults.length === 0) return 0;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return 0;

  let matchCount = 0;
  for (const result of winningResults) {
    const existing = await prisma.matchResult.findFirst({
      where: { bondId, drawResultId: result.id },
    });
    if (existing) continue;

    await prisma.matchResult.create({
      data: { userId, bondId, drawResultId: result.id },
    });
    matchCount++;

    await sendWinNotification(
      user.fcmToken,
      user.expoPushToken,
      bondNumber,
      result.prizeAmount,
      result.drawNumber,
      result.prizeRank
    );
    if (user.email) {
      await sendWinEmail(user.email, bondNumber, result.prizeAmount, result.drawNumber, result.prizeRank);
    }
    await prisma.matchResult.updateMany({
      where: { bondId, drawResultId: result.id },
      data: { notifiedAt: new Date() },
    });
  }

  console.log(`checkBondAgainstAllResults: ${matchCount} wins found for bond ${bondNumber}`);
  return matchCount;
}
