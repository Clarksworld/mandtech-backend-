import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { validate } from '../middleware/validate';

const router = Router();

// ── Public: GET /api/documents ────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT id, title, file_url, file_size, read_duration, icon_emoji FROM documents WHERE is_active = TRUE ORDER BY created_at ASC'
  );
  res.json({ data: result.rows, total: result.rowCount });
});

// ── Schema ────────────────────────────────────────────────
const documentSchema = z.object({
  title:         z.string().min(2),
  file_url:      z.string().url().optional().or(z.literal('')),
  file_size:     z.string().optional().default(''),
  read_duration: z.string().optional().default(''),
  icon_emoji:    z.string().default('📄'),
  is_active:     z.boolean().default(true),
});

// ── Admin: POST /api/admin/documents ──────────────────────
router.post('/admin', validate(documentSchema), async (req: Request, res: Response) => {
  const d = req.body as z.infer<typeof documentSchema>;
  const result = await pool.query(
    `INSERT INTO documents (title, file_url, file_size, read_duration, icon_emoji, is_active)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [d.title, d.file_url ?? '', d.file_size, d.read_duration, d.icon_emoji, d.is_active]
  );
  res.status(201).json({ data: result.rows[0] });
});

// ── Admin: PUT /api/admin/documents/:id ───────────────────
router.put('/admin/:id', validate(documentSchema), async (req: Request, res: Response) => {
  const d = req.body as z.infer<typeof documentSchema>;
  const result = await pool.query(
    `UPDATE documents SET title=$1, file_url=$2, file_size=$3, read_duration=$4, icon_emoji=$5, is_active=$6
     WHERE id=$7 RETURNING *`,
    [d.title, d.file_url ?? '', d.file_size, d.read_duration, d.icon_emoji, d.is_active, req.params.id]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  res.json({ data: result.rows[0] });
});

// ── Admin: DELETE /api/admin/documents/:id ────────────────
router.delete('/admin/:id', async (req: Request, res: Response) => {
  await pool.query('UPDATE documents SET is_active = FALSE WHERE id = $1', [req.params.id]);
  res.json({ message: 'Document deactivated' });
});

export default router;
