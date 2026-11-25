import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { validate } from '../middleware/validate';
import { sendTestAdminAlert, getAdminAlertRecipients } from '../services/email';

export const settingsRouter = Router();

const updateNotificationSchema = z.object({
  emails: z.array(z.string().email('Invalid email address')).min(1, 'At least one notification email is required'),
  enabled_types: z.array(z.string()).optional().default(['orders', 'compressors', 'parts', 'leasing', 'lubricants', 'inquiries']),
});

const DEFAULT_EMAILS = [
  process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL || process.env.GMAIL_USER || 'mandtechserviceslimited@gmail.com',
].filter(Boolean);

// ── GET /api/admin/settings/notifications ──────────────────────────
settingsRouter.get('/notifications', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT value, updated_at FROM system_settings WHERE key = 'alert_notifications'"
    );

    if (result.rows.length === 0) {
      return res.json({
        data: {
          emails: DEFAULT_EMAILS,
          enabled_types: ['orders', 'compressors', 'parts', 'leasing', 'lubricants', 'inquiries'],
          updated_at: null,
          is_default: true,
        },
      });
    }

    const val = result.rows[0].value || {};
    res.json({
      data: {
        emails: Array.isArray(val.emails) && val.emails.length > 0 ? val.emails : DEFAULT_EMAILS,
        enabled_types: Array.isArray(val.enabled_types)
          ? val.enabled_types
          : ['orders', 'compressors', 'parts', 'leasing', 'lubricants', 'inquiries'],
        updated_at: result.rows[0].updated_at,
        is_default: false,
      },
    });
  } catch (err: any) {
    console.error('Error fetching notification settings:', err);
    res.status(500).json({ error: 'Failed to retrieve notification settings' });
  }
});

// ── PUT /api/admin/settings/notifications ──────────────────────────
settingsRouter.put('/notifications', validate(updateNotificationSchema), async (req: Request, res: Response) => {
  const { emails, enabled_types } = req.body as z.infer<typeof updateNotificationSchema>;

  // Clean emails
  const cleanEmails = Array.from(new Set(emails.map((e) => e.trim().toLowerCase())));

  try {
    // Ensure table exists in case initDb hasn't run yet
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key         VARCHAR(100) PRIMARY KEY,
        value       JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const result = await pool.query(
      `INSERT INTO system_settings (key, value, updated_at)
       VALUES ('alert_notifications', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         updated_at = NOW()
       RETURNING key, value, updated_at`,
      [JSON.stringify({ emails: cleanEmails, enabled_types })]
    );

    res.json({
      message: 'Notification settings saved successfully.',
      data: {
        emails: cleanEmails,
        enabled_types,
        updated_at: result.rows[0].updated_at,
      },
    });
  } catch (err: any) {
    console.error('Error updating notification settings:', err);
    res.status(500).json({ error: 'Failed to save notification settings' });
  }
});

// ── POST /api/admin/settings/notifications/test ───────────────────
settingsRouter.post('/notifications/test', async (req: Request, res: Response) => {
  try {
    const rawEmails = req.body?.emails;
    let targetEmails: string[] = [];

    if (Array.isArray(rawEmails) && rawEmails.length > 0) {
      targetEmails = rawEmails.map((e: string) => String(e).trim().toLowerCase()).filter(Boolean);
    } else {
      targetEmails = await getAdminAlertRecipients();
    }

    if (targetEmails.length === 0) {
      return res.status(400).json({ error: 'No recipient email addresses provided or configured.' });
    }

    await sendTestAdminAlert(targetEmails);

    res.json({
      success: true,
      message: `Test alert email sent successfully to ${targetEmails.join(', ')}`,
      recipients: targetEmails,
    });
  } catch (err: any) {
    console.error('Error sending test notification email:', err);
    res.status(500).json({
      error: `Failed to dispatch test email: ${err.message || 'Check email service credentials'}`,
    });
  }
});

export default settingsRouter;
