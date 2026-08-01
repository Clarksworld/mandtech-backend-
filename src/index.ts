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
import invoicesRouter  from './routes/invoices';
import projectsRouter  from './routes/projects';

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
import { swaggerDocument } from './swagger';

// ── Health check ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Swagger UI & OpenAPI Specification ───────────────────
app.get('/swagger.json', (_req, res) => {
  res.json(swaggerDocument);
});

const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Mandtech Services API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5/favicon-32x32.png" />
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
    .swagger-ui .topbar { background-color: #111827; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" charset="UTF-8"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        spec: ${JSON.stringify(swaggerDocument)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>
`;

app.get('/docs', (_req, res) => res.send(swaggerHtml));
app.get('/api-docs', (_req, res) => res.send(swaggerHtml));

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
app.use('/api/admin/invoices',  requireAuth, invoicesRouter);
app.use('/api/admin/projects',  requireAuth, projectsRouter);
app.use('/api/admin',           requireAuth, adminRouter);

// ── Global error handler ──────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ── Start / Export ─────────────────────────────────────────
initDb().catch((err) => console.error('Failed to init DB:', err));

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Mandtech API running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
  });
}

export default app;
