import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { validate } from '../middleware/validate';

const router = Router();

// ── Schemas ───────────────────────────────────────────────
const projectSchema = z.object({
  title:       z.string().min(2),
  description: z.string().optional().default(''),
  status:      z.enum(['active', 'completed', 'on_hold', 'cancelled']).default('active'),
});

const taskSchema = z.object({
  title:         z.string().min(2),
  description:   z.string().optional().default(''),
  status:        z.enum(['backlog', 'in_progress', 'review', 'done']).default('backlog'),
  assigned_to:   z.string().uuid().optional().nullable(),
  assigned_name: z.string().optional().nullable(),
  due_date:      z.string().optional().nullable(),
});

// ── Admin: GET /api/admin/projects ────────────────────────
router.get('/admin', async (req: Request, res: Response) => {
  const { status } = req.query;
  let where = '';
  const params: unknown[] = [];
  if (status) {
    where = 'WHERE p.status = $1';
    params.push(status);
  }

  const result = await pool.query(
    `SELECT
       p.*,
       COUNT(t.id) FILTER (WHERE t.status = 'backlog')     AS backlog_count,
       COUNT(t.id) FILTER (WHERE t.status = 'in_progress') AS in_progress_count,
       COUNT(t.id) FILTER (WHERE t.status = 'done')        AS done_count,
       COUNT(t.id)                                          AS total_tasks
     FROM projects p
     LEFT JOIN tasks t ON t.project_id = p.id
     ${where}
     GROUP BY p.id
     ORDER BY p.created_at DESC`,
    params
  );

  res.json({ data: result.rows, total: result.rowCount });
});

// ── Admin: GET /api/admin/projects/:id ───────────────────
router.get('/admin/:id', async (req: Request, res: Response) => {
  const project = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
  if (!project.rows[0]) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const tasks = await pool.query(
    'SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at ASC',
    [req.params.id]
  );
  res.json({ data: { ...project.rows[0], tasks: tasks.rows } });
});

// ── Admin: POST /api/admin/projects ──────────────────────
router.post('/admin', validate(projectSchema), async (req: Request, res: Response) => {
  const d = req.body as z.infer<typeof projectSchema>;
  const result = await pool.query(
    `INSERT INTO projects (title, description, status) VALUES ($1,$2,$3) RETURNING *`,
    [d.title, d.description, d.status]
  );
  res.status(201).json({ data: result.rows[0] });
});

// ── Admin: PUT /api/admin/projects/:id ───────────────────
router.put('/admin/:id', validate(projectSchema), async (req: Request, res: Response) => {
  const d = req.body as z.infer<typeof projectSchema>;
  const result = await pool.query(
    `UPDATE projects SET title=$1, description=$2, status=$3, updated_at=NOW()
     WHERE id=$4 RETURNING *`,
    [d.title, d.description, d.status, req.params.id]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json({ data: result.rows[0] });
});

// ── Admin: DELETE /api/admin/projects/:id ────────────────
router.delete('/admin/:id', async (req: Request, res: Response) => {
  await pool.query("UPDATE projects SET status='cancelled', updated_at=NOW() WHERE id=$1", [req.params.id]);
  res.json({ message: 'Project cancelled' });
});

// ── Admin: GET /api/admin/projects/:id/tasks ─────────────
router.get('/admin/:id/tasks', async (req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at ASC',
    [req.params.id]
  );
  res.json({ data: result.rows, total: result.rowCount });
});

// ── Admin: POST /api/admin/projects/:id/tasks ────────────
router.post('/admin/:id/tasks', validate(taskSchema), async (req: Request, res: Response) => {
  const d = req.body as z.infer<typeof taskSchema>;

  // Resolve assigned_name from user if user_id given but name not provided
  let assignedName = d.assigned_name ?? null;
  if (d.assigned_to && !assignedName) {
    const user = await pool.query('SELECT email FROM users WHERE id = $1', [d.assigned_to]);
    assignedName = user.rows[0]?.email ?? null;
  }

  const result = await pool.query(
    `INSERT INTO tasks (project_id, title, description, status, assigned_to, assigned_name, due_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.params.id, d.title, d.description, d.status,
     d.assigned_to ?? null, assignedName, d.due_date ?? null]
  );
  res.status(201).json({ data: result.rows[0] });
});

// ── Admin: PUT /api/admin/tasks/:taskId ──────────────────
router.put('/admin/tasks/:taskId', validate(taskSchema), async (req: Request, res: Response) => {
  const d = req.body as z.infer<typeof taskSchema>;

  let assignedName = d.assigned_name ?? null;
  if (d.assigned_to && !assignedName) {
    const user = await pool.query('SELECT email FROM users WHERE id = $1', [d.assigned_to]);
    assignedName = user.rows[0]?.email ?? null;
  }

  const result = await pool.query(
    `UPDATE tasks SET
       title=$1, description=$2, status=$3,
       assigned_to=$4, assigned_name=$5, due_date=$6,
       updated_at=NOW()
     WHERE id=$7 RETURNING *`,
    [d.title, d.description, d.status,
     d.assigned_to ?? null, assignedName, d.due_date ?? null,
     req.params.taskId]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json({ data: result.rows[0] });
});

// ── Admin: DELETE /api/admin/tasks/:taskId ───────────────
router.delete('/admin/tasks/:taskId', async (req: Request, res: Response) => {
  await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.taskId]);
  res.json({ message: 'Task deleted' });
});

// ── Admin: GET /api/admin/tasks (all tasks flat view) ────
router.get('/admin/tasks/all', async (req: Request, res: Response) => {
  const { status, assigned_to } = req.query;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (status) {
    conditions.push(`t.status = $${idx++}`);
    params.push(status);
  }
  if (assigned_to) {
    conditions.push(`t.assigned_to = $${idx++}`);
    params.push(assigned_to);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT t.*, p.title AS project_title
     FROM tasks t
     LEFT JOIN projects p ON p.id = t.project_id
     ${where}
     ORDER BY t.created_at DESC`,
    params
  );
  res.json({ data: result.rows, total: result.rowCount });
});

export default router;
