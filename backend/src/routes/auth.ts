import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../db';
import redisConnection from '../lib/redis';
import { sendOTPEmail } from '../services/emailService';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateUniqueReferralCode } from '../utils/referralCode';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(20).optional(),
  password: z.string().min(6).optional(),
  referralCode: z.string().length(6).optional(),
}).refine((d) => d.email || d.phone, {
  message: 'Either email or phone is required',
});

const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(1),
});

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ sub: userId }, process.env.JWT_SECRET!, {
    expiresIn: '30d',
  });
  const refreshToken = jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: '7d',
  });
  return { accessToken, refreshToken };
}

// POST /auth/register
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body);
    const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : null;

    let referredById: string | undefined;
    if (body.referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: body.referralCode.toUpperCase() },
      });
      if (!referrer) throw new AppError(400, 'Invalid referral code');
      referredById = referrer.id;
    }

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        passwordHash,
        referralCode: await generateUniqueReferralCode(),
        referredById,
      },
    });

    const tokens = generateTokens(user.id);
    await redisConnection.set(`refresh:${user.id}`, tokens.refreshToken, 'EX', 60 * 60 * 24 * 7);

    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, tier: user.tier }, ...tokens });
  } catch (err) {
    next(err);
  }
});

// POST /auth/login
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findFirst({
      where: body.email ? { email: body.email } : { phone: body.phone },
    });

    if (!user || !user.passwordHash) {
      throw new AppError(401, 'Invalid credentials');
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) throw new AppError(401, 'Invalid credentials');

    const tokens = generateTokens(user.id);
    await redisConnection.set(`refresh:${user.id}`, tokens.refreshToken, 'EX', 60 * 60 * 24 * 7);

    res.json({ user: { id: user.id, name: user.name, email: user.email, tier: user.tier }, ...tokens });
  } catch (err) {
    next(err);
  }
});

// POST /auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { sub: string };
    const stored = await redisConnection.get(`refresh:${payload.sub}`);

    if (stored !== refreshToken) throw new AppError(401, 'Invalid refresh token');

    const tokens = generateTokens(payload.sub);
    await redisConnection.set(`refresh:${payload.sub}`, tokens.refreshToken, 'EX', 60 * 60 * 24 * 7);

    res.json(tokens);
  } catch (err) {
    next(err);
  }
});

// POST /auth/logout
authRouter.post('/logout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await redisConnection.del(`refresh:${req.userId}`);
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

// POST /auth/otp/send
authRouter.post('/otp/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redisConnection.set(`otp:${email}`, otp, 'EX', 60 * 10);
    await sendOTPEmail(email, otp);
    res.json({ message: 'OTP sent' });
  } catch (err) {
    next(err);
  }
});

// POST /auth/otp/verify
authRouter.post('/otp/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = z.object({ email: z.string().email(), otp: z.string().length(6) }).parse(req.body);
    const stored = await redisConnection.get(`otp:${email}`);
    if (stored !== otp) throw new AppError(401, 'Invalid or expired OTP');

    await redisConnection.del(`otp:${email}`);

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { name: email.split('@')[0], email, referralCode: await generateUniqueReferralCode() },
      });
    }

    const tokens = generateTokens(user.id);
    await redisConnection.set(`refresh:${user.id}`, tokens.refreshToken, 'EX', 60 * 60 * 24 * 7);

    res.json({ user: { id: user.id, name: user.name, email: user.email, tier: user.tier }, ...tokens });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me
authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, phone: true, tier: true, language: true, referralCode: true },
    });
    if (!user) throw new AppError(404, 'User not found');
    res.json(user);
  } catch (err) {
    next(err);
  }
});
