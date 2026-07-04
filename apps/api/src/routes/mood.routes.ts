import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';

const router = Router();
router.use(authenticate);

// ── Submit mood ───────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { mood, energyLevel, stressLevel, note } = req.body;

    if (!mood) throw createError('Mood required', 400);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate burnout score
    const moodScoreMap: Record<string, number> = { EXCELLENT: 0, GOOD: 10, NEUTRAL: 30, STRESSED: 65, BURNOUT: 90 };
    const moodScore = moodScoreMap[mood] || 30;
    const stressScore = ((stressLevel || 5) / 10) * 40;
    const energyPenalty = ((10 - (energyLevel || 5)) / 10) * 30;
    const burnoutScore = Math.min(100, moodScore * 0.3 + stressScore + energyPenalty);

    const entry = await prisma.moodEntry.upsert({
      where: { userId_date: { userId, date: today } },
      create: {
        userId, date: today,
        mood: mood as 'EXCELLENT' | 'GOOD' | 'NEUTRAL' | 'STRESSED' | 'BURNOUT',
        energyLevel: energyLevel || 5,
        stressLevel: stressLevel || 5,
        note,
        burnoutScore: parseFloat(burnoutScore.toFixed(1)),
      },
      update: {
        mood: mood as 'EXCELLENT' | 'GOOD' | 'NEUTRAL' | 'STRESSED' | 'BURNOUT',
        energyLevel: energyLevel || 5,
        stressLevel: stressLevel || 5,
        note,
        burnoutScore: parseFloat(burnoutScore.toFixed(1)),
      },
    });

    res.json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
});

// ── My mood history ───────────────────────────────────────────
router.get('/my', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { days = '30' } = req.query as { days?: string };

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const entries = await prisma.moodEntry.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEntry = await prisma.moodEntry.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    // Compute stats
    const avgBurnout = entries.length
      ? entries.reduce((s: number, e: any) => s + (e.burnoutScore || 0), 0) / entries.length
      : 0;

    const moodCounts = entries.reduce((acc: Record<string, number>, e: any) => {
      acc[e.mood] = (acc[e.mood] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: entries,
      todayEntry,
      stats: { avgBurnout: parseFloat(avgBurnout.toFixed(1)), moodCounts, totalEntries: entries.length },
    });
  } catch (err) {
    next(err);
  }
});

// ── HR: Team wellness overview ────────────────────────────────
router.get('/team', authorize('HR', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const entries = await prisma.moodEntry.findMany({
      where: { date: { gte: since } },
      include: { user: { select: { id: true, name: true, department: { select: { name: true } } } } },
    });

    const avgBurnout = entries.length
      ? entries.reduce((s: number, e: any) => s + (e.burnoutScore || 0), 0) / entries.length
      : 0;

    // Flag high burnout employees
    const userBurnout = new Map<string, { name: string; dept: string; avgBurnout: number; count: number }>();
    entries.forEach((e: any) => {
      const existing = userBurnout.get(e.userId);
      if (existing) {
        existing.avgBurnout = (existing.avgBurnout * existing.count + (e.burnoutScore || 0)) / (existing.count + 1);
        existing.count++;
      } else {
        userBurnout.set(e.userId, {
          name: e.user.name,
          dept: e.user.department?.name || 'N/A',
          avgBurnout: e.burnoutScore || 0,
          count: 1,
        });
      }
    });

    const atRisk = Array.from(userBurnout.values())
      .filter((u) => u.avgBurnout > 60)
      .sort((a, b) => b.avgBurnout - a.avgBurnout);

    res.json({
      success: true,
      data: {
        avgBurnout: parseFloat(avgBurnout.toFixed(1)),
        totalEntries: entries.length,
        atRisk,
        engagementScore: Math.max(0, 100 - avgBurnout),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
