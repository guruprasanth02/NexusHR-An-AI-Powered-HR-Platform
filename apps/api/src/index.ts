import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';

import authRouter from './routes/auth.routes';
import userRouter from './routes/users.routes';
import attendanceRouter from './routes/attendance.routes';
import leaveRouter from './routes/leaves.routes';
import payrollRouter from './routes/payroll.routes';
import moodRouter from './routes/mood.routes';
import notificationRouter from './routes/notifications.routes';
import analyticsRouter from './routes/analytics.routes';
import recruitmentRouter from './routes/recruitment.routes';
import aiRouter from './routes/ai.routes';
import announcementRouter from './routes/announcements.routes';

import { errorHandler } from './middleware/error.middleware';
import { initSocket } from './services/socket.service';

export const prisma = new PrismaClient();

const app = express();
const httpServer = createServer(app);

// ── Socket.io ────────────────────────────────────────────────
export const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
});
initSocket(io);

// ── Middleware ───────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── Routes ───────────────────────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`, authRouter);
app.use(`${API}/users`, userRouter);
app.use(`${API}/attendance`, attendanceRouter);
app.use(`${API}/leaves`, leaveRouter);
app.use(`${API}/payroll`, payrollRouter);
app.use(`${API}/mood`, moodRouter);
app.use(`${API}/notifications`, notificationRouter);
app.use(`${API}/analytics`, analyticsRouter);
app.use(`${API}/recruitment`, recruitmentRouter);
app.use(`${API}/ai`, aiRouter);
app.use(`${API}/announcements`, announcementRouter);

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error handler ────────────────────────────────────────────
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '5000');
httpServer.listen(PORT, () => {
  console.log(`\n🚀 NexusHR API running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
