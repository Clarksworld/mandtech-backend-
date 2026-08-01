# Mandtech Services — Backend API

Node.js, Express, TypeScript, and PostgreSQL REST API built to power both Mandtech web applications:
- **Customer Portal**: https://mandtech-1chv.vercel.app/
- **Admin Dashboard**: https://mandtech-admin.vercel.app/

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js >= 18.0.0
- PostgreSQL database (Local, Supabase, Railway, or Render)

### 2. Environment Setup
Copy `.env.example` to `.env` and fill in your database and JWT secret credentials:

```bash
cp .env.example .env
```

Example `.env`:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/mandtech
JWT_SECRET=your_super_secret_jwt_key_here
PORT=4000
NODE_ENV=development
SEED_DB=true
```

### 3. Installation & Run

```bash
# Install dependencies
npm install

# Run dev server with auto-reload (applies DB schema & seeds on first run if SEED_DB=true)
npm run dev

# Production Build
npm run build
npm start
```

---

## 📌 Database Schema Summary

The database uses PostgreSQL with automatic table creation & initial seeding:
- `users`: Admin and staff accounts (`admin@mandtech.com.ng` default seeded admin, password: `mandtech_admin_2024`)
- `products`: Air Compressors, Generators, Pumps, Air Dryers with spec tags, badges, capacity rating, and driven type.
- `parts`: OEM and refurbished spare parts catalog with SKUs, category, and compatibility matching.
- `inquiries`: Commercial proposals and RFQs submitted from the contact form.
- `service_tickets`: After-sales maintenance & breakdown dispatch tickets (`MT-xxxxxx`).
- `ticket_logs`: Real-time dispatch time logs attached to each service ticket.
- `documents`: Technical library manual PDFs and checklists.

---

## 📡 API Endpoint Reference

### Public API (Customer Site)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health check |
| `POST` | `/api/auth/login` | Admin/staff login (`{ email, password }`) |
| `GET` | `/api/products` | Query products (`?category=&brand=&driven=&maxCapacity=&sort=`) |
| `GET` | `/api/products/:id` | Get single product detail |
| `GET` | `/api/parts` | Query parts catalog (`?category=&brand=&condition=&search=&sort=`) |
| `GET` | `/api/parts/:id` | Get single part detail |
| `POST` | `/api/inquiries` | Submit contact form / RFQ inquiry ticket |
| `POST` | `/api/tickets` | Submit after-sales service intake ticket |
| `GET` | `/api/tickets/:id` | Track dispatch ticket by ID (e.g. `MT-824021`) |
| `GET` | `/api/documents` | Get list of technical library PDFs |

---

### Admin API (Protected — Header: `Authorization: Bearer <token>`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/dashboard/stats` | Dashboard statistics & counters |
| `GET` | `/api/admin/products/all` | List all products (including deactivated) |
| `POST` | `/api/admin/products` | Add new equipment product |
| `PUT` | `/api/admin/products/:id` | Update product specs/status |
| `DELETE` | `/api/admin/products/:id` | Soft-delete product |
| `GET` | `/api/admin/parts/all` | List all spare parts |
| `POST` | `/api/admin/parts` | Add new spare part |
| `PUT` | `/api/admin/parts/:id` | Update spare part |
| `DELETE` | `/api/admin/parts/:id` | Soft-delete spare part |
| `GET` | `/api/admin/inquiries` | View customer inquiries (`?status=&page=&limit=`) |
| `PUT` | `/api/admin/inquiries/:id/status` | Update inquiry status (`new`, `in_review`, `responded`, `closed`) |
| `GET` | `/api/admin/tickets/all` | View all service tickets |
| `PUT` | `/api/admin/tickets/:id` | Update ticket status, assigned engineer, and ETA |
| `POST` | `/api/admin/tickets/:id/logs` | Append new time log entry to dispatch timeline |
| `GET` | `/api/admin/users` | List admin users |
| `POST` | `/api/admin/users` | Create new admin user |
| `DELETE` | `/api/admin/users/:id` | Delete admin user |

---

## 🛠 Deployment Notes

- **Railway / Render**: Set `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `SEED_DB=true` (for initial startup).
- **CORS Configuration**: Pre-configured for `https://mandtech-1chv.vercel.app` and `https://mandtech-admin.vercel.app`. Add extra origins to `EXTRA_ORIGINS` env variable.
