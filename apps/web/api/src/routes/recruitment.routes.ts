import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';
import { screenResume } from '../services/ai.service';

const router = Router();
router.use(authenticate);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── Helpers for SQLite JSON field parsing ────────────────────
function parseCandidate(candidate: any) {
  if (!candidate) return candidate;
  for (const field of ['aiSkills', 'aiStrengths', 'aiWeaknesses']) {
    if (candidate[field] && typeof candidate[field] === 'string') {
      try {
        candidate[field] = JSON.parse(candidate[field]);
      } catch {
        candidate[field] = [];
      }
    }
  }
  return candidate;
}

function parseJob(job: any) {
  if (!job) return job;
  if (job.skills && typeof job.skills === 'string') {
    try {
      job.skills = JSON.parse(job.skills);
    } catch {
      job.skills = [];
    }
  }
  if (job.candidates) {
    job.candidates = job.candidates.map(parseCandidate);
  }
  return job;
}

// ── List jobs ─────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, page = '1', limit = '10' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [jobs, total] = await Promise.all([
      prisma.recruitment.findMany({
        where: { ...(status && { status: status as 'OPEN' | 'CLOSED' | 'ON_HOLD' }) },
        include: {
          department: { select: { name: true, color: true } },
          _count: { select: { candidates: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.recruitment.count({ where: { ...(status && { status: status as 'OPEN' | 'CLOSED' | 'ON_HOLD' }) } }),
    ]);

    res.json({ success: true, data: jobs.map(parseJob), meta: { total } });
  } catch (err) {
    next(err);
  }
});

// ── Create job ────────────────────────────────────────────────
router.post('/', authorize('HR', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description, requirements, skills, location, type, salary, departmentId } = req.body;

    if (!title || !description || !requirements) {
      throw createError('Title, description and requirements are required', 400);
    }

    const job = await prisma.recruitment.create({
      data: {
        title, description, requirements,
        skills: JSON.stringify(skills || []),
        location: location || 'Remote',
        type: type || 'Full-time',
        salary,
        departmentId,
        createdById: req.user!.id,
      },
    });

    res.status(201).json({ success: true, data: parseJob(job) });
  } catch (err) {
    next(err);
  }
});

// ── Get job with candidates ───────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const job = await prisma.recruitment.findUnique({
      where: { id: req.params.id },
      include: {
        department: true,
        candidates: {
          orderBy: [{ aiScore: 'desc' }, { appliedAt: 'desc' }],
        },
      },
    });

    if (!job) throw createError('Job not found', 404);
    res.json({ success: true, data: parseJob(job) });
  } catch (err) {
    next(err);
  }
});

// ── Update job status ─────────────────────────────────────────
router.patch('/:id', authorize('HR', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, title, description, requirements, skills } = req.body;
    const job = await prisma.recruitment.update({
      where: { id: req.params.id },
      data: {
        ...(status && { status: status as 'OPEN' | 'CLOSED' | 'ON_HOLD' }),
        ...(title && { title }),
        ...(description && { description }),
        ...(requirements && { requirements }),
        ...(skills && { skills: JSON.stringify(skills) }),
        ...(status === 'CLOSED' && { closedAt: new Date() }),
      },
    });
    res.json({ success: true, data: parseJob(job) });
  } catch (err) {
    next(err);
  }
});

// ── Add candidate (with optional resume upload) ───────────────
router.post('/:id/candidates', upload.single('resume'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const recruitmentId = req.params.id;
    const { name, email, phone, coverLetter } = req.body;

    if (!name || !email) throw createError('Name and email required', 400);

    const job = await prisma.recruitment.findUnique({ where: { id: recruitmentId } });
    if (!job) throw createError('Job not found', 404);

    let aiScore: number | undefined;
    let aiSummary: string | undefined;
    let aiSkills: string[] = [];
    let aiStrengths: string[] = [];
    let aiWeaknesses: string[] = [];

    // Screen resume with AI if file provided
    if (req.file) {
      try {
        let resumeText = '';
        // Try to parse PDF text (basic extraction)
        const pdfParse = await import('pdf-parse');
        const pdfData = await pdfParse.default(req.file.buffer);
        resumeText = pdfData.text;

        const screening = await screenResume(resumeText, job.description, job.requirements);
        aiScore = screening.score;
        aiSummary = screening.summary;
        aiSkills = screening.skills;
        aiStrengths = screening.strengths;
        aiWeaknesses = screening.weaknesses;
      } catch (parseErr) {
        console.error('[Resume Parse] Error:', parseErr);
        // Generate mock screening if parse fails
        const screening = await screenResume('', job.description, job.requirements);
        aiScore = screening.score;
        aiSummary = screening.summary;
        aiSkills = screening.skills;
        aiStrengths = screening.strengths;
        aiWeaknesses = screening.weaknesses;
      }
    }

    const candidate = await prisma.candidate.create({
      data: {
        recruitmentId, name, email, phone, coverLetter,
        aiScore, aiSummary,
        aiSkills: JSON.stringify(aiSkills),
        aiStrengths: JSON.stringify(aiStrengths),
        aiWeaknesses: JSON.stringify(aiWeaknesses),
      },
    });

    res.status(201).json({ success: true, data: parseCandidate(candidate) });
  } catch (err) {
    next(err);
  }
});

// ── Update candidate status ───────────────────────────────────
router.patch('/:jobId/candidates/:candidateId', authorize('HR', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const candidate = await prisma.candidate.update({
      where: { id: req.params.candidateId },
      data: { status: status as 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'HIRED' },
    });
    res.json({ success: true, data: parseCandidate(candidate) });
  } catch (err) {
    next(err);
  }
});

// ── Re-screen candidate with AI ───────────────────────────────
router.post('/:jobId/candidates/:candidateId/screen', authorize('HR', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [candidate, job] = await Promise.all([
      prisma.candidate.findUnique({ where: { id: req.params.candidateId } }),
      prisma.recruitment.findUnique({ where: { id: req.params.jobId } }),
    ]);

    if (!candidate || !job) throw createError('Not found', 404);

    const screening = await screenResume('', job.description, job.requirements);

    const updated = await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        aiScore: screening.score,
        aiSummary: screening.summary,
        aiSkills: JSON.stringify(screening.skills),
        aiStrengths: JSON.stringify(screening.strengths),
        aiWeaknesses: JSON.stringify(screening.weaknesses),
      },
    });

    res.json({ success: true, data: parseCandidate(updated) });
  } catch (err) {
    next(err);
  }
});

export default router;
