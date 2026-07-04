import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { io } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';
import { generateLeaveRecommendation } from '../services/ai.service';
import { sendLeaveStatusEmail } from '../services/email.service';
import { emitToUser } from '../services/socket.service';

const router = Router();
router.use(authenticate);

// ── Apply Leave ───────────────────────────────────────────────
router.post('/apply', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { type, startDate, endDate, reason } = req.body;

    if (!type || !startDate || !endDate || !reason) {
      throw createError('All fields required', 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (days <= 0) throw createError('Invalid date range', 400);

    // Check leave balance
    const balance = await prisma.leaveBalance.findUnique({
      where: { userId_year: { userId, year: new Date().getFullYear() } },
    });

    const typeKey = type.toLowerCase() as keyof typeof balance;
    const usedKey = `used${type.charAt(0) + type.slice(1).toLowerCase()}` as keyof typeof balance;

    if (balance) {
      const available = (balance[typeKey] as number || 0) - (balance[usedKey] as number || 0);
      if (available < days) {
        throw createError(`Insufficient ${type} leave balance. Available: ${available} days`, 400);
      }
    }

    const leave = await prisma.leave.create({
      data: {
        userId,
        type: type as 'CASUAL' | 'SICK' | 'ANNUAL' | 'MATERNITY' | 'PATERNITY' | 'UNPAID' | 'COMPENSATORY',
        startDate: start,
        endDate: end,
        days,
        reason,
        status: 'PENDING',
      },
      include: { user: { select: { name: true, email: true } } },
    });

    // Notify HR users
    const hrUsers = await prisma.user.findMany({
      where: { role: { in: ['HR', 'ADMIN'] }, isActive: true },
      select: { id: true },
    });

    await Promise.all(
      hrUsers.map(async (hr: { id: string }) => {
        const notif = await prisma.notification.create({
          data: {
            userId: hr.id,
            title: 'New Leave Request',
            body: `${leave.user.name} applied for ${days} day(s) ${type} leave`,
            type: 'LEAVE_REQUEST',
            metadata: JSON.stringify({ leaveId: leave.id, employeeName: leave.user.name }),
          },
        });
        emitToUser(io, hr.id, 'notification:new', notif);
      })
    );

    res.status(201).json({ success: true, data: leave });
  } catch (err) {
    next(err);
  }
});

// ── My Leaves ─────────────────────────────────────────────────
router.get('/my', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { status, year } = req.query as Record<string, string>;
    const targetYear = parseInt(year || String(new Date().getFullYear()));

    const leaves = await prisma.leave.findMany({
      where: {
        userId,
        ...(status && { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' }),
        startDate: {
          gte: new Date(targetYear, 0, 1),
          lte: new Date(targetYear, 11, 31),
        },
      },
      include: {
        approvedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Leave balance
    const balance = await prisma.leaveBalance.findUnique({
      where: { userId_year: { userId, year: targetYear } },
    });

    res.json({ success: true, data: leaves, balance });
  } catch (err) {
    next(err);
  }
});

// ── HR: All pending leaves ────────────────────────────────────
router.get('/pending', authorize('HR', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const leaves = await prisma.leave.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: {
            id: true, name: true, email: true, avatar: true, position: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: leaves });
  } catch (err) {
    next(err);
  }
});

// ── HR: All leaves ────────────────────────────────────────────
router.get('/all', authorize('HR', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, departmentId, page = '1', limit = '20' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where: {
          ...(status && { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' }),
          ...(departmentId && { user: { departmentId } }),
        },
        include: {
          user: {
            select: {
              id: true, name: true, email: true, avatar: true, position: true,
              department: { select: { name: true, color: true } },
            },
          },
          approvedBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.leave.count({
        where: {
          ...(status && { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' }),
        },
      }),
    ]);

    res.json({
      success: true,
      data: leaves,
      meta: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    next(err);
  }
});

// ── AI Recommendation for a leave ────────────────────────────
router.get('/:id/recommendation', authorize('HR', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const leave = await prisma.leave.findUnique({
      where: { id: req.params.id },
      include: { user: { include: { attendances: true } } },
    });

    if (!leave) throw createError('Leave not found', 404);

    // If already has recommendation, return it
    if (leave.aiRecommendation) {
      try {
        return res.json({ success: true, data: JSON.parse(leave.aiRecommendation) });
      } catch {
        return res.json({ success: true, data: leave.aiRecommendation });
      }
    }

    // Calculate attendance rate
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAttendance = leave.user.attendances.filter(
      (a: any) => a.date >= thirtyDaysAgo && !['WEEKEND', 'HOLIDAY'].includes(a.status)
    );
    const attendanceRate =
      recentAttendance.length > 0
        ? (recentAttendance.filter((a: any) => ['PRESENT', 'LATE'].includes(a.status)).length /
            recentAttendance.length) * 100
        : 85;

    // Balance
    const balance = await prisma.leaveBalance.findUnique({
      where: { userId_year: { userId: leave.userId, year: new Date().getFullYear() } },
    });
    const typeKey = leave.type.toLowerCase() as keyof typeof balance;
    const usedKey = `used${leave.type.charAt(0) + leave.type.slice(1).toLowerCase()}` as keyof typeof balance;
    const remainingBalance = balance
      ? (balance[typeKey] as number || 0) - (balance[usedKey] as number || 0)
      : 10;

    // Recent leave count
    const recentLeaveCount = await prisma.leave.count({
      where: {
        userId: leave.userId,
        status: 'APPROVED',
        startDate: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
      },
    });

    const recommendation = await generateLeaveRecommendation({
      employeeName: leave.user.name,
      leaveType: leave.type,
      days: leave.days,
      reason: leave.reason,
      startDate: leave.startDate.toISOString().split('T')[0],
      endDate: leave.endDate.toISOString().split('T')[0],
      attendanceRate,
      remainingBalance,
      recentLeaveCount,
      pendingTasksCount: 0,
    });

    // Save recommendation
    await prisma.leave.update({
      where: { id: leave.id },
      data: { aiRecommendation: JSON.stringify(recommendation) },
    });

    res.json({ success: true, data: recommendation });
  } catch (err) {
    next(err);
  }
});

// ── Approve / Reject Leave ────────────────────────────────────
router.patch('/:id/status', authorize('HR', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      throw createError('Status must be APPROVED or REJECTED', 400);
    }

    const leave = await prisma.leave.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!leave) throw createError('Leave not found', 404);
    if (leave.status !== 'PENDING') throw createError('Leave already processed', 400);

    const updated = await prisma.leave.update({
      where: { id: req.params.id },
      data: {
        status: status as 'APPROVED' | 'REJECTED',
        approvedById: req.user!.id,
        approvedAt: new Date(),
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
      },
    });

    // Update leave balance if approved
    if (status === 'APPROVED') {
      const typeKey = leave.type.toLowerCase();
      const usedKey = `used${typeKey.charAt(0).toUpperCase() + typeKey.slice(1)}`;
      await prisma.leaveBalance.updateMany({
        where: { userId: leave.userId, year: new Date().getFullYear() },
        data: { [usedKey]: { increment: leave.days } },
      });

      // Mark attendance as ON_LEAVE
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const day = d.getDay();
        if (day !== 0 && day !== 6) {
          await prisma.attendance.upsert({
            where: { userId_date: { userId: leave.userId, date: new Date(d) } },
            create: { userId: leave.userId, date: new Date(d), status: 'ON_LEAVE' },
            update: { status: 'ON_LEAVE' },
          });
        }
      }
    }

    // Notify employee
    const notif = await prisma.notification.create({
      data: {
        userId: leave.userId,
        title: `Leave ${status === 'APPROVED' ? 'Approved ✅' : 'Rejected ❌'}`,
        body: `Your ${leave.type} leave for ${leave.days} day(s) has been ${status.toLowerCase()}.`,
        type: status === 'APPROVED' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
        metadata: JSON.stringify({ leaveId: leave.id }),
      },
    });
    emitToUser(io, leave.userId, 'notification:new', notif);

    await sendLeaveStatusEmail(
      leave.user.email,
      leave.user.name,
      status as 'APPROVED' | 'REJECTED',
      leave.type,
      `${leave.startDate.toDateString()} - ${leave.endDate.toDateString()}`,
      rejectionReason
    ).catch(console.error);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// ── Cancel leave (employee) ───────────────────────────────────
router.patch('/:id/cancel', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const leave = await prisma.leave.findUnique({ where: { id: req.params.id } });
    if (!leave) throw createError('Leave not found', 404);
    if (leave.userId !== req.user!.id) throw createError('Forbidden', 403);
    if (leave.status !== 'PENDING') throw createError('Can only cancel pending leaves', 400);

    const updated = await prisma.leave.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
