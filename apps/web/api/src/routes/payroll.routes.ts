import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';
import { io } from '../index';
import { emitToUser } from '../services/socket.service';

const router = Router();
router.use(authenticate);

// ── My payslips ───────────────────────────────────────────────
router.get('/my', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { year } = req.query as { year?: string };

    const payrolls = await prisma.payroll.findMany({
      where: {
        userId,
        ...(year && { year: parseInt(year) }),
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    res.json({ success: true, data: payrolls });
  } catch (err) {
    next(err);
  }
});

// ── Get single payslip ────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payroll = await prisma.payroll.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { name: true, email: true, employeeId: true, position: true, department: true } } },
    });

    if (!payroll) throw createError('Payroll not found', 404);
    if (payroll.userId !== req.user!.id && !['HR', 'ADMIN'].includes(req.user!.role)) {
      throw createError('Forbidden', 403);
    }

    res.json({ success: true, data: payroll });
  } catch (err) {
    next(err);
  }
});

// ── HR: All payrolls ──────────────────────────────────────────
router.get('/all/list', authorize('HR', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { month, year, page = '1', limit = '20' } = req.query as Record<string, string>;

    const [payrolls, total] = await Promise.all([
      prisma.payroll.findMany({
        where: {
          ...(month && { month: parseInt(month) }),
          ...(year && { year: parseInt(year) }),
        },
        include: {
          user: {
            select: {
              id: true, name: true, employeeId: true, position: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.payroll.count({
        where: {
          ...(month && { month: parseInt(month) }),
          ...(year && { year: parseInt(year) }),
        },
      }),
    ]);

    res.json({ success: true, data: payrolls, meta: { total } });
  } catch (err) {
    next(err);
  }
});

// ── Admin: Generate payroll for a month ───────────────────────
router.post('/generate', authorize('ADMIN', 'HR'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) throw createError('Month and year required', 400);

    const employees = await prisma.user.findMany({
      where: { isActive: true, role: 'EMPLOYEE' },
      select: { id: true, salary: true, name: true, email: true },
    });

    const results = await Promise.all(
      employees.map(async (emp) => {
        const existing = await prisma.payroll.findUnique({
          where: { userId_month_year: { userId: emp.id, month, year } },
        });
        if (existing) return existing;

        // Calculate attendance for the month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const attendance = await prisma.attendance.findMany({
          where: { userId: emp.id, date: { gte: startDate, lte: endDate } },
        });

        const workingDays = 22; // standard
        const presentDays = attendance.filter((a) => ['PRESENT', 'LATE', 'ON_LEAVE'].includes(a.status)).length;
        const basic = emp.salary * 0.5;
        const hra = emp.salary * 0.25;
        const allowances = emp.salary * 0.1;
        const pf = basic * 0.12;
        const tax = emp.salary > 50000 ? emp.salary * 0.1 : 0;
        const deductions = pf + tax;
        const netSalary = basic + hra + allowances - deductions;

        const payroll = await prisma.payroll.create({
          data: {
            userId: emp.id, month, year,
            basic, hra, allowances, deductions, pf, tax,
            netSalary: parseFloat(netSalary.toFixed(2)),
            workingDays, presentDays,
            status: 'PAID',
            creditedAt: new Date(year, month - 1, 28),
          },
        });

        // Notify employee
        const notif = await prisma.notification.create({
          data: {
            userId: emp.id,
            title: 'Salary Credited 💰',
            body: `Your salary of ₹${netSalary.toLocaleString('en-IN')} has been credited for ${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}.`,
            type: 'PAYROLL_CREDITED',
          },
        });
        emitToUser(io, emp.id, 'notification:new', notif);

        return payroll;
      })
    );

    res.json({
      success: true,
      message: `Payroll generated for ${results.length} employees`,
      data: results,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
