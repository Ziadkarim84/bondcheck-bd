import { Resend } from 'resend';

const FROM = 'BondCheck BD <noreply@bondcheckbd.com>';

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — emails will not be sent');
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendOTPEmail(email: string, otp: string) {
  const resend = getResend();
  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'আপনার OTP কোড / Your OTP Code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>BondCheck BD</h2>
        <p>আপনার OTP কোড: <strong style="font-size:24px;letter-spacing:4px">${otp}</strong></p>
        <p>Your OTP code: <strong style="font-size:24px;letter-spacing:4px">${otp}</strong></p>
        <p style="color:#666">This code expires in 10 minutes.</p>
      </div>
    `,
  });
}

export async function sendWinEmail(
  email: string,
  bondNumber: string,
  prizeAmount: number,
  drawNumber: number,
  prizeRank: number
) {
  const resend = getResend();
  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: '🎉 আপনার প্রাইজবন্ড জিতেছে! / Your Prize Bond Won!',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>🎉 অভিনন্দন! Congratulations!</h2>
        <p>বন্ড নং <strong>${bondNumber}</strong> ড্র নং <strong>${drawNumber}</strong>-এ ${prizeRank}ম পুরস্কার জিতেছে।</p>
        <p>Bond #<strong>${bondNumber}</strong> won the <strong>${prizeRank}${ordinal(prizeRank)} prize</strong> in draw #${drawNumber}.</p>
        <p style="font-size:20px">পুরস্কার / Prize: <strong>৳${prizeAmount.toLocaleString()}</strong></p>
        <p style="color:#666;font-size:12px">Note: 20% source tax is deducted under Income Tax Act 2023. Claim your prize within 2 years.</p>
      </div>
    `,
  });
}

function ordinal(n: number) {
  return ['st', 'nd', 'rd'][n - 1] ?? 'th';
}
