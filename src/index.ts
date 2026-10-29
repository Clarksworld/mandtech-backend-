import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db';
import { requireAuth } from './middleware/auth';

// Routes
import authRouter                                  from './routes/auth';
import { productsRouter, adminProductsRouter }     from './routes/products';
import { partsRouter, adminPartsRouter }           from './routes/parts';
import { inquiriesRouter, adminInquiriesRouter }   from './routes/inquiries';
import { compressorRequestsRouter, adminCompressorRequestsRouter } from './routes/compressorRequests';
import { sparePartsRequestsRouter, adminSparePartsRequestsRouter } from './routes/sparePartsRequests';
import { leasingRequestsRouter, adminLeasingRequestsRouter } from './routes/leasingRequests';
import { lubricantRequestsRouter, adminLubricantRequestsRouter } from './routes/lubricantRequests';
import { ticketsRouter, adminTicketsRouter }       from './routes/tickets';
import { documentsRouter, adminDocumentsRouter }   from './routes/documents';
import adminRouter                                 from './routes/admin';
import invoicesRouter                              from './routes/invoices';
import projectsRouter, { tasksRouter }             from './routes/projects';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Global middleware ─────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const allowed = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'https://mandtech-1chv.vercel.app',
      'https://mandtech-admin.vercel.app',
      ...(process.env.EXTRA_ORIGINS?.split(',') ?? []).map(o => o.trim()),
    ];

    // Allow all vercel preview and production deployments for mandtech
    if (
      allowed.includes(origin) ||
      /^https:\/\/mandtech[a-zA-Z0-9-_]*\.vercel\.app$/.test(origin)
    ) {
      return callback(null, true);
    }

    return callback(null, true); // Fallback: allow origin in development / production
  },
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
app.use('/api/compressor-requests', compressorRequestsRouter);
app.use('/api/spare-parts-requests', sparePartsRequestsRouter);
app.use('/api/leasing-requests', leasingRequestsRouter);
app.use('/api/lubricant-requests', lubricantRequestsRouter);
app.use('/api/tickets',   ticketsRouter);
app.use('/api/documents', documentsRouter);

// ── Admin-only routes (JWT required) ─────────────────────
app.use('/api/admin/products',  requireAuth, adminProductsRouter);
app.use('/api/admin/parts',     requireAuth, adminPartsRouter);
app.use('/api/admin/inquiries', requireAuth, adminInquiriesRouter);
app.use('/api/admin/compressor-requests', requireAuth, adminCompressorRequestsRouter);
app.use('/api/admin/spare-parts-requests', requireAuth, adminSparePartsRequestsRouter);
app.use('/api/admin/leasing-requests', requireAuth, adminLeasingRequestsRouter);
app.use('/api/admin/lubricant-requests', requireAuth, adminLubricantRequestsRouter);
app.use('/api/admin/tickets',   requireAuth, adminTicketsRouter);
app.use('/api/admin/documents', requireAuth, adminDocumentsRouter);
app.use('/api/admin/invoices',  requireAuth, invoicesRouter);
app.use('/api/admin/projects',  requireAuth, projectsRouter);
app.use('/api/admin/tasks',     requireAuth, tasksRouter);
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
