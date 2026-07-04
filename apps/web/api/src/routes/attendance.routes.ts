import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';

const router = Router();
router.use(authenticate);

// ── Check In ──────────────────────────────────────────────────
router.post('/checkin', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (existing?.checkIn) {
      throw createError('Already checked in today', 400);
    }

    const now = new Date();
    const workStart = new Date(now);
    workStart.setHours(9, 0, 0, 0);
    const lateMinutes = now > workStart ? Math.floor((now.getTime() - workStart.getTime()) / 60000) : 0;

    const attendance = await prisma.attendance.upsert({
      where: { userId_date: { userId, date: today } },
      create: {
        userId,
        date: today,
        checkIn: now,
        status: lateMinutes > 15 ? 'LATE' : 'PRESENT',
        lateMinutes,
      },
      update: {
        checkIn: now,
        status: lateMinutes > 15 ? 'LATE' : 'PRESENT',
        lateMinutes,
      },
    });

    res.json({ success: true, data: attendance });
  } catch (err) {
    next(err);
  }
});

// ── Check Out ─────────────────────────────────────────────────
router.post('/checkout', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (!attendance?.checkIn) throw createError('No check-in found for today', 400);
    if (attendance.checkOut) throw createError('Already checked out', 400);

    const now = new Date();
    const workHours = (now.getTime() - attendance.checkIn!.getTime()) / (1000 * 60 * 60);

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: now,
        workHours: parseFloat(workHours.toFixed(2)),
        status: workHours < 4 ? 'HALF_DAY' : attendance.status,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// ── Today's attendance ────────────────────────────────────────
router.get('/today', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    res.json({ success: true, data: attendance });
  } catch (err) {
    next(err);
  }
});

// ── My attendance history ─────────────────────────────────────
router.get('/my', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { month, year } = req.query as Record<string, string>;

    const targetMonth = parseInt(month || String(new Date().getMonth() + 1));
    const targetYear = parseInt(year || String(new Date().getFullYear()));

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    const records = await prisma.attendance.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    // Compute stats
    const present = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const halfDay = records.filter((r) => r.status === 'HALF_DAY').length;
    const onLeave = records.filter((r) => r.status === 'ON_LEAVE').length;
    const totalWorkHours = records.reduce((sum, r) => sum + (r.workHours || 0), 0);
    const workingDays = records.filter((r) => !['WEEKEND', 'HOLIDAY'].includes(r.status)).length;
    const attendanceRate = workingDays > 0 ? Math.round((present / workingDays) * 100) : 0;

    res.json({
      success: true,
      data: records,
      stats: { present, late, absent, halfDay, onLeave, totalWorkHours: parseFloat(totalWorkHours.toFixed(1)), attendanceRate },
    });
  } catch (err) {
    next(err);
  }
});

// ── HR: All employees attendance for a date ───────────────────
router.get('/overview', authorize('HR', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { date } = req.query as { date?: string };
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const [allUsers, todayAttendance] = await Promise.all([
      prisma.user.count({ where: { isActive: true, role: 'EMPLOYEE' } }),
      prisma.attendance.findMany({
        where: { date: targetDate },
        include: {
          user: { select: { id: true, name: true, employeeId: true, avatar: true, department: { select: { name: true, color: true } } } },
        },
      }),
    ]);

    const present = todayAttendance.filter((a) => ['PRESENT', 'LATE'].includes(a.status)).length;
    const late = todayAttendance.filter((a) => a.status === 'LATE').length;
    const onLeave = todayAttendance.filter((a) => a.status === 'ON_LEAVE').length;
    const absent = allUsers - present - onLeave;

    res.json({
      success: true,
      data: {
        totalEmployees: allUsers,
        present,
        late,
        onLeave,
        absent: Math.max(0, absent),
        records: todayAttendance,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── Get user attendance (HR can view any) ─────────────────────
router.get('/user/:userId', authorize('HR', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { month, year } = req.query as Record<string, string>;

    const targetMonth = parseInt(month || String(new Date().getMonth() + 1));
    const targetYear = parseInt(year || String(new Date().getFullYear()));

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    const records = await prisma.attendance.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
    });

    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
});

export default router;
