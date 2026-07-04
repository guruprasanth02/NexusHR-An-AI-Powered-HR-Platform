import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { chatWithHRAssistant } from '../services/ai.service';

const router = Router();
router.use(authenticate);

// ── HR Assistant Chat ─────────────────────────────────────────
router.post('/chat', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { message, history = [] } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: 'Message required' });
    }

    // Gather user context
    const [user, todayAttendance, leaveBalance] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { department: { select: { name: true } } },
      }),
      prisma.attendance.findFirst({
        where: {
          userId,
          date: (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })(),
        },
      }),
      prisma.leaveBalance.findUnique({
        where: { userId_year: { userId, year: new Date().getFullYear() } },
      }),
    ]);

    const context = {
      name: user?.name || 'Employee',
      role: user?.role || 'EMPLOYEE',
      department: user?.department?.name || 'N/A',
      casualLeave: leaveBalance ? leaveBalance.casual - leaveBalance.usedCasual : 0,
      sickLeave: leaveBalance ? leaveBalance.sick - leaveBalance.usedSick : 0,
      annualLeave: leaveBalance ? leaveBalance.annual - leaveBalance.usedAnnual : 0,
      todayAttendance: todayAttendance
        ? `Checked in at ${todayAttendance.checkIn?.toLocaleTimeString()}, status: ${todayAttendance.status}`
        : 'Not checked in yet',
    };

    const reply = await chatWithHRAssistant(message, context, history);

    res.json({ success: true, data: { reply, context } });
  } catch (err) {
    next(err);
  }
});

export default router;
