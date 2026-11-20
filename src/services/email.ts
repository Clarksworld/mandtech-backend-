/**
 * Mandtech Email Service — Supports Gmail SMTP (Nodemailer) & Resend
 * Provides branded HTML email templates for all transactional events.
 *
 * For Gmail:
 *   GMAIL_USER         — your Gmail address (e.g. mandtechservices@gmail.com)
 *   GMAIL_APP_PASSWORD — 16-character Google App Password (not your normal password)
 *   EMAIL_FROM         — (optional) display name e.g. "Mandtech Services <mandtechservices@gmail.com>"
 *
 * For Resend (optional fallback):
 *   RESEND_API_KEY     — from https://resend.com
 *
 * When neither is set, emails are skipped safely.
 */

import nodemailer, { Transporter } from 'nodemailer';
import { Resend } from 'resend';

let _gmailTransporter: Transporter | null = null;
function getGmailTransporter(): Transporter | null {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const rawPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  if (!user || !rawPass) return null;

  const pass = rawPass.replace(/\s+/g, '');

  if (!_gmailTransporter) {
    _gmailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: user.trim(), pass },
    });
  }
  return _gmailTransporter;
}

let _resendClient: Resend | null = null;
function getResendClient(): Resend | null {
  if (!_resendClient && process.env.RESEND_API_KEY) {
    _resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return _resendClient;
}

const SITE = 'https://mandtech-1chv.vercel.app';
const getAdminEmail = () => process.env.ADMIN_EMAIL || process.env.GMAIL_USER || 'info@mandtech.com.ng';

/* ─── safe send wrapper ─────────────────────────────────────── */
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const gmail = getGmailTransporter();
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
  const from = process.env.EMAIL_FROM || (gmailUser ? `Mandtech Services <${gmailUser}>` : 'Mandtech Services <onboarding@resend.dev>');

  // 1. Try Gmail SMTP if configured
  if (gmail) {
    try {
      const info = await gmail.sendMail({ from, to, subject, html });
      console.log(`[GMAIL SENT] To: ${to} | ${subject} (messageId: ${info.messageId})`);
      return;
    } catch (err) {
      console.error('[GMAIL SEND ERROR]', err);
    }
  }

  // 2. Fallback to Resend if configured
  const resend = getResendClient();
  if (resend) {
    try {
      const { error } = await resend.emails.send({ from, to, subject, html });
      if (error) console.error('[RESEND ERROR]', error);
      else console.log(`[RESEND SENT] To: ${to} | ${subject}`);
      return;
    } catch (err) {
      console.error('[RESEND EXCEPTION]', err);
    }
  }

  if (!gmail && !resend) {
    console.log(`[EMAIL SKIPPED — neither GMAIL nor RESEND configured] To: ${to} | ${subject}`);
  }
}

/* ─── shared layout wrapper ─────────────────────────────────── */
function layout(innerHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { margin:0; padding:0; background:#f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrap { max-width:600px; margin:32px auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; }
    .header { background:#0f172a; padding:28px 32px; text-align:center; }
    .header-title { color:#ffffff; font-size:20px; font-weight:800; letter-spacing:0.5px; margin:0; }
    .header-sub { color:rgba(255,255,255,0.6); font-size:11px; margin:4px 0 0; letter-spacing:1.5px; text-transform:uppercase; }
    .body { padding:32px; color:#1e293b; }
    .greeting { font-size:18px; font-weight:700; margin:0 0 8px; }
    p { font-size:14px; line-height:1.7; color:#475569; margin:0 0 16px; }
    .info-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px 20px; margin:20px 0; }
    .info-row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f1f5f9; font-size:13px; }
    .info-row:last-child { border-bottom:none; }
    .info-label { color:#94a3b8; font-weight:600; }
    .info-value { color:#1e293b; font-weight:600; text-align:right; max-width:60%; }
    .status-pill { display:inline-block; padding:5px 14px; border-radius:9999px; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; }
    .btn { display:inline-block; background:#0f172a; color:#ffffff; text-decoration:none; padding:12px 28px; border-radius:8px; font-size:14px; font-weight:700; margin:16px 0; }
    .item-row { background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px 14px; margin-bottom:8px; font-size:13px; }
    .item-title { font-weight:700; color:#0f172a; }
    .item-meta { color:#94a3b8; font-size:11px; margin-top:2px; }
    .footer { background:#f8fafc; border-top:1px solid #e2e8f0; padding:20px 32px; text-align:center; }
    .footer p { font-size:11px; color:#94a3b8; margin:4px 0; }
    .footer strong { color:#475569; }
    .divider { height:1px; background:#f1f5f9; margin:20px 0; }
    .orange { color:#ea580c; }
    .green  { color:#16a34a; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <p class="header-title">MANDTECH SERVICES</p>
      <p class="header-sub">Industrial Equipment Solutions · Nigeria &amp; West Africa</p>
    </div>
    <div class="body">${innerHtml}</div>
    <div class="footer">
      <p><strong>Mandtech Services Ltd.</strong></p>
      <p>42 Old Refinery Rd, Elelenwo, Port-Harcourt | Lagos | Abuja</p>
      <p>📞 08064204187 / 08027779298 | 🌐 <a href="${SITE}" style="color:#0f172a">mandtech.com.ng</a></p>
      <p style="margin-top:12px; font-size:10px;">This is an automated transactional email from Mandtech Services. Please do not reply directly.</p>
    </div>
  </div>
</body>
</html>`;
}

/* ══════════════════════════════════════════════════════════════
   EMAIL TEMPLATES
══════════════════════════════════════════════════════════════ */

/* ── 1. Order Confirmation (to customer) ─────────────────── */
export async function sendOrderConfirmation(order: {
  id: string;
  customer_name: string;
  company: string;
  email: string;
  phone: string;
  fulfillment_hub: string;
  delivery_address: string;
  items: Array<{ title: string; category?: string; sku?: string; quantity?: number }>;
  notes?: string | null;
}): Promise<void> {
  const itemsHtml = order.items.map(it => `
    <div class="item-row">
      <div class="item-title">📦 ${it.title}</div>
      <div class="item-meta">${it.category || ''}${it.sku ? ` &nbsp;·&nbsp; SKU: ${it.sku}` : ''}${it.quantity && it.quantity > 1 ? ` &nbsp;·&nbsp; Qty: ${it.quantity}` : ''}</div>
    </div>`).join('');

  const html = layout(`
    <p class="greeting">Order Confirmed, ${order.customer_name}!</p>
    <p>Thank you for your yard requisition. Your order has been received and logged at our <strong>${order.fulfillment_hub}</strong>. Our logistics team is now reviewing stock availability and scheduling mobilization.</p>

    <div class="info-box">
      <div class="info-row"><span class="info-label">Tracking Reference</span><span class="info-value" style="font-family:monospace;font-size:16px;color:#0f172a;">${order.id}</span></div>
      <div class="info-row"><span class="info-label">Company</span><span class="info-value">${order.company}</span></div>
      <div class="info-row"><span class="info-label">Fulfillment Hub</span><span class="info-value">${order.fulfillment_hub}</span></div>
      <div class="info-row"><span class="info-label">Delivery Address</span><span class="info-value">${order.delivery_address}</span></div>
      <div class="info-row"><span class="info-label">Phone</span><span class="info-value">${order.phone}</span></div>
      <div class="info-row"><span class="info-label">Status</span><span class="info-value"><span class="status-pill" style="background:#dbeafe;color:#1e40af;">Order Placed</span></span></div>
    </div>

    <p style="font-weight:700;color:#0f172a;margin-bottom:8px;">Items Ordered (${order.items.length})</p>
    ${itemsHtml}

    ${order.notes ? `<p style="margin-top:16px;"><strong>Your Notes:</strong> ${order.notes}</p>` : ''}

    <div class="divider"></div>
    <p>You can track your order at any time using your reference ID:</p>
    <a href="${SITE}" class="btn">Track Order → ${order.id}</a>

    <p>Our team will confirm your order and provide a logistics timeline within <strong>2–4 business hours</strong>. For urgent inquiries call <strong>08064204187</strong>.</p>
  `);

  await sendEmail(order.email, `Order Confirmed — ${order.id} | Mandtech Services`, html);
}

/* ── 2. Order Status Update (to customer) ────────────────── */
export async function sendOrderStatusUpdate(order: {
  id: string;
  customer_name: string;
  email: string;
  company: string;
  status: string;
  fulfillment_hub: string;
  note?: string;
}): Promise<void> {
  const statusConfig: Record<string, { label: string; color: string; bg: string; message: string }> = {
    confirmed:    { label: 'Yard Confirmed',           color: '#92400e', bg: '#fef3c7', message: 'Your order has been confirmed by our logistics yard. Stock verification and QC inspection are underway.' },
    processing:   { label: 'Staging & QC in Progress', color: '#6d28d9', bg: '#ede9fe', message: 'Your items are being staged and inspected for quality compliance before dispatch.' },
    in_transit:   { label: 'Dispatched & In Transit',  color: '#9a3412', bg: '#ffedd5', message: 'Your equipment / parts are now on the way! Our dispatch team will coordinate delivery at your site address.' },
    delivered:    { label: 'Delivered ✓',              color: '#14532d', bg: '#dcfce7', message: 'Your order has been successfully delivered. We hope our equipment meets your operational requirements.' },
    cancelled:    { label: 'Order Cancelled',           color: '#7f1d1d', bg: '#fee2e2', message: 'Your order has been cancelled. Please contact our team if you believe this is an error or wish to re-order.' },
    order_placed: { label: 'Order Placed',              color: '#1e3a8a', bg: '#dbeafe', message: 'Your order has been logged in our system.' },
  };

  const cfg = statusConfig[order.status] || { label: order.status, color: '#374151', bg: '#f3f4f6', message: `Your order status has been updated to: ${order.status}.` };

  const html = layout(`
    <p class="greeting">Order Update — ${order.id}</p>
    <p>Hi <strong>${order.customer_name}</strong>, here's a status update on your Mandtech order for <strong>${order.company}</strong>.</p>

    <div style="text-align:center;padding:24px;background:${cfg.bg};border-radius:10px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:12px;color:${cfg.color};font-weight:700;text-transform:uppercase;letter-spacing:1px;">Current Status</p>
      <p style="margin:0;font-size:22px;font-weight:800;color:${cfg.color};">${cfg.label}</p>
    </div>

    <p>${cfg.message}</p>
    ${order.note ? `<div class="info-box"><p style="margin:0;font-size:13px;color:#374151;"><strong>Update note:</strong> ${order.note}</p></div>` : ''}

    <div class="info-box">
      <div class="info-row"><span class="info-label">Reference</span><span class="info-value" style="font-family:monospace;">${order.id}</span></div>
      <div class="info-row"><span class="info-label">Fulfillment Hub</span><span class="info-value">${order.fulfillment_hub}</span></div>
    </div>

    <a href="${SITE}" class="btn">Track Full Timeline →</a>

    <p>Questions? Call us on <strong>08064204187</strong> or reply to this email and we'll be in touch.</p>
  `);

  await sendEmail(order.email, `Order Update: ${cfg.label} — ${order.id} | Mandtech`, html);
}

/* ── 3. Admin New Order Alert ────────────────────────────── */
export async function sendAdminOrderAlert(order: {
  id: string;
  customer_name: string;
  company: string;
  email: string;
  phone: string;
  fulfillment_hub: string;
  delivery_address: string;
  items: Array<{ title: string; category?: string; sku?: string; quantity?: number }>;
  notes?: string | null;
}): Promise<void> {
  const itemsHtml = order.items.map(it =>
    `<div class="item-row"><div class="item-title">${it.title}</div><div class="item-meta">${it.category || ''}${it.sku ? ` · SKU: ${it.sku}` : ''}${it.quantity && it.quantity > 1 ? ` · Qty: ${it.quantity}` : ''}</div></div>`
  ).join('');

  const html = layout(`
    <p class="greeting" style="color:#dc2626;">🚨 New Yard Requisition Order</p>
    <p>A new order has just been placed and requires logistics confirmation.</p>

    <div class="info-box">
      <div class="info-row"><span class="info-label">Order ID</span><span class="info-value" style="font-family:monospace;font-size:15px;">${order.id}</span></div>
      <div class="info-row"><span class="info-label">Customer</span><span class="info-value">${order.customer_name}</span></div>
      <div class="info-row"><span class="info-label">Company</span><span class="info-value">${order.company}</span></div>
      <div class="info-row"><span class="info-label">Email</span><span class="info-value">${order.email}</span></div>
      <div class="info-row"><span class="info-label">Phone</span><span class="info-value">${order.phone}</span></div>
      <div class="info-row"><span class="info-label">Hub</span><span class="info-value">${order.fulfillment_hub}</span></div>
      <div class="info-row"><span class="info-label">Delivery To</span><span class="info-value">${order.delivery_address}</span></div>
      ${order.notes ? `<div class="info-row"><span class="info-label">Notes</span><span class="info-value">${order.notes}</span></div>` : ''}
    </div>

    <p style="font-weight:700;margin-bottom:8px;">Ordered Items (${order.items.length})</p>
    ${itemsHtml}

    <a href="https://mandtech-admin.vercel.app" class="btn" style="background:#dc2626;">Open Admin Dashboard →</a>
  `);

  await sendEmail(getAdminEmail(), `🛒 NEW ORDER ${order.id} — ${order.company} (${order.items.length} items)`, html);
}

/* ── 4. Inquiry Acknowledgment (to customer) ─────────────── */
export async function sendInquiryAck(inquiry: {
  name: string;
  company: string;
  email: string;
  message: string;
  equipment_interests?: string[];
}): Promise<void> {
  const interestsHtml = inquiry.equipment_interests && inquiry.equipment_interests.length > 0
    ? `<p><strong>Interests noted:</strong> ${inquiry.equipment_interests.join(', ')}</p>`
    : '';

  const html = layout(`
    <p class="greeting">Thanks for reaching out, ${inquiry.name}!</p>
    <p>We've received your inquiry from <strong>${inquiry.company}</strong>. A regional coordinator will review your request and respond within <strong>2 business hours</strong>.</p>

    <div class="info-box">
      <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Your Message</p>
      <p style="margin:0;font-size:14px;color:#1e293b;line-height:1.7;">${inquiry.message}</p>
    </div>

    ${interestsHtml}

    <div class="divider"></div>
    <p>While you wait, explore our full catalog of industrial equipment and spare parts:</p>
    <a href="${SITE}" class="btn">Browse Equipment Catalog →</a>

    <p>For urgent inquiries, please call <strong>08064204187</strong> or WhatsApp us at <strong>08027779298</strong>.</p>
  `);

  await sendEmail(inquiry.email, `Inquiry Received — Mandtech Services will respond shortly`, html);
}

/* ── 5. Welcome Email (on customer registration) ─────────── */
export async function sendWelcomeEmail(user: {
  name: string;
  email: string;
  company?: string;
}): Promise<void> {
  const html = layout(`
    <p class="greeting">Welcome to Mandtech, ${user.name}! 🎉</p>
    <p>Your account has been created successfully${user.company ? ` for <strong>${user.company}</strong>` : ''}. You now have full access to our customer portal.</p>

    <div class="info-box">
      <div class="info-row"><span class="info-label">Name</span><span class="info-value">${user.name}</span></div>
      <div class="info-row"><span class="info-label">Email</span><span class="info-value">${user.email}</span></div>
      ${user.company ? `<div class="info-row"><span class="info-label">Company</span><span class="info-value">${user.company}</span></div>` : ''}
    </div>

    <p>With your account you can:</p>
    <ul style="color:#475569;font-size:14px;line-height:2;">
      <li>📦 Place yard requisition orders and track delivery in real-time</li>
      <li>📋 View your complete order history</li>
      <li>💬 Submit and track support tickets</li>
      <li>📄 Access documents (PFIs, invoices, waybills) from our DMS</li>
    </ul>

    <a href="${SITE}" class="btn">Go to Customer Portal →</a>

    <p>Questions? Our support team is reachable at <strong>08064204187</strong> or on WhatsApp at <strong>08027779298</strong>. We're here to keep your operations running.</p>
  `);

  await sendEmail(user.email, `Welcome to Mandtech Services — Account Confirmed`, html);
}

