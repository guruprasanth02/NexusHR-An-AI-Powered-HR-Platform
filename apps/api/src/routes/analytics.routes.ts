import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate, authorize('HR', 'ADMIN'));

// ── Company overview ──────────────────────────────────────────
router.get('/company', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalEmployees,
      todayAttendance,
      pendingLeaves,
      thisMonthLeaves,
      recentMoods,
      departments,
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true, role: 'EMPLOYEE' } }),
      prisma.attendance.findMany({
        where: { date: today },
        select: { status: true },
      }),
      prisma.leave.count({ where: { status: 'PENDING' } }),
      prisma.leave.findMany({
        where: {
          status: 'APPROVED',
          startDate: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
        },
        select: { userId: true },
      }),
      prisma.moodEntry.findMany({
        where: {
          date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: { burnoutScore: true },
      }),
      prisma.department.findMany({
        include: { _count: { select: { users: true } } },
      }),
    ]);

    const present = todayAttendance.filter((a) => ['PRESENT', 'LATE'].includes(a.status)).length;
    const late = todayAttendance.filter((a) => a.status === 'LATE').length;
    const onLeave = todayAttendance.filter((a) => a.status === 'ON_LEAVE').length;
    const attendanceRate = totalEmployees > 0 ? Math.round((present / totalEmployees) * 100) : 0;

    const avgBurnout = recentMoods.length
      ? recentMoods.reduce((s, m) => s + (m.burnoutScore || 0), 0) / recentMoods.length
      : 20;
    const wellnessScore = Math.round(100 - avgBurnout);
    const companyHealthScore = Math.round((attendanceRate * 0.5) + (wellnessScore * 0.3) + (pendingLeaves < 5 ? 20 : 10));

    res.json({
      success: true,
      data: {
        totalEmployees,
        attendanceRate,
        present,
        late,
        onLeave,
        absent: Math.max(0, totalEmployees - present - onLeave),
        pendingLeaves,
        onLeaveToday: onLeave,
        wellnessScore,
        companyHealthScore: Math.min(100, companyHealthScore),
        departments: departments.map((d) => ({
          id: d.id,
          name: d.name,
          color: d.color,
          count: d._count.users,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── Attendance trend (last 12 months) ─────────────────────────
router.get('/attendance-trend', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push({ month: date.getMonth() + 1, year: date.getFullYear() });
    }

    const trend = await Promise.all(
      months.map(async ({ month, year }) => {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const records = await prisma.attendance.groupBy({
          by: ['status'],
          where: { date: { gte: startDate, lte: endDate } },
          _count: { status: true },
        });

        const present = records.find((r) => r.status === 'PRESENT')?._count.status || 0;
        const late = records.find((r) => r.status === 'LATE')?._count.status || 0;
        const absent = records.find((r) => r.status === 'ABSENT')?._count.status || 0;

        return {
          month: new Date(year, month - 1).toLocaleString('default', { month: 'short' }),
          year,
          present,
          late,
          absent,
        };
      })
    );

    res.json({ success: true, data: trend });
  } catch (err) {
    next(err);
  }
});

// ── Department analytics ──────────────────────────────────────
router.get('/departments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const departments = await prisma.department.findMany({
      include: {
        users: {
          where: { isActive: true, role: 'EMPLOYEE' },
          include: {
            attendances: {
              where: { date: { gte: monthStart } },
              select: { status: true },
            },
            leaves: {
              where: { status: 'PENDING' },
              select: { id: true },
            },
          },
        },
      },
    });

    const result = departments.map((dept) => {
      const totalUsers = dept.users.length;
      const totalAttendance = dept.users.flatMap((u) => u.attendances);
      const presentCount = totalAttendance.filter((a) => ['PRESENT', 'LATE'].includes(a.status)).length;
      const attendanceRate = totalAttendance.length > 0 ? Math.round((presentCount / totalAttendance.length) * 100) : 0;
      const pendingLeaves = dept.users.reduce((s, u) => s + u.leaves.length, 0);

      return {
        id: dept.id,
        name: dept.name,
        color: dept.color,
        employeeCount: totalUsers,
        attendanceRate,
        pendingLeaves,
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ── Employee analytics ────────────────────────────────────────
router.get('/employee/:userId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { months = '3' } = req.query as { months?: string };

    const since = new Date();
    since.setMonth(since.getMonth() - parseInt(months));

    const [attendance, leaves, moods] = await Promise.all([
      prisma.attendance.findMany({
        where: { userId, date: { gte: since } },
        select: { status: true, workHours: true, lateMinutes: true, date: true },
      }),
      prisma.leave.findMany({
        where: { userId, startDate: { gte: since } },
        select: { type: true, days: true, status: true },
      }),
      prisma.moodEntry.findMany({
        where: { userId, date: { gte: since } },
        select: { mood: true, burnoutScore: true, date: true },
      }),
    ]);

    const workDays = attendance.filter((a) => !['WEEKEND', 'HOLIDAY'].includes(a.status)).length;
    const presentDays = attendance.filter((a) => ['PRESENT', 'LATE'].includes(a.status)).length;
    const lateDays = attendance.filter((a) => a.status === 'LATE').length;
    const avgWorkHours = attendance.reduce((s, a) => s + (a.workHours || 0), 0) / (presentDays || 1);
    const attendanceScore = workDays > 0 ? Math.round((presentDays / workDays) * 100) : 0;
    const consistencyScore = Math.max(0, 100 - (lateDays / (presentDays || 1)) * 100);
    const avgBurnout = moods.reduce((s, m) => s + (m.burnoutScore || 0), 0) / (moods.length || 1);

    res.json({
      success: true,
      data: {
        attendanceScore,
        consistencyScore: Math.round(consistencyScore),
        avgWorkHours: parseFloat(avgWorkHours.toFixed(1)),
        totalPresent: presentDays,
        totalLate: lateDays,
        totalLeaves: leaves.filter((l) => l.status === 'APPROVED').reduce((s, l) => s + l.days, 0),
        avgBurnout: parseFloat(avgBurnout.toFixed(1)),
        moodTrend: moods,
        leaveSummary: leaves,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
