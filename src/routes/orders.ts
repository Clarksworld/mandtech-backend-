import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { validate } from '../middleware/validate';

export const ordersRouter = Router();
export const adminOrdersRouter = Router();

function generateOrderId(): string {
  return 'ORD-' + Math.floor(100000 + Math.random() * 900000).toString();
}

const createOrderSchema = z.object({
  user_id:          z.string().optional().nullable(),
  customer_name:    z.string().min(2, 'Name is required'),
  company:          z.string().min(1, 'Company is required'),
  email:            z.string().email('Valid email is required'),
  phone:            z.string().min(6, 'Phone is required'),
  delivery_address: z.string().min(5, 'Delivery address is required'),
  fulfillment_hub:  z.string().default('Port-Harcourt Yard (Elelenwo Ops)'),
  items:            z.array(z.any()).min(1, 'Cart cannot be empty'),
  subtotal:         z.number().optional().default(0),
  notes:            z.string().optional().default(''),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['order_placed', 'confirmed', 'processing', 'in_transit', 'delivered', 'cancelled']),
  note:   z.string().optional(),
});

// ── Public: POST /api/orders (Create Order / Checkout from Yard Cart) ──
ordersRouter.post('/', validate(createOrderSchema), async (req: Request, res: Response) => {
  const d = req.body as z.infer<typeof createOrderSchema>;

  let orderId = generateOrderId();
  for (let i = 0; i < 3; i++) {
    const existing = await pool.query('SELECT id FROM orders WHERE id = $1', [orderId]);
    if (!existing.rows[0]) break;
    orderId = generateOrderId();
  }

  const initialTracking = [
    {
      status: 'order_placed',
      label: 'Order Placed & Logged',
      time: new Date().toISOString(),
      location: d.fulfillment_hub,
      note: 'Yard reservation confirmed. Staging parts for inspection and logistics clearance.',
    },
  ];

  const result = await pool.query(
    `INSERT INTO orders (id, user_id, customer_name, company, email, phone, delivery_address, fulfillment_hub, items, subtotal, status, tracking_history, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'order_placed', $11, $12)
     RETURNING *`,
    [
      orderId,
      d.user_id || null,
      d.customer_name.trim(),
      d.company.trim(),
      d.email.toLowerCase().trim(),
      d.phone.trim(),
      d.delivery_address.trim(),
      d.fulfillment_hub,
      JSON.stringify(d.items),
      d.subtotal || 0,
      JSON.stringify(initialTracking),
      d.notes?.trim() || null,
    ]
  );

  res.status(201).json({
    message: 'Order placed successfully. Your yard tracking reference is generated.',
    order: result.rows[0],
  });
});

// ── Public: GET /api/orders/:id (Track Order by Reference ID) ──
ordersRouter.get('/:id', async (req: Request, res: Response) => {
  const orderId = (req.params.id as string).toUpperCase().trim();
  const result = await pool.query('SELECT * FROM orders WHERE UPPER(id) = $1', [orderId]);

  if (!result.rows[0]) {
    res.status(404).json({ error: `Order ${orderId} not found. Please verify your tracking number.` });
    return;
  }

  res.json({ order: result.rows[0] });
});

// ── Public/Customer: GET /api/orders/user/history ──
ordersRouter.get('/user/history', async (req: Request, res: Response) => {
  const email = (req.query.email as string)?.toLowerCase()?.trim();
  const userId = req.query.user_id as string | undefined;

  if (!email && !userId) {
    res.status(400).json({ error: 'Email or User ID is required to fetch order history' });
    return;
  }

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (email) {
    params.push(email);
    conditions.push(`email = $${params.length}`);
  }
  if (userId) {
    params.push(userId);
    conditions.push(`user_id = $${params.length}`);
  }

  const result = await pool.query(
    `SELECT * FROM orders WHERE ${conditions.join(' OR ')} ORDER BY created_at DESC LIMIT 50`,
    params
  );

  res.json({ orders: result.rows });
});

// ── Admin: GET /api/admin/orders/stats ──
adminOrdersRouter.get('/stats', async (_req: Request, res: Response) => {
  const statsRes = await pool.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'order_placed') AS placed_count,
      COUNT(*) FILTER (WHERE status = 'confirmed')    AS confirmed_count,
      COUNT(*) FILTER (WHERE status = 'processing')   AS processing_count,
      COUNT(*) FILTER (WHERE status = 'in_transit')   AS in_transit_count,
      COUNT(*) FILTER (WHERE status = 'delivered')    AS delivered_count,
      COUNT(*) FILTER (WHERE status = 'cancelled')    AS cancelled_count
    FROM orders
  `);

  const s = statsRes.rows[0];
  res.json({
    data: {
      total:       Number(s.total),
      placed:      Number(s.placed_count),
      confirmed:   Number(s.confirmed_count),
      processing:  Number(s.processing_count),
      in_transit:  Number(s.in_transit_count),
      delivered:   Number(s.delivered_count),
      cancelled:   Number(s.cancelled_count),
    },
  });
});

// ── Admin: GET /api/admin/orders ──
adminOrdersRouter.get('/', async (req: Request, res: Response) => {
  const { status, search, page = '1', limit = '20' } = req.query;
  const p = Math.max(1, parseInt(page as string, 10));
  const l = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
  const offset = (p - 1) * l;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (status && status !== 'all') {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(`(id ILIKE $${idx} OR customer_name ILIKE $${idx} OR company ILIKE $${idx} OR email ILIKE $${idx} OR phone ILIKE $${idx})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRes, dataRes] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM orders ${where}`, params),
    pool.query(`SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ${l} OFFSET ${offset}`, params),
  ]);

  const total = Number(countRes.rows[0].count);
  res.json({
    data: dataRes.rows,
    pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
  });
});

// ── Admin: PATCH /api/admin/orders/:id/status ──
adminOrdersRouter.patch('/:id/status', validate(updateOrderStatusSchema), async (req: Request, res: Response) => {
  const { status, note } = req.body as z.infer<typeof updateOrderStatusSchema>;
  const orderId = (req.params.id as string).toUpperCase().trim();

  const currentRes = await pool.query('SELECT tracking_history, fulfillment_hub FROM orders WHERE UPPER(id) = $1', [orderId]);
  if (!currentRes.rows[0]) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const trackingHistory = currentRes.rows[0].tracking_history || [];
  const statusLabels: Record<string, string> = {
    order_placed: 'Order Placed & Logged',
    confirmed:    'Order Confirmed by Logistics Yard',
    processing:   'Quality Inspection & Staging in Progress',
    in_transit:   'Dispatched & In Transit to Site',
    delivered:    'Delivered & Received on Site',
    cancelled:    'Order Cancelled',
  };

  trackingHistory.push({
    status,
    label: statusLabels[status] || status,
    time: new Date().toISOString(),
    location: currentRes.rows[0].fulfillment_hub,
    note: note || `Status updated to ${statusLabels[status] || status}.`,
  });

  const result = await pool.query(
    `UPDATE orders
     SET status = $1, tracking_history = $2, updated_at = NOW()
     WHERE UPPER(id) = $3
     RETURNING *`,
    [status, JSON.stringify(trackingHistory), orderId]
  );

  res.json({ message: 'Order status updated', order: result.rows[0] });
});

// ── Admin: DELETE /api/admin/orders/:id ──
adminOrdersRouter.delete('/:id', async (req: Request, res: Response) => {
  const orderId = (req.params.id as string).toUpperCase().trim();
  const result = await pool.query('DELETE FROM orders WHERE UPPER(id) = $1 RETURNING id', [orderId]);
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  res.json({ message: 'Order deleted', id: orderId });
});
