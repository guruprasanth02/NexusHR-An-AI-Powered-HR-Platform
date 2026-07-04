import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';

const router = Router();
router.use(authenticate);

// ── List users (HR/Admin) ─────────────────────────────────────
router.get('/', authorize('HR', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', search = '', departmentId, role } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { position: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(departmentId && { departmentId }),
      ...(role && { role: role as 'EMPLOYEE' | 'HR' | 'ADMIN' }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        select: {
          id: true, employeeId: true, name: true, email: true, role: true,
          avatar: true, position: true, phone: true, joinDate: true,
          dateOfBirth: true, isVerified: true, isActive: true,
          department: { select: { id: true, name: true, color: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      meta: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
});

// ── Get user by ID ────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // Employees can only view themselves
    if (req.user!.role === 'EMPLOYEE' && id !== req.user!.id) {
      throw createError('Forbidden', 403);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: { department: true },
    });

    if (!user) throw createError('User not found', 404);

    const { passwordHash, refreshToken, verifyToken, resetToken, resetTokenExpiry, ...safeUser } = user as any;
    res.json({ success: true, data: safeUser });
  } catch (err) {
    next(err);
  }
});

// ── Update profile ────────────────────────────────────────────
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (req.user!.role === 'EMPLOYEE' && id !== req.user!.id) {
      throw createError('Forbidden', 403);
    }

    const allowedFields = ['name', 'phone', 'address', 'emergencyContact', 'avatar'];
    const adminFields = ['position', 'departmentId', 'salary', 'joinDate', 'dateOfBirth', 'role'];

    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    }
    if (['HR', 'ADMIN'].includes(req.user!.role)) {
      for (const field of adminFields) {
        if (req.body[field] !== undefined) data[field] = req.body[field];
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, name: true, email: true, role: true, avatar: true,
        position: true, phone: true, department: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// ── Change password ───────────────────────────────────────────
router.post('/:id/change-password', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (id !== req.user!.id) throw createError('Forbidden', 403);

    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw createError('User not found', 404);

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw createError('Current password incorrect', 400);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id }, data: { passwordHash } });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

// ── Deactivate user (Admin) ───────────────────────────────────
router.delete('/:id', authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'User deactivated' });
  } catch (err) {
    next(err);
  }
});

// ── Departments CRUD ──────────────────────────────────────────
router.get('/departments/list', async (_req, res, next) => {
  try {
    const departments = await prisma.department.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: departments });
  } catch (err) {
    next(err);
  }
});

router.post('/departments', authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, color } = req.body;
    const dept = await prisma.department.create({ data: { name, description, color } });
    res.status(201).json({ success: true, data: dept });
  } catch (err) {
    next(err);
  }
});

export default router;
