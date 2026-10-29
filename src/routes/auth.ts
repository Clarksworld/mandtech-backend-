import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';

const router = Router();

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

const registerCustomerSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name:     z.string().min(2, 'Full name is required'),
  company:  z.string().min(1, 'Company or organization name is required'),
  phone:    z.string().min(6, 'Active telephone number is required'),
});

// POST /api/auth/register (Customer Portal Registration)
router.post('/register', validate(registerCustomerSchema), async (req: Request, res: Response) => {
  const { email, password, name, company, phone } = req.body as z.infer<typeof registerCustomerSchema>;
  const cleanEmail = email.toLowerCase().trim();

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
  if (existing.rows[0]) {
    res.status(409).json({ error: 'An account with this email already exists. Please login instead.' });
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, role, name, company, phone)
     VALUES ($1, $2, 'customer', $3, $4, $5)
     RETURNING id, email, role, name, company, phone, created_at`,
    [cleanEmail, password_hash, name.trim(), company.trim(), phone.trim()]
  );

  const newUser = result.rows[0];
  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '30d' }
  );

  res.status(201).json({
    message: 'Account registered successfully',
    token,
    user: newUser,
  });
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const result = await pool.query(
    'SELECT id, email, password_hash, role, name, company, phone FROM users WHERE email = $1',
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
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '30d' }
  );

  res.json({
    message: 'Logged in successfully',
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      company: user.company,
      phone: user.phone,
    },
  });
});

// GET /api/auth/me (Get profile of current user)
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const userPayload = (req as any).user;
  const result = await pool.query(
    'SELECT id, email, role, name, company, phone, created_at FROM users WHERE id = $1',
    [userPayload.id]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: result.rows[0] });
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

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
  if (existing.rows[0]) {
    res.status(409).json({ error: 'User with this email already exists' });
    return;
  }

  const salt = await bcrypt.genSalt(12);
  const password_hash = await bcrypt.hash(password, salt);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, $3)
     RETURNING id, email, role, created_at`,
    [cleanEmail, password_hash, role]
  );

  const newUser = result.rows[0];
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
