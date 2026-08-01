import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { validate } from '../middleware/validate';

const router = Router();

// ── Public: GET /api/parts ────────────────────────────────
// Query params: category, brand, condition, search, sort (sku-asc | brand-asc)
router.get('/', async (req: Request, res: Response) => {
  const { category, brand, condition, search, sort } = req.query;

  let where: string[] = ['is_active = TRUE'];
  const params: unknown[] = [];
  let idx = 1;

  if (category && category !== 'All Components') {
    where.push(`category = $${idx++}`);
    params.push(category);
  }
  if (brand) {
    where.push(`brand = $${idx++}`);
    params.push(brand);
  }
  if (condition) {
    where.push(`condition = $${idx++}`);
    params.push(condition);
  }
  if (search) {
    where.push(
      `(title ILIKE $${idx} OR sku ILIKE $${idx} OR brand ILIKE $${idx} OR category ILIKE $${idx})`
    );
    params.push(`%${search}%`);
    idx++;
  }

  let orderBy = 'created_at DESC';
  if (sort === 'sku-asc')   orderBy = 'sku ASC';
  if (sort === 'brand-asc') orderBy = 'brand ASC';

  const sql = `
    SELECT id, title, category, brand, sku, compatibility, condition, badge, image_url, created_at
    FROM parts
    WHERE ${where.join(' AND ')}
    ORDER BY ${orderBy}
  `;

  const result = await pool.query(sql, params);
  res.json({ data: result.rows, total: result.rowCount });
});

// ── Public: GET /api/parts/:id ────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM parts WHERE id = $1 AND is_active = TRUE',
    [req.params.id]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Part not found' });
    return;
  }
  res.json({ data: result.rows[0] });
});

// ── Schema ────────────────────────────────────────────────
const partSchema = z.object({
  title:         z.string().min(2),
  category:      z.enum(['Air Filtration', 'Control Systems', 'Electrical Spares', 'Mechanical Gaskets']),
  brand:         z.string().min(1),
  sku:           z.string().min(1),
  compatibility: z.string().min(1),
  condition:     z.enum(['New OEM', 'Refurbished']),
  badge:         z.string().min(1).default('IN STOCK'),
  image_url:     z.string().url().optional().or(z.literal('')),
  is_active:     z.boolean().default(true),
});

// ── Admin: POST /api/admin/parts ──────────────────────────
router.post('/admin', validate(partSchema), async (req: Request, res: Response) => {
  const d = req.body as z.infer<typeof partSchema>;
  try {
    const result = await pool.query(
      `INSERT INTO parts (title, category, brand, sku, compatibility, condition, badge, image_url, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [d.title, d.category, d.brand, d.sku, d.compatibility,
       d.condition, d.badge, d.image_url ?? '', d.is_active]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') { // unique_violation
      res.status(409).json({ error: 'SKU already exists' });
      return;
    }
    throw err;
  }
});

// ── Admin: PUT /api/admin/parts/:id ───────────────────────
router.put('/admin/:id', validate(partSchema), async (req: Request, res: Response) => {
  const d = req.body as z.infer<typeof partSchema>;
  const result = await pool.query(
    `UPDATE parts SET
       title=$1, category=$2, brand=$3, sku=$4, compatibility=$5,
       condition=$6, badge=$7, image_url=$8, is_active=$9, updated_at=NOW()
     WHERE id=$10 RETURNING *`,
    [d.title, d.category, d.brand, d.sku, d.compatibility,
     d.condition, d.badge, d.image_url ?? '', d.is_active, req.params.id]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Part not found' });
    return;
  }
  res.json({ data: result.rows[0] });
});

// ── Admin: DELETE /api/admin/parts/:id (soft delete) ──────
router.delete('/admin/:id', async (req: Request, res: Response) => {
  await pool.query(
    'UPDATE parts SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
    [req.params.id]
  );
  res.json({ message: 'Part deactivated' });
});

// ── Admin: GET /api/admin/parts/all ───────────────────────
router.get('/admin/all', async (_req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM parts ORDER BY created_at DESC');
  res.json({ data: result.rows, total: result.rowCount });
});

export default router;
