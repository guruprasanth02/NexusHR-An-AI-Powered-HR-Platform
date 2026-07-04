import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../index';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';

const router = Router();

// ── Register ──────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      throw createError('Name, email and password are required', 400);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw createError('Email already registered', 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const verifyToken = uuidv4();

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role === 'HR' ? 'HR' : role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE',
        verifyToken,
        isVerified: false,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    // Create leave balance for current year
    await prisma.leaveBalance.create({
      data: { userId: user.id, year: new Date().getFullYear() },
    });

    await sendVerificationEmail(email, name, verifyToken).catch(console.error);

    res.status(201).json({
      success: true,
      message: 'Account created. Please verify your email.',
      data: user,
    });
  } catch (err) {
    next(err);
  }
});

// ── Verify Email ──────────────────────────────────────────────
router.get('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query as { token: string };
    if (!token) throw createError('Token required', 400);

    const user = await prisma.user.findFirst({ where: { verifyToken: token } });
    if (!user) throw createError('Invalid or expired token', 400);

    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verifyToken: null },
    });

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
});

// ── Login ─────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw createError('Email and password required', 400);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { department: { select: { id: true, name: true } } },
    });

    if (!user) throw createError('Invalid credentials', 401);
    if (!user.isActive) throw createError('Account is deactivated', 403);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw createError('Invalid credentials', 401);

    // Allow login even if not verified (just warn)
    const accessToken = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          position: user.position,
          department: user.department,
          isVerified: user.isVerified,
          employeeId: user.employeeId,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── Refresh Token ─────────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    if (!token) throw createError('Refresh token required', 401);

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { id: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, email: true, refreshToken: true, isActive: true },
    });

    if (!user || user.refreshToken !== token || !user.isActive) {
      throw createError('Invalid refresh token', 401);
    }

    const accessToken = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any }
    );

    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    next(err);
  }
});

// ── Logout ────────────────────────────────────────────────────
router.post('/logout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { refreshToken: null },
    });
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

// ── Forgot Password ───────────────────────────────────────────
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) throw createError('Email required', 400);

    const user = await prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If email exists, reset link sent' });
    }

    const resetToken = uuidv4();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    await sendPasswordResetEmail(email, user.name, resetToken).catch(console.error);
    res.json({ success: true, message: 'If email exists, reset link sent' });
  } catch (err) {
    next(err);
  }
});

// ── Reset Password ────────────────────────────────────────────
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) throw createError('Token and password required', 400);

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) throw createError('Invalid or expired reset token', 400);

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    next(err);
  }
});

// ── Get Me ────────────────────────────────────────────────────
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { department: true },
    });

    if (!user) throw createError('User not found', 404);

    const { passwordHash, refreshToken, verifyToken, resetToken, resetTokenExpiry, ...safeUser } = user as any;
    res.json({ success: true, data: safeUser });
  } catch (err) {
    next(err);
  }
});

export default router;
