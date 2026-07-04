import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', async (_req, res, next) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    });
    res.json({ success: true, data: announcements });
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize('HR', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, content, isPinned } = req.body;
    const announcement = await prisma.announcement.create({
      data: { title, content, isPinned: isPinned || false },
    });
    res.status(201).json({ success: true, data: announcement });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
