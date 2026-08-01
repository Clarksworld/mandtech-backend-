import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db';
import { validate } from '../middleware/validate';

const router = Router();

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const result = await pool.query(
    'SELECT id, email, password_hash, role FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  );

  const user = result.rows[0];
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role },
  });
});

const createAdminSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
  role:     z.enum(['admin', 'staff']).default('admin'),
  admin_secret: z.string().optional(),
});

// POST /api/auth/create-admin
router.post('/create-admin', validate(createAdminSchema), async (req: Request, res: Response) => {
  const { email, password, role } = req.body as z.infer<typeof createAdminSchema>;

  const cleanEmail = email.toLowerCase().trim();

  // Check if user already exists
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
  if (existing.rows[0]) {
    res.status(409).json({ error: 'User with this email already exists' });
    return;
  }

  // Hash password
  const salt = await bcrypt.genSalt(12);
  const password_hash = await bcrypt.hash(password, salt);

  // Insert admin user
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, $3)
     RETURNING id, email, role, created_at`,
    [cleanEmail, password_hash, role]
  );

  const newUser = result.rows[0];

  // Issue JWT token immediately
  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, role: newUser.role },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '24h' }
  );

  res.status(201).json({
    message: 'Admin user created successfully',
    token,
    user: newUser,
  });
});

export default router;
