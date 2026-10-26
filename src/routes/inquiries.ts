import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { validate } from '../middleware/validate';

export const inquiriesRouter = Router();
export const adminInquiriesRouter = Router();

const inquirySchema = z.object({
  name:                z.string().min(2),
  company:             z.string().min(1),
  email:               z.string().email(),
  phone:               z.string().optional().default(''),
  message:             z.string().min(5),
  equipment_interests: z.array(z.string()).default([]),
  newsletter_opt_in:   z.boolean().default(false),
});

// ── Public: POST /api/inquiries ───────────────────────────
inquiriesRouter.post('/', validate(inquirySchema), async (req: Request, res: Response) => {
  const d = req.body as z.infer<typeof inquirySchema>;
  const result = await pool.query(
    `INSERT INTO inquiries (name, company, email, phone, message, equipment_interests, newsletter_opt_in)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, name, company, email, phone, message, equipment_interests, status, created_at`,
    [d.name, d.company, d.email, d.phone, d.message,
     JSON.stringify(d.equipment_interests), d.newsletter_opt_in]
  );
  res.status(201).json({
    message: 'Inquiry submitted successfully. A regional coordinator will respond within 2 hours.',
    data: result.rows[0],
  });
});

// ── Admin: GET /api/admin/inquiries/stats ─────────────────
adminInquiriesRouter.get(['/stats', '/admin/stats'], async (_req: Request, res: Response) => {
  const [counts, classCounts] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'new') AS new_count,
        COUNT(*) FILTER (WHERE status = 'in_review') AS in_review_count,
        COUNT(*) FILTER (WHERE status = 'responded') AS responded_count,
        COUNT(*) FILTER (WHERE status = 'closed') AS closed_count
      FROM inquiries
    `),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE equipment_interests::text ILIKE '%New Equipment Purchase%') AS new_purchase_count,
        COUNT(*) FILTER (WHERE equipment_interests::text ILIKE '%Equipment Rental%') AS rental_count,
        COUNT(*) FILTER (WHERE equipment_interests::text ILIKE '%Spare Parts%') AS spare_parts_count,
        COUNT(*) FILTER (WHERE equipment_interests::text ILIKE '%Service Request%') AS service_request_count
      FROM inquiries
    `)
  ]);

  res.json({
    data: {
      total: Number(counts.rows[0].total),
      new: Number(counts.rows[0].new_count),
      in_review: Number(counts.rows[0].in_review_count),
      responded: Number(counts.rows[0].responded_count),
      closed: Number(counts.rows[0].closed_count),
      by_class: {
        new_purchase: Number(classCounts.rows[0].new_purchase_count),
        rental: Number(classCounts.rows[0].rental_count),
        spare_parts: Number(classCounts.rows[0].spare_parts_count),
        service_request: Number(classCounts.rows[0].service_request_count),
      }
    }
  });
});

// ── Admin: GET /api/admin/inquiries ───────────────────────
// Query params: status, equipment_class, search/q, page (default 1), limit (default 20)
adminInquiriesRouter.get(['/', '/admin'], async (req: Request, res: Response) => {
  const { status, equipment_class, search, q, page = '1', limit = '20' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (status && status !== 'all') {
    conditions.push(`status = $${paramIdx++}`);
    params.push(status);
  }

  const searchTerm = (search || q) as string | undefined;
  if (searchTerm && searchTerm.trim() !== '') {
    conditions.push(`(
      name ILIKE $${paramIdx} OR
      company ILIKE $${paramIdx} OR
      email ILIKE $${paramIdx} OR
      phone ILIKE $${paramIdx} OR
      message ILIKE $${paramIdx} OR
      equipment_interests::text ILIKE $${paramIdx}
    )`);
    params.push(`%${searchTerm.trim()}%`);
    paramIdx++;
  }

  if (equipment_class && equipment_class !== 'all') {
    conditions.push(`equipment_interests::text ILIKE $${paramIdx++}`);
    params.push(`%${equipment_class}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM inquiries ${whereClause}`,
    params
  );
  const total = Number(countResult.rows[0].count);

  const dataResult = await pool.query(
    `SELECT * FROM inquiries ${whereClause} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, Number(limit), offset]
  );

  res.json({
    data: dataResult.rows,
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Number(limit)),
  });
});

// ── Admin: GET /api/admin/inquiries/:id ───────────────────
adminInquiriesRouter.get(['/:id', '/admin/:id'], async (req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM inquiries WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Inquiry not found' });
    return;
  }
  res.json({ data: result.rows[0] });
});

// ── Admin: PUT /api/admin/inquiries/:id/status ────────────
adminInquiriesRouter.put(['/:id/status', '/admin/:id/status'], async (req: Request, res: Response) => {
  const { status } = req.body as { status: string };
  const allowed = ['new', 'in_review', 'responded', 'closed'];
  if (!allowed.includes(status)) {
    res.status(400).json({ error: 'Invalid status value. Must be new, in_review, responded, or closed' });
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

// ── Admin: PUT /api/admin/inquiries/:id/assign ────────────
adminInquiriesRouter.put(['/:id/assign', '/admin/:id/assign'], async (req: Request, res: Response) => {
  const { user_id, assigned_name } = req.body as { user_id: string | null; assigned_name?: string | null };

  let finalName = assigned_name || null;
  if (user_id) {
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [user_id]);
    if (userResult.rows[0]) {
      finalName = userResult.rows[0].email;
    }
  }

  const result = await pool.query(
    `UPDATE inquiries
     SET assigned_to = $1, assigned_name = $2,
         status = CASE WHEN $1 IS NOT NULL AND status = 'new' THEN 'in_review' ELSE status END,
         updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [user_id ?? null, finalName, req.params.id]
  );

  if (!result.rows[0]) {
    res.status(404).json({ error: 'Inquiry not found' });
    return;
  }

  res.json({
    message: user_id ? `Inquiry assigned to ${finalName || user_id}` : 'Inquiry unassigned',
    data: result.rows[0],
  });
});

// ── Admin: DELETE /api/admin/inquiries/:id ───────────────
adminInquiriesRouter.delete(['/:id', '/admin/:id'], async (req: Request, res: Response) => {
  const result = await pool.query("DELETE FROM inquiries WHERE id = $1 RETURNING id", [req.params.id]);
  if (!result.rows[0]) {
    res.status(404).json({ error: "Inquiry not found" });
    return;
  }
  res.json({ message: "Inquiry deleted" });
});

export default inquiriesRouter;
