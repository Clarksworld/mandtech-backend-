import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db';
import { validate } from '../middleware/validate';

const router = Router();

// ── GET /api/admin/dashboard/stats ───────────────────────
router.get('/stats', async (_req: Request, res: Response) => {
  const [products, parts, inquiries, tickets] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM products WHERE is_active = TRUE'),
    pool.query('SELECT COUNT(*) FROM parts WHERE is_active = TRUE'),
    pool.query(`SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'new') AS new_count,
      COUNT(*) FILTER (WHERE status = 'in_review') AS in_review_count,
      COUNT(*) FILTER (WHERE status = 'responded') AS responded_count
    FROM inquiries`),
    pool.query(`SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'received') AS received,
      COUNT(*) FILTER (WHERE status = 'in_dispatch') AS in_dispatch,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed
    FROM service_tickets`),
  ]);

  res.json({
    data: {
      active_products:  Number(products.rows[0].count),
      active_parts:     Number(parts.rows[0].count),
      inquiries:        {
        total:      Number(inquiries.rows[0].total),
        new:        Number(inquiries.rows[0].new_count),
        in_review:  Number(inquiries.rows[0].in_review_count),
        responded:  Number(inquiries.rows[0].responded_count),
      },
      service_tickets: {
        total:       Number(tickets.rows[0].total),
        received:    Number(tickets.rows[0].received),
        in_dispatch: Number(tickets.rows[0].in_dispatch),
        completed:   Number(tickets.rows[0].completed),
      },
    },
  });
});

// ── User schemas ─────────────────────────────────────────
const createUserSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
  role:     z.enum(['admin', 'staff']).default('staff'),
});

// ── GET /api/admin/users ─────────────────────────────────
router.get('/users', async (_req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT id, email, role, created_at FROM users ORDER BY created_at DESC'
  );
  res.json({ data: result.rows });
});

// ── POST /api/admin/users ────────────────────────────────
router.post('/users', validate(createUserSchema), async (req: Request, res: Response) => {
  const { email, password, role } = req.body as z.infer<typeof createUserSchema>;

  const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (exists.rows[0]) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, role) VALUES ($1,$2,$3)
     RETURNING id, email, role, created_at`,
    [email.toLowerCase(), hash, role]
  );
  res.status(201).json({ data: result.rows[0] });
});

// ── DELETE /api/admin/users/:id ──────────────────────────
router.delete('/users/:id', async (req: Request, res: Response) => {
  await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ message: 'User deleted' });
});

export default router;
