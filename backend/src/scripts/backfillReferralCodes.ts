import prisma from '../db';
import { generateUniqueReferralCode } from '../utils/referralCode';

async function backfill() {
  const users = await prisma.user.findMany({ where: { referralCode: null } });
  console.log(`Found ${users.length} users without referral codes`);

  for (const user of users) {
    const code = await generateUniqueReferralCode();
    await prisma.user.update({ where: { id: user.id }, data: { referralCode: code } });
    console.log(`  ${user.email ?? user.id} → ${code}`);
  }

  console.log('Backfill complete');
  await prisma.$disconnect();
}

backfill().catch((e) => {
  console.error(e);
  process.exit(1);
});
