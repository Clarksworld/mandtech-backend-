import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { validate } from '../middleware/validate';

export const sparePartsRequestsRouter = Router();
export const adminSparePartsRequestsRouter = Router();

// ── DB Bootstrap ────────────────────────────────────────────────────────────
// Run once on startup to ensure the table exists
pool.query(`
  CREATE TABLE IF NOT EXISTS spare_parts_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand       TEXT NOT NULL,
    part_name   TEXT NOT NULL,
    company_name TEXT NOT NULL,
    email       TEXT NOT NULL,
    phone       TEXT NOT NULL,
    notes       TEXT,
    status      TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','contacted','quoted','closed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch((err: Error) => console.error('[spare_parts_requests] table bootstrap error:', err.message));

// ── Zod Schemas ──────────────────────────────────────────────────────────────
const BRANDS = ['ATLAS COPCO', 'SULLAIR', 'INGERSOLL RAND', 'DENAIR'] as const;

const PART_NAMES = [
  'AIR FILTER', 'OIL FILTER', 'OIL SEPARATOR',
  'UNLOADER/INLET VALVE KIT', 'MINIMUM PRESSURE VALVE',
  'OIL STOP/CHECK VALVE', 'THERMOSTAT', 'AIREND',
  'FAN MOTOR', 'OIL/AIR COOLER', 'AIR DRYER',
  'SENSORS', 'CONTROLLER', 'LUBRICANT',
  'I. AIR FILTER', 'II. OIL FILTER', 'III. OIL SEPARATOR',
  'IV. UNLOADER/INLET VALVE KIT', 'V. MINIMUM PRESSURE VALVE',
  'VI. OIL STOP/CHECK VALVE', 'VII. THERMOSTAT', 'VIII. AIREND',
  'IX. FAN MOTOR', 'X. OIL/AIR COOLER', 'XI. AIR DRYER',
  'XII. SENSORS', 'XIII. CONTROLLER', 'XIV. LUBRICANT',
] as const;

const createRequestSchema = z.object({
  brand:        z.string().min(1, 'Brand is required'),
  part_name:    z.string().min(1, 'Part name is required'),
  company_name: z.string().min(1, 'Company name is required'),
  email:        z.string().email('Valid email address is required'),
  phone:        z.string().min(5, 'Valid phone number is required'),
  notes:        z.string().optional().default(''),
});

const updateStatusSchema = z.object({
  status: z.enum(['new', 'contacted', 'quoted', 'closed']),
  notes:  z.string().optional(),
});

// ── Public: POST /api/spare-parts-requests ──────────────────────────────────
sparePartsRequestsRouter.post('/', validate(createRequestSchema), async (req: Request, res: Response) => {
  const d = req.body as z.infer<typeof createRequestSchema>;
  const result = await pool.query(
    `INSERT INTO spare_parts_requests (brand, part_name, company_name, email, phone, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, brand, part_name, company_name, email, phone, status, notes, created_at`,
    [d.brand, d.part_name, d.company_name, d.email, d.phone, d.notes || null]
  );
  res.status(201).json({
    message: 'Spare parts request submitted successfully. A Mandtech parts specialist will contact you within 24 hours.',
    data: result.rows[0],
  });
});

// ── Admin: GET /api/admin/spare-parts-requests/stats ───────────────────────
adminSparePartsRequestsRouter.get('/stats', async (_req: Request, res: Response) => {
  const [counts, brandCounts] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'new')       AS new_count,
        COUNT(*) FILTER (WHERE status = 'contacted') AS contacted_count,
        COUNT(*) FILTER (WHERE status = 'quoted')    AS quoted_count,
        COUNT(*) FILTER (WHERE status = 'closed')    AS closed_count
      FROM spare_parts_requests
    `),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE brand = 'ATLAS COPCO')    AS atlas_copco,
        COUNT(*) FILTER (WHERE brand = 'SULLAIR')        AS sullair,
        COUNT(*) FILTER (WHERE brand = 'INGERSOLL RAND') AS ingersoll_rand,
        COUNT(*) FILTER (WHERE brand = 'DENAIR')         AS denair
      FROM spare_parts_requests
    `),
  ]);

  const c = counts.rows[0];
  const b = brandCounts.rows[0];
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
    },
  });
});

// ── Admin: GET /api/admin/spare-parts-requests ─────────────────────────────
adminSparePartsRequestsRouter.get('/', async (req: Request, res: Response) => {
  const { status, brand, search, page = '1', limit = '20' } = req.query;
  const p = Math.max(1, parseInt(page as string, 10));
  const l = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
  const offset = (p - 1) * l;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (brand)  { params.push(brand);  conditions.push(`brand = $${params.length}`); }
  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(`(company_name ILIKE $${idx} OR email ILIKE $${idx} OR part_name ILIKE $${idx})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRes, dataRes] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM spare_parts_requests ${where}`, params),
    pool.query(`SELECT * FROM spare_parts_requests ${where} ORDER BY created_at DESC LIMIT ${l} OFFSET ${offset}`, params),
  ]);

  const total = Number(countRes.rows[0].count);
  res.json({
    data: dataRes.rows,
    pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
  });
});

// ── Admin: GET /api/admin/spare-parts-requests/:id ─────────────────────────
adminSparePartsRequestsRouter.get('/:id', async (req: Request, res: Response) => {
  const result = await pool.query(`SELECT * FROM spare_parts_requests WHERE id = $1`, [req.params.id]);
  if (!result.rows[0]) { res.status(404).json({ error: 'Request not found' }); return; }
  res.json({ data: result.rows[0] });
});

// ── Admin: PATCH /api/admin/spare-parts-requests/:id/status ───────────────
adminSparePartsRequestsRouter.patch('/:id/status', validate(updateStatusSchema), async (req: Request, res: Response) => {
  const { status, notes } = req.body as z.infer<typeof updateStatusSchema>;
  const result = await pool.query(
    `UPDATE spare_parts_requests SET status=$1, notes=COALESCE($2, notes), updated_at=NOW() WHERE id=$3 RETURNING *`,
    [status, notes ?? null, req.params.id]
  );
  if (!result.rows[0]) { res.status(404).json({ error: 'Request not found' }); return; }
  res.json({ message: 'Status updated', data: result.rows[0] });
});

// ── Admin: DELETE /api/admin/spare-parts-requests/:id ─────────────────────
adminSparePartsRequestsRouter.delete('/:id', async (req: Request, res: Response) => {
  const result = await pool.query(`DELETE FROM spare_parts_requests WHERE id=$1 RETURNING id`, [req.params.id]);
  if (!result.rows[0]) { res.status(404).json({ error: 'Request not found' }); return; }
  res.json({ message: 'Request deleted', id: req.params.id });
});
