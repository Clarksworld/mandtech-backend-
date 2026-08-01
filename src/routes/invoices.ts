import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { validate } from '../middleware/validate';

const router = Router();

/** Auto-generate invoice number: INV-YYYY-XXXX */
function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}-${rand}`;
}

const lineItemSchema = z.object({
  description: z.string().min(1),
  qty:         z.number().min(1),
  unit_price:  z.number().min(0),
});

const invoiceSchema = z.object({
  company:         z.string().min(1),
  contact_name:    z.string().min(1),
  email:           z.string().email(),
  billing_address: z.string().optional().default(''),
  line_items:      z.array(lineItemSchema).min(1),
  discount_pct:    z.number().min(0).max(100).default(0),
  vat_rate_pct:    z.number().min(0).max(100).default(7.5),
  delivery_terms:  z.string().optional().default('EXW - Ex Works'),
  currency:        z.string().optional().default('NGN'),
  notes:           z.string().optional().default(''),
  status:          z.enum(['draft', 'sent', 'paid', 'cancelled']).default('draft'),
});

function calcTotals(
  lineItems: Array<{ qty: number; unit_price: number }>,
  discountPct: number,
  vatRatePct: number
) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
  const discountAmount = +(subtotal * (discountPct / 100)).toFixed(2);
  const taxable = subtotal - discountAmount;
  const vatAmount = +(taxable * (vatRatePct / 100)).toFixed(2);
  const total = +(taxable + vatAmount).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), discountAmount, vatAmount, total };
}

// ── Admin: GET /api/admin/invoices ────────────────────────
router.get('/admin', async (req: Request, res: Response) => {
  const { status, page = '1', limit = '20' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let where = '';
  const params: unknown[] = [];
  if (status) {
    where = 'WHERE status = $1';
    params.push(status);
  }

  const countResult = await pool.query(`SELECT COUNT(*) FROM invoices ${where}`, params);
  const total = Number(countResult.rows[0].count);

  const dataResult = await pool.query(
    `SELECT * FROM invoices ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
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

// ── Admin: GET /api/admin/invoices/:id ────────────────────
router.get('/admin/:id', async (req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }
  res.json({ data: result.rows[0] });
});

// ── Admin: POST /api/admin/invoices ───────────────────────
router.post('/admin', validate(invoiceSchema), async (req: Request, res: Response) => {
  const d = req.body as z.infer<typeof invoiceSchema>;
  const { subtotal, discountAmount, vatAmount, total } = calcTotals(
    d.line_items, d.discount_pct, d.vat_rate_pct
  );

  let invoiceNumber = generateInvoiceNumber();
  // Ensure uniqueness (retry on collision)
  for (let i = 0; i < 3; i++) {
    const existing = await pool.query('SELECT id FROM invoices WHERE invoice_number = $1', [invoiceNumber]);
    if (!existing.rows[0]) break;
    invoiceNumber = generateInvoiceNumber();
  }

  const result = await pool.query(
    `INSERT INTO invoices
       (invoice_number, company, contact_name, email, billing_address, line_items,
        discount_pct, vat_rate_pct, delivery_terms, currency, notes, status,
        subtotal, discount_amount, vat_amount, total)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [
      invoiceNumber, d.company, d.contact_name, d.email, d.billing_address,
      JSON.stringify(d.line_items), d.discount_pct, d.vat_rate_pct, d.delivery_terms,
      d.currency, d.notes, d.status,
      subtotal, discountAmount, vatAmount, total,
    ]
  );

  res.status(201).json({ data: result.rows[0] });
});

// ── Admin: PUT /api/admin/invoices/:id ────────────────────
router.put('/admin/:id', validate(invoiceSchema), async (req: Request, res: Response) => {
  const d = req.body as z.infer<typeof invoiceSchema>;
  const { subtotal, discountAmount, vatAmount, total } = calcTotals(
    d.line_items, d.discount_pct, d.vat_rate_pct
  );

  const result = await pool.query(
    `UPDATE invoices SET
       company=$1, contact_name=$2, email=$3, billing_address=$4,
       line_items=$5, discount_pct=$6, vat_rate_pct=$7, delivery_terms=$8,
       currency=$9, notes=$10, status=$11,
       subtotal=$12, discount_amount=$13, vat_amount=$14, total=$15,
       updated_at=NOW()
     WHERE id=$16 RETURNING *`,
    [
      d.company, d.contact_name, d.email, d.billing_address,
      JSON.stringify(d.line_items), d.discount_pct, d.vat_rate_pct, d.delivery_terms,
      d.currency, d.notes, d.status,
      subtotal, discountAmount, vatAmount, total,
      req.params.id,
    ]
  );

  if (!result.rows[0]) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }
  res.json({ data: result.rows[0] });
});

// ── Admin: PUT /api/admin/invoices/:id/status ─────────────
router.put('/admin/:id/status', async (req: Request, res: Response) => {
  const { status } = req.body as { status: string };
  const allowed = ['draft', 'sent', 'paid', 'cancelled'];
  if (!allowed.includes(status)) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  const result = await pool.query(
    'UPDATE invoices SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
    [status, req.params.id]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }
  res.json({ data: result.rows[0] });
});

// ── Admin: DELETE /api/admin/invoices/:id ─────────────────
router.delete('/admin/:id', async (req: Request, res: Response) => {
  await pool.query(
    "UPDATE invoices SET status='cancelled', updated_at=NOW() WHERE id=$1",
    [req.params.id]
  );
  res.json({ message: 'Invoice cancelled' });
});

export default router;
