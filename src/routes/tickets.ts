import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { validate } from '../middleware/validate';

const router = Router();

/** Generate MT-xxxxxx ticket ID */
function generateTicketId(): string {
  return 'MT-' + Math.floor(100000 + Math.random() * 900000).toString();
}

const ticketSchema = z.object({
  asset_serial_id:    z.string().min(1),
  service_type:       z.enum([
    'Preventive Maintenance',
    'Emergency Breakdown Servicing',
    'Equipment Installation',
    'Calibration & Diagnostic Check',
  ]),
  description:        z.string().min(10),
  urgency:            z.enum(['Standard Route', 'High Priority', 'Emergency Site Breakdown']).default('Standard Route'),
  authorize_dispatch: z.boolean(),
});

// ── Public: POST /api/tickets ─────────────────────────────
router.post('/', validate(ticketSchema), async (req: Request, res: Response) => {
  const d = req.body as z.infer<typeof ticketSchema>;

  if (!d.authorize_dispatch) {
    res.status(400).json({ error: 'Dispatch authorization is required' });
    return;
  }

  // Generate unique ticket ID (retry on collision)
  let ticketId = generateTicketId();
  for (let i = 0; i < 3; i++) {
    const existing = await pool.query(
      'SELECT id FROM service_tickets WHERE id = $1', [ticketId]
    );
    if (!existing.rows[0]) break;
    ticketId = generateTicketId();
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO service_tickets (id, asset_serial_id, service_type, description, urgency, authorize_dispatch)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [ticketId, d.asset_serial_id, d.service_type, d.description, d.urgency, d.authorize_dispatch]
    );

    // Insert initial log entry
    await client.query(
      `INSERT INTO ticket_logs (ticket_id, time_label, log_text) VALUES ($1, $2, $3)`,
      [ticketId, new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }),
       'Service ticket received and cataloged via web portal.']
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  res.status(201).json({
    message: 'Service intake ticket submitted successfully.',
    ticket_id: ticketId,
  });
});

// ── Public: GET /api/tickets/:id ──────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  const ticketId = (req.params.id as string).toUpperCase().trim();

  const ticketResult = await pool.query(
    'SELECT * FROM service_tickets WHERE id = $1',
    [ticketId]
  );
  const ticket = ticketResult.rows[0];
  if (!ticket) {
    res.status(404).json({
      error: 'Ticket not found. Make sure to input your correct MT ticket number (e.g. MT-824021).',
    });
    return;
  }

  const logsResult = await pool.query(
    'SELECT time_label, log_text, created_at FROM ticket_logs WHERE ticket_id = $1 ORDER BY created_at ASC',
    [ticketId]
  );

  res.json({
    data: {
      ...ticket,
      logs: logsResult.rows.map((l) => ({ time: l.time_label, text: l.log_text })),
    },
  });
});

// ── Admin: GET /api/admin/tickets ─────────────────────────
router.get('/admin/all', async (req: Request, res: Response) => {
  const { status, page = '1', limit = '20' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let where = '';
  const params: unknown[] = [];
  if (status) {
    where = 'WHERE status = $1';
    params.push(status);
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM service_tickets ${where}`, params
  );
  const total = Number(countResult.rows[0].count);

  const dataResult = await pool.query(
    `SELECT * FROM service_tickets ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
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

// ── Admin: PUT /api/admin/tickets/:id ─────────────────────
router.put('/admin/:id', async (req: Request, res: Response) => {
  const { status, assigned_engineer, eta } = req.body as {
    status?: string;
    assigned_engineer?: string;
    eta?: string;
  };

  const allowedStatuses = ['received', 'assigned', 'in_dispatch', 'completed', 'cancelled'];
  if (status && !allowedStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  const result = await pool.query(
    `UPDATE service_tickets SET
       status = COALESCE($1, status),
       assigned_engineer = COALESCE($2, assigned_engineer),
       eta = COALESCE($3, eta),
       updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [status ?? null, assigned_engineer ?? null, eta ?? null, (req.params.id as string).toUpperCase()]
  );

  if (!result.rows[0]) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  res.json({ data: result.rows[0] });
});

// ── Admin: POST /api/admin/tickets/:id/logs ───────────────
router.post('/admin/:id/logs', async (req: Request, res: Response) => {
  const { time_label, log_text } = req.body as { time_label: string; log_text: string };
  if (!log_text?.trim()) {
    res.status(400).json({ error: 'log_text is required' });
    return;
  }

  const timeLabel = time_label || new Date().toLocaleTimeString('en-NG', {
    hour: '2-digit', minute: '2-digit'
  });

  const result = await pool.query(
    `INSERT INTO ticket_logs (ticket_id, time_label, log_text) VALUES ($1,$2,$3) RETURNING *`,
    [(req.params.id as string).toUpperCase(), timeLabel, log_text.trim()]
  );
  res.status(201).json({ data: result.rows[0] });
});

export default router;
