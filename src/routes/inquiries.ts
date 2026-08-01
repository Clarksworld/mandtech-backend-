import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { validate } from '../middleware/validate';

const router = Router();

const inquirySchema = z.object({
  name:                z.string().min(2),
  company:             z.string().min(1),
  email:               z.string().email(),
  phone:               z.string().optional().default(''),
  message:             z.string().min(10),
  equipment_interests: z.array(z.string()).default([]),
  newsletter_opt_in:   z.boolean().default(false),
});

// ── Public: POST /api/inquiries ───────────────────────────
router.post('/', validate(inquirySchema), async (req: Request, res: Response) => {
  const d = req.body as z.infer<typeof inquirySchema>;
  const result = await pool.query(
    `INSERT INTO inquiries (name, company, email, phone, message, equipment_interests, newsletter_opt_in)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, name, company, email, created_at`,
    [d.name, d.company, d.email, d.phone, d.message,
     JSON.stringify(d.equipment_interests), d.newsletter_opt_in]
  );
  res.status(201).json({
    message: 'Inquiry submitted successfully. A regional coordinator will respond within 2 hours.',
    data: result.rows[0],
  });
});

// ── Admin: GET /api/admin/inquiries ───────────────────────
// Query params: status, page (default 1), limit (default 20)
router.get('/admin', async (req: Request, res: Response) => {
  const { status, page = '1', limit = '20' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let where = '';
  const params: unknown[] = [];
  if (status) {
    where = 'WHERE status = $1';
    params.push(status);
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM inquiries ${where}`,
    params
  );
  const total = Number(countResult.rows[0].count);

  const dataResult = await pool.query(
    `SELECT * FROM inquiries ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, Number(limit), offset]
  );

  res.json({
    data:  dataResult.rows,
    total,
    page:  Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Number(limit)),
  });
});

// ── Admin: GET /api/admin/inquiries/:id ───────────────────
router.get('/admin/:id', async (req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM inquiries WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Inquiry not found' });
    return;
  }
  res.json({ data: result.rows[0] });
});

// ── Admin: PUT /api/admin/inquiries/:id/status ────────────
router.put('/admin/:id/status', async (req: Request, res: Response) => {
  const { status } = req.body as { status: string };
  const allowed = ['new', 'in_review', 'responded', 'closed'];
  if (!allowed.includes(status)) {
    res.status(400).json({ error: 'Invalid status value' });
    return;
  }
  const result = await pool.query(
    'UPDATE inquiries SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
    [status, req.params.id]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Inquiry not found' });
    return;
  }
  res.json({ data: result.rows[0] });
});

export default router;
