import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { validate } from '../middleware/validate';

export const compressorRequestsRouter = Router();
export const adminCompressorRequestsRouter = Router();

const createRequestSchema = z.object({
  compressor_type: z.enum(['ELECTRIC AIR COMPRESSOR', 'DIESEL AIR COMPRESSOR'], {
    errorMap: () => ({ message: 'Compressor type must be ELECTRIC AIR COMPRESSOR or DIESEL AIR COMPRESSOR' }),
  }),
  brand: z.enum(['ATLAS COPCO', 'SULLAIR', 'INGERSOLL RAND', 'DENAIR'], {
    errorMap: () => ({ message: 'Brand must be ATLAS COPCO, SULLAIR, INGERSOLL RAND, or DENAIR' }),
  }),
  company_name: z.string().min(1, 'Company name is required'),
  email: z.string().email('Valid email address is required'),
  phone: z.string().min(5, 'Valid phone number is required'),
  notes: z.string().optional().default(''),
});

const updateStatusSchema = z.object({
  status: z.enum(['new', 'contacted', 'quoted', 'closed']),
  notes: z.string().optional(),
});

// ── Public: POST /api/compressor-requests ───────────────────────────
compressorRequestsRouter.post('/', validate(createRequestSchema), async (req: Request, res: Response) => {
  const d = req.body as z.infer<typeof createRequestSchema>;
  const result = await pool.query(
    `INSERT INTO compressor_requests (compressor_type, brand, company_name, email, phone, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, compressor_type, brand, company_name, email, phone, status, notes, created_at, updated_at`,
    [d.compressor_type, d.brand, d.company_name, d.email, d.phone, d.notes || null]
  );

  res.status(201).json({
    message: 'Formal quotation request submitted successfully. A Mandtech technical sales engineer will prepare your quote within 24 hours.',
    data: result.rows[0],
  });
});

// ── Admin: GET /api/admin/compressor-requests/stats ─────────────────
adminCompressorRequestsRouter.get('/stats', async (_req: Request, res: Response) => {
  const [counts, typeCounts, brandCounts] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'new') AS new_count,
        COUNT(*) FILTER (WHERE status = 'contacted') AS contacted_count,
        COUNT(*) FILTER (WHERE status = 'quoted') AS quoted_count,
        COUNT(*) FILTER (WHERE status = 'closed') AS closed_count
      FROM compressor_requests
    `),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE compressor_type = 'ELECTRIC AIR COMPRESSOR') AS electric_count,
        COUNT(*) FILTER (WHERE compressor_type = 'DIESEL AIR COMPRESSOR') AS diesel_count
      FROM compressor_requests
    `),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE brand = 'ATLAS COPCO') AS atlas_copco_count,
        COUNT(*) FILTER (WHERE brand = 'SULLAIR') AS sullair_count,
        COUNT(*) FILTER (WHERE brand = 'INGERSOLL RAND') AS ingersoll_rand_count,
        COUNT(*) FILTER (WHERE brand = 'DENAIR') AS denair_count
      FROM compressor_requests
    `),
  ]);

  res.json({
    data: {
      total: Number(counts.rows[0].total),
      new: Number(counts.rows[0].new_count),
      contacted: Number(counts.rows[0].contacted_count),
      quoted: Number(counts.rows[0].quoted_count),
      closed: Number(counts.rows[0].closed_count),
      types: {
        electric: Number(typeCounts.rows[0].electric_count),
        diesel: Number(typeCounts.rows[0].diesel_count),
      },
      brands: {
        atlas_copco: Number(brandCounts.rows[0].atlas_copco_count),
        sullair: Number(brandCounts.rows[0].sullair_count),
        ingersoll_rand: Number(brandCounts.rows[0].ingersoll_rand_count),
        denair: Number(brandCounts.rows[0].denair_count),
      },
    },
  });
});

// ── Admin: GET /api/admin/compressor-requests ─────────────────────────
adminCompressorRequestsRouter.get('/', async (req: Request, res: Response) => {
  const { status, compressor_type, brand, search, page = '1', limit = '20' } = req.query;
  const p = Math.max(1, parseInt(page as string, 10));
  const l = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
  const offset = (p - 1) * l;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  if (compressor_type) {
    params.push(compressor_type);
    conditions.push(`compressor_type = $${params.length}`);
  }

  if (brand) {
    params.push(brand);
    conditions.push(`brand = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(`(company_name ILIKE $${idx} OR email ILIKE $${idx} OR phone ILIKE $${idx})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRes, dataRes] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM compressor_requests ${whereClause}`, params),
    pool.query(
      `SELECT * FROM compressor_requests ${whereClause} ORDER BY created_at DESC LIMIT ${l} OFFSET ${offset}`,
      params
    ),
  ]);

  const total = Number(countRes.rows[0].count);

  res.json({
    data: dataRes.rows,
    pagination: {
      page: p,
      limit: l,
      total,
      totalPages: Math.ceil(total / l),
    },
  });
});

// ── Admin: GET /api/admin/compressor-requests/:id ──────────────────────
adminCompressorRequestsRouter.get('/:id', async (req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT * FROM compressor_requests WHERE id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Compressor request not found' });
    return;
  }
  res.json({ data: result.rows[0] });
});

// ── Admin: PATCH /api/admin/compressor-requests/:id/status ────────────
adminCompressorRequestsRouter.patch('/:id/status', validate(updateStatusSchema), async (req: Request, res: Response) => {
  const { status, notes } = req.body as z.infer<typeof updateStatusSchema>;
  const result = await pool.query(
    `UPDATE compressor_requests
     SET status = $1,
         notes = COALESCE($2, notes),
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [status, notes ?? null, req.params.id]
  );

  if (!result.rows[0]) {
    res.status(404).json({ error: 'Compressor request not found' });
    return;
  }

  res.json({
    message: 'Compressor request status updated successfully',
    data: result.rows[0],
  });
});

// ── Admin: DELETE /api/admin/compressor-requests/:id ───────────────────
adminCompressorRequestsRouter.delete('/:id', async (req: Request, res: Response) => {
  const result = await pool.query(
    `DELETE FROM compressor_requests WHERE id = $1 RETURNING id`,
    [req.params.id]
  );

  if (!result.rows[0]) {
    res.status(404).json({ error: 'Compressor request not found' });
    return;
  }

  res.json({ message: 'Compressor request deleted successfully', id: req.params.id });
});
