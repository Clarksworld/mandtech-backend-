import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db';
import { requireAuth } from './middleware/auth';

// Routes
import authRouter      from './routes/auth';
import productsRouter  from './routes/products';
import partsRouter     from './routes/parts';
import inquiriesRouter from './routes/inquiries';
import ticketsRouter   from './routes/tickets';
import documentsRouter from './routes/documents';
import adminRouter     from './routes/admin';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Global middleware ─────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',            // local frontend dev
    'http://localhost:5174',            // local admin dev
    'https://mandtech-1chv.vercel.app', // customer site
    'https://mandtech-admin.vercel.app',// admin site
    ...(process.env.EXTRA_ORIGINS?.split(',') ?? []),
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Public routes ─────────────────────────────────────────
app.use('/api/auth',      authRouter);
app.use('/api/products',  productsRouter);
app.use('/api/parts',     partsRouter);
app.use('/api/inquiries', inquiriesRouter);
app.use('/api/tickets',   ticketsRouter);
app.use('/api/documents', documentsRouter);

// ── Admin-only routes (JWT required) ─────────────────────
app.use('/api/admin/products',  requireAuth, productsRouter);
app.use('/api/admin/parts',     requireAuth, partsRouter);
app.use('/api/admin/inquiries', requireAuth, inquiriesRouter);
app.use('/api/admin/tickets',   requireAuth, ticketsRouter);
app.use('/api/admin/documents', requireAuth, documentsRouter);
app.use('/api/admin',           requireAuth, adminRouter);

// ── Global error handler ──────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ── Start ─────────────────────────────────────────────────
async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`🚀 Mandtech API running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
