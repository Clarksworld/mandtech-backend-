import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { validate } from '../middleware/validate';

export const leasingRequestsRouter = Router();
export const adminLeasingRequestsRouter = Router();

// ── Zod Schemas ──────────────────────────────────────────────────────────────
const createLeasingRequestSchema = z.object({
  compressor_type: z.string().min(1, 'Compressor type is required'),
  brand:           z.string().min(1, 'Brand is required'),
  duration:        z.string().min(1, 'Duration is required'),
  hub:             z.string().min(1, 'Mobilization hub is required'),
  company_name:    z.string().min(1, 'Company name is required'),
  email:           z.string().email('Valid email address is required'),
  phone:           z.string().min(5, 'Valid phone number is required'),
  notes:           z.string().optional().default(''),
});

const updateStatusSchema = z.object({
  status: z.enum(['new', 'contacted', 'quoted', 'closed']),
  notes:  z.string().optional(),
});

// ── Public: POST /api/leasing-requests ──────────────────────────────────────
leasingRequestsRouter.post('/', validate(createLeasingRequestSchema), async (req: Request, res: Response) => {
  const d = req.body as z.infer<typeof createLeasingRequestSchema>;
  const result = await pool.query(
    `INSERT INTO leasing_requests (compressor_type, brand, duration, hub, company_name, email, phone, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, compressor_type, brand, duration, hub, company_name, email, phone, status, notes, created_at, updated_at`,
    [d.compressor_type, d.brand, d.duration, d.hub, d.company_name, d.email, d.phone, d.notes || null]
  );
  res.status(201).json({
    message: 'Leasing and rental inquiry submitted successfully. A Mandtech fleet specialist will contact you within 24 hours.',
    data: result.rows[0],
  });
});

// ── Admin: GET /api/admin/leasing-requests/stats ────────────────────────────
adminLeasingRequestsRouter.get('/stats', async (_req: Request, res: Response) => {
  const [counts, brandCounts, typeCounts] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'new')       AS new_count,
        COUNT(*) FILTER (WHERE status = 'contacted') AS contacted_count,
        COUNT(*) FILTER (WHERE status = 'quoted')    AS quoted_count,
        COUNT(*) FILTER (WHERE status = 'closed')    AS closed_count
      FROM leasing_requests
    `),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE brand ILIKE '%ATLAS COPCO%')    AS atlas_copco,
        COUNT(*) FILTER (WHERE brand ILIKE '%SULLAIR%')        AS sullair,
        COUNT(*) FILTER (WHERE brand ILIKE '%INGERSOLL RAND%') AS ingersoll_rand,
        COUNT(*) FILTER (WHERE brand ILIKE '%DENAIR%')         AS denair
      FROM leasing_requests
    `),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE compressor_type ILIKE '%ELECTRIC%') AS electric,
        COUNT(*) FILTER (WHERE compressor_type ILIKE '%DIESEL%')   AS diesel
      FROM leasing_requests
    `),
  ]);

  const c = counts.rows[0];
  const b = brandCounts.rows[0];
  const t = typeCounts.rows[0];
  res.json({
    data: {
      total:     Number(c.total),
      new:       Number(c.new_count),
      contacted: Number(c.contacted_count),
      quoted:    Number(c.quoted_count),
      closed:    Number(c.closed_count),
      brands: {
        atlas_copco:    Number(b.atlas_copco),
        sullair:        Number(b.sullair),
        ingersoll_rand: Number(b.ingersoll_rand),
        denair:         Number(b.denair),
      },
      types: {
        electric: Number(t.electric),
        diesel:   Number(t.diesel),
      },
    },
  });
});

// ── Admin: GET /api/admin/leasing-requests ──────────────────────────────────
adminLeasingRequestsRouter.get('/', async (req: Request, res: Response) => {
  const { status, brand, compressor_type, search, page = '1', limit = '20' } = req.query;
  const p = Math.max(1, parseInt(page as string, 10));
  const l = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
  const offset = (p - 1) * l;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (status && status !== 'all') {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (brand && brand !== 'all') {
    params.push(brand);
    conditions.push(`brand ILIKE $${params.length}`);
  }
  if (compressor_type && compressor_type !== 'all') {
    params.push(compressor_type);
    conditions.push(`compressor_type ILIKE $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(`(company_name ILIKE $${idx} OR email ILIKE $${idx} OR phone ILIKE $${idx} OR duration ILIKE $${idx} OR hub ILIKE $${idx})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRes, dataRes] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM leasing_requests ${where}`, params),
    pool.query(`SELECT * FROM leasing_requests ${where} ORDER BY created_at DESC LIMIT ${l} OFFSET ${offset}`, params),
  ]);

  const total = Number(countRes.rows[0].count);
  res.json({
    data: dataRes.rows,
    pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
  });
});

// ── Admin: GET /api/admin/leasing-requests/:id ──────────────────────────────
adminLeasingRequestsRouter.get('/:id', async (req: Request, res: Response) => {
  const result = await pool.query(`SELECT * FROM leasing_requests WHERE id = $1`, [req.params.id]);
  if (!result.rows[0]) { res.status(404).json({ error: 'Leasing request not found' }); return; }
  res.json({ data: result.rows[0] });
});

// ── Admin: PATCH /api/admin/leasing-requests/:id/status ────────────────────
adminLeasingRequestsRouter.patch('/:id/status', validate(updateStatusSchema), async (req: Request, res: Response) => {
  const { status, notes } = req.body as z.infer<typeof updateStatusSchema>;
  const result = await pool.query(
    `UPDATE leasing_requests SET status=$1, notes=COALESCE($2, notes), updated_at=NOW() WHERE id=$3 RETURNING *`,
    [status, notes ?? null, req.params.id]
  );
  if (!result.rows[0]) { res.status(404).json({ error: 'Leasing request not found' }); return; }
  res.json({ message: 'Status updated successfully', data: result.rows[0] });
});

// ── Admin: DELETE /api/admin/leasing-requests/:id ──────────────────────────
adminLeasingRequestsRouter.delete('/:id', async (req: Request, res: Response) => {
  const result = await pool.query(`DELETE FROM leasing_requests WHERE id=$1 RETURNING id`, [req.params.id]);
  if (!result.rows[0]) { res.status(404).json({ error: 'Leasing request not found' }); return; }
  res.json({ message: 'Leasing request deleted', id: req.params.id });
});

