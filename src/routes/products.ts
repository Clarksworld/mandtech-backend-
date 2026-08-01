import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { validate } from '../middleware/validate';

const router = Router();

// ── Public: GET /api/products ─────────────────────────────
// Query params: category, brand, driven, maxCapacity, sort (capacity-asc | capacity-desc)
router.get('/', async (req: Request, res: Response) => {
  const { category, brand, driven, maxCapacity, sort } = req.query;

  let where: string[] = ['is_active = TRUE'];
  const params: unknown[] = [];
  let idx = 1;

  if (category) {
    where.push(`category = $${idx++}`);
    params.push(category);
  }
  if (brand) {
    where.push(`brand = $${idx++}`);
    params.push(brand);
  }
  if (driven) {
    where.push(`driven_type = $${idx++}`);
    params.push(driven);
  }
  if (maxCapacity) {
    where.push(`capacity <= $${idx++}`);
    params.push(Number(maxCapacity));
  }

  const orderBy =
    sort === 'capacity-asc' ? 'capacity ASC' : 'capacity DESC';

  const sql = `
    SELECT id, title, category, brand, driven_type, capacity, badge, specs, image_url, created_at
    FROM products
    WHERE ${where.join(' AND ')}
    ORDER BY ${orderBy}
  `;

  const result = await pool.query(sql, params);
  res.json({ data: result.rows, total: result.rowCount });
});

// ── Public: GET /api/products/:id ─────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM products WHERE id = $1 AND is_active = TRUE',
    [req.params.id]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.json({ data: result.rows[0] });
});

// ── Schema for create/update ───────────────────────────────
const productSchema = z.object({
  title:       z.string().min(2),
  category:    z.enum(['Air Compressors', 'Generators', 'Pumps', 'Air Dryers']),
  brand:       z.string().min(1),
  driven_type: z.enum(['Electric', 'Diesel Driven']),
  capacity:    z.number().int().positive(),
  badge:       z.string().nullable().optional(),
  specs:       z.array(z.object({ label: z.string(), icon_name: z.string() })).default([]),
  image_url:   z.string().url().optional().or(z.literal('')),
  is_active:   z.boolean().default(true),
});

// ── Admin: POST /api/admin/products ───────────────────────
router.post('/admin', validate(productSchema), async (req: Request, res: Response) => {
  const d = req.body as z.infer<typeof productSchema>;
  const result = await pool.query(
    `INSERT INTO products (title, category, brand, driven_type, capacity, badge, specs, image_url, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [d.title, d.category, d.brand, d.driven_type, d.capacity, d.badge ?? null,
     JSON.stringify(d.specs), d.image_url ?? '', d.is_active]
  );
  res.status(201).json({ data: result.rows[0] });
});

// ── Admin: PUT /api/admin/products/:id ────────────────────
router.put('/admin/:id', validate(productSchema), async (req: Request, res: Response) => {
  const d = req.body as z.infer<typeof productSchema>;
  const result = await pool.query(
    `UPDATE products SET
       title=$1, category=$2, brand=$3, driven_type=$4, capacity=$5,
       badge=$6, specs=$7, image_url=$8, is_active=$9, updated_at=NOW()
     WHERE id=$10 RETURNING *`,
    [d.title, d.category, d.brand, d.driven_type, d.capacity, d.badge ?? null,
     JSON.stringify(d.specs), d.image_url ?? '', d.is_active, req.params.id]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.json({ data: result.rows[0] });
});

// ── Admin: DELETE /api/admin/products/:id (soft delete) ───
router.delete('/admin/:id', async (req: Request, res: Response) => {
  await pool.query(
    'UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
    [req.params.id]
  );
  res.json({ message: 'Product deactivated' });
});

// ── Admin: GET /api/admin/products (all incl. inactive) ───
router.get('/admin/all', async (_req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM products ORDER BY created_at DESC'
  );
  res.json({ data: result.rows, total: result.rowCount });
});

export default router;
