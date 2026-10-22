import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "../db";
import { validate } from "../middleware/validate";
import { requireAdmin, AuthRequest } from "../middleware/auth";

const router = Router();

// ── GET /api/admin/stats & /api/admin/dashboard/stats ────
router.get(["/stats", "/dashboard/stats"], async (_req: AuthRequest, res: Response) => {
  const [products, parts, inquiries, tickets] = await Promise.all([
    pool.query("SELECT COUNT(*) FROM products WHERE is_active = TRUE"),
    pool.query("SELECT COUNT(*) FROM parts WHERE is_active = TRUE"),
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
  role:     z.enum(["admin", "staff"]).default("staff"),
});

const updateUserSchema = z.object({
  email:    z.string().email().optional(),
  role:     z.enum(["admin", "staff"]).optional(),
  password: z.string().min(8).optional(),
});

// ── GET /api/admin/users ─────────────────────────────────
router.get("/users", async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(
    "SELECT id, email, role, created_at FROM users ORDER BY created_at DESC"
  );
  res.json({ data: result.rows });
});

// ── POST /api/admin/users (admin only) ────────────────────
router.post("/users", requireAdmin, validate(createUserSchema), async (req: AuthRequest, res: Response) => {
  const { email, password, role } = req.body as z.infer<typeof createUserSchema>;

  const exists = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
  if (exists.rows[0]) {
    res.status(409).json({ error: "Email already in use" });
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

// ── PUT /api/admin/users/:id (admin only) ─────────────────
router.put("/users/:id", requireAdmin, validate(updateUserSchema), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { email, role, password } = req.body as z.infer<typeof updateUserSchema>;

  const existing = await pool.query("SELECT id, email, role FROM users WHERE id = $1", [id]);
  if (!existing.rows[0]) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Prevent demoting the last remaining admin
  if (role && role !== "admin" && existing.rows[0].role === "admin") {
    const adminCount = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    if (Number(adminCount.rows[0].count) <= 1) {
      res.status(400).json({ error: "Cannot demote the last remaining admin" });
      return;
    }
  }

  // Prevent email collisions if updating email
  if (email && email.toLowerCase() !== existing.rows[0].email.toLowerCase()) {
    const conflict = await pool.query("SELECT id FROM users WHERE email = $1 AND id != $2", [email.toLowerCase(), id]);
    if (conflict.rows[0]) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (email) {
    updates.push(`email = $${idx++}`);
    params.push(email.toLowerCase());
  }
  if (role) {
    updates.push(`role = $${idx++}`);
    params.push(role);
  }
  if (password) {
    const hash = await bcrypt.hash(password, 12);
    updates.push(`password_hash = $${idx++}`);
    params.push(hash);
  }

  if (updates.length === 0) {
    res.status(400).json({ error: "No fields provided for update" });
    return;
  }

  params.push(id);
  const result = await pool.query(
    `UPDATE users SET ${updates.join(", ")} WHERE id = $${idx} RETURNING id, email, role, created_at`,
    params
  );
  res.json({ data: result.rows[0] });
});

// ── DELETE /api/admin/users/:id (admin only) ──────────────
router.delete("/users/:id", requireAdmin, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Guard against self-deletion
  if (req.user?.id === id) {
    res.status(400).json({ error: "Cannot delete your own account" });
    return;
  }

  const target = await pool.query("SELECT id, role FROM users WHERE id = $1", [id]);
  if (!target.rows[0]) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Guard against deleting the last admin
  if (target.rows[0].role === "admin") {
    const adminCount = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    if (Number(adminCount.rows[0].count) <= 1) {
      res.status(400).json({ error: "Cannot delete the last remaining admin" });
      return;
    }
  }

  await pool.query("DELETE FROM users WHERE id = $1", [id]);
  res.json({ message: "User deleted" });
});

export default router;
