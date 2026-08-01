export const SCHEMA_SQL = `-- ============================================================
--  Mandtech Services — PostgreSQL Database Schema
-- ============================================================

-- Users (admin accounts)
CREATE TABLE IF NOT EXISTS users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role        VARCHAR(20)  NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Products (equipment for sale)
CREATE TABLE IF NOT EXISTS products (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(255) NOT NULL,
  category     VARCHAR(100) NOT NULL CHECK (category IN ('Air Compressors', 'Generators', 'Pumps', 'Air Dryers')),
  brand        VARCHAR(100) NOT NULL,
  driven_type  VARCHAR(50)  NOT NULL CHECK (driven_type IN ('Electric', 'Diesel Driven')),
  capacity     INTEGER      NOT NULL,
  badge        VARCHAR(50),
  specs        JSONB        NOT NULL DEFAULT '[]',
  image_url    VARCHAR(500) NOT NULL DEFAULT '',
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Parts (spare parts catalog)
CREATE TABLE IF NOT EXISTS parts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(255) NOT NULL,
  category      VARCHAR(100) NOT NULL CHECK (category IN ('Air Filtration', 'Control Systems', 'Electrical Spares', 'Mechanical Gaskets')),
  brand         VARCHAR(100) NOT NULL,
  sku           VARCHAR(100) NOT NULL UNIQUE,
  compatibility TEXT         NOT NULL,
  condition     VARCHAR(50)  NOT NULL CHECK (condition IN ('New OEM', 'Refurbished')),
  badge         VARCHAR(100) NOT NULL DEFAULT 'IN STOCK',
  image_url     VARCHAR(500) NOT NULL DEFAULT '',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Inquiries (contact / RFQ form submissions)
CREATE TABLE IF NOT EXISTS inquiries (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(255) NOT NULL,
  company              VARCHAR(255) NOT NULL,
  email                VARCHAR(255) NOT NULL,
  phone                VARCHAR(50),
  message              TEXT         NOT NULL,
  equipment_interests  JSONB        NOT NULL DEFAULT '[]',
  newsletter_opt_in    BOOLEAN      NOT NULL DEFAULT FALSE,
  status               VARCHAR(20)  NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'responded', 'closed')),
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Service Tickets (after-sales intake)
CREATE TABLE IF NOT EXISTS service_tickets (
  id                  VARCHAR(20)  PRIMARY KEY,
  asset_serial_id     VARCHAR(100) NOT NULL,
  service_type        VARCHAR(100) NOT NULL,
  description         TEXT         NOT NULL,
  urgency             VARCHAR(50)  NOT NULL DEFAULT 'Standard Route' CHECK (urgency IN ('Standard Route', 'High Priority', 'Emergency Site Breakdown')),
  status              VARCHAR(20)  NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'assigned', 'in_dispatch', 'completed', 'cancelled')),
  assigned_engineer   VARCHAR(255),
  eta                 VARCHAR(100),
  authorize_dispatch  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Ticket Log Entries (timeline per ticket)
CREATE TABLE IF NOT EXISTS ticket_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   VARCHAR(20) NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
  time_label  VARCHAR(50) NOT NULL,
  log_text    TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Technical Library Documents
CREATE TABLE IF NOT EXISTS documents (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(255) NOT NULL,
  file_url      VARCHAR(500) NOT NULL DEFAULT '',
  file_size     VARCHAR(50),
  read_duration VARCHAR(50),
  icon_emoji    VARCHAR(10)  NOT NULL DEFAULT '📄',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_category     ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand        ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_driven_type  ON products(driven_type);
CREATE INDEX IF NOT EXISTS idx_products_is_active    ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_parts_category        ON parts(category);
CREATE INDEX IF NOT EXISTS idx_parts_brand           ON parts(brand);
CREATE INDEX IF NOT EXISTS idx_parts_condition       ON parts(condition);
CREATE INDEX IF NOT EXISTS idx_parts_is_active       ON parts(is_active);
CREATE INDEX IF NOT EXISTS idx_inquiries_status      ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_tickets_status        ON service_tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_logs_ticket_id ON ticket_logs(ticket_id);

-- ── Migration: Lead assignment column ────────────────────
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS assigned_name VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_inquiries_assigned_to ON inquiries(assigned_to);

-- ── Invoices / Quotation Builder ─────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  VARCHAR(50) NOT NULL UNIQUE,
  company         VARCHAR(255) NOT NULL,
  contact_name    VARCHAR(255) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  billing_address TEXT,
  line_items      JSONB        NOT NULL DEFAULT '[]',
  discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  vat_rate_pct    NUMERIC(5,2) NOT NULL DEFAULT 7.5,
  delivery_terms  VARCHAR(100) NOT NULL DEFAULT 'EXW - Ex Works',
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency        VARCHAR(10)  NOT NULL DEFAULT 'NGN',
  status          VARCHAR(20)  NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  notes           TEXT,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_status     ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);

-- ── Projects & Task Board ─────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  status      VARCHAR(30)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  status       VARCHAR(20)  NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'in_progress', 'review', 'done')),
  assigned_to  UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_name VARCHAR(255),
  due_date     DATE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status     ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned   ON tasks(assigned_to);
`;

export const SEED_SQL = `-- Default admin user (password: mandtech_admin_2024)
INSERT INTO users (email, password_hash, role) VALUES
  ('admin@mandtech.com.ng', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKo1W.4RhTN2u3a', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (title, category, brand, driven_type, capacity, badge, specs, image_url) VALUES
('Sullair 185 Series', 'Air Compressors', 'Sullair', 'Diesel Driven', 185, 'IN STOCK', '[{"label":"185 CFM Capacity","icon_name":"Activity"},{"label":"Diesel Driven Engine","icon_name":"Zap"},{"label":"Heavy-Duty Frame","icon_name":"Shield"}]', 'https://res.cloudinary.com/mandtech/image/upload/v1/products/sullair-185.jpg'),
('Electric Power Dry E-40', 'Air Dryers', 'Kaeser', 'Electric', 40, NULL, '[{"label":"Electric Driven 400V","icon_name":"Zap"},{"label":"40 CFM Low Noise","icon_name":"Activity"},{"label":"Zero Emissions","icon_name":"Shield"}]', 'https://res.cloudinary.com/mandtech/image/upload/v1/products/kaeser-e40.jpg'),
('Mandtech Titan X-120', 'Air Compressors', 'Sullair', 'Diesel Driven', 120, 'FEATURED', '[{"label":"120 CFM, Diesel Driven","icon_name":"Activity"},{"label":"Site-Ready Portable","icon_name":"Settings"},{"label":"Extended Runtime","icon_name":"Shield"}]', 'https://res.cloudinary.com/mandtech/image/upload/v1/products/titan-x120.jpg'),
('High-Capacity Pump V9', 'Pumps', 'Ingersoll Rand', 'Diesel Driven', 900, NULL, '[{"label":"900 GPM Flow Rate","icon_name":"Activity"},{"label":"Corrosion Resistant","icon_name":"Settings"},{"label":"High Torque Diesel","icon_name":"Zap"}]', 'https://res.cloudinary.com/mandtech/image/upload/v1/products/pump-v9.jpg'),
('Sullair 375 Tier 4', 'Air Compressors', 'Sullair', 'Diesel Driven', 375, NULL, '[{"label":"375 CFM Capacity","icon_name":"Activity"},{"label":"Emission Compliant","icon_name":"Shield"},{"label":"Smart Monitoring","icon_name":"Settings"}]', 'https://res.cloudinary.com/mandtech/image/upload/v1/products/sullair-375.jpg'),
('DryLine Industrial S', 'Air Dryers', 'Atlas Copco', 'Electric', 600, NULL, '[{"label":"Desiccant Drying","icon_name":"Shield"},{"label":"Electric 230V/400V","icon_name":"Zap"},{"label":"Variable Flow Rate","icon_name":"Activity"}]', 'https://res.cloudinary.com/mandtech/image/upload/v1/products/dryline-s.jpg'),
('Atlas Copco GA-160', 'Air Compressors', 'Atlas Copco', 'Electric', 800, 'IN STOCK', '[{"label":"160 kW Rotary Screw","icon_name":"Activity"},{"label":"Variable Speed Electric","icon_name":"Zap"},{"label":"Remote Monitoring","icon_name":"Shield"}]', 'https://res.cloudinary.com/mandtech/image/upload/v1/products/ac-ga160.jpg'),
('Prime Power 500 kVA', 'Generators', 'Ingersoll Rand', 'Diesel Driven', 500, NULL, '[{"label":"500 kVA Prime Output","icon_name":"Zap"},{"label":"Low-Consumption Diesel","icon_name":"Activity"},{"label":"Sound-Attenuated Shell","icon_name":"Shield"}]', 'https://res.cloudinary.com/mandtech/image/upload/v1/products/prime-500kva.jpg');

INSERT INTO parts (title, category, brand, sku, compatibility, condition, badge, image_url) VALUES
('High-Pressure Oil Filter', 'Air Filtration', 'Sullair', 'SL-98230-XP', 'LS Series, 16-25 Series Compressors', 'New OEM', 'IN STOCK', 'https://res.cloudinary.com/mandtech/image/upload/v1/parts/oil-filter.jpg'),
('Digital Pressure Sensor', 'Control Systems', 'Ingersoll Rand', 'IR-PG-400X', 'SSR/M Series Rotary Screw', 'New OEM', 'IN STOCK', 'https://res.cloudinary.com/mandtech/image/upload/v1/parts/pressure-sensor.jpg'),
('Thermal Control Valve', 'Control Systems', 'Atlas Copco', 'AC-TCV-772', 'GA VSD+ Series Compressors', 'New OEM', 'LOW STOCK', 'https://res.cloudinary.com/mandtech/image/upload/v1/parts/thermal-valve.jpg'),
('Service Overhaul Gasket Kit', 'Mechanical Gaskets', 'Sullair', 'MK-GSKT-KIT-V2', 'Universal 2-Stage Air Ends', 'New OEM', 'IN STOCK', 'https://res.cloudinary.com/mandtech/image/upload/v1/parts/gasket-kit.jpg'),
('Reinforced Cooling Fan', 'Mechanical Gaskets', 'Sullair', 'SL-FAN-0098', 'TS Series, LS Series Compressors', 'New OEM', 'IN STOCK', 'https://res.cloudinary.com/mandtech/image/upload/v1/parts/cooling-fan.jpg'),
('Heavy-Duty Pressure Switch', 'Electrical Spares', 'Kaeser', 'KS-PSW-300', 'BSD, CSD, DSD Compressor Units', 'Refurbished', 'REFURBISHED AVAILABLE', 'https://res.cloudinary.com/mandtech/image/upload/v1/parts/pressure-switch.jpg');

INSERT INTO documents (title, file_url, file_size, read_duration, icon_emoji) VALUES
('Daily Air Compressor Field Checklist', 'https://res.cloudinary.com/mandtech/raw/upload/v1/docs/air-compressor-checklist.pdf', 'PDF (2.4 MB)', '5 min read', '📋'),
('Standard Operating Procedures: Kaeser Dryer Lines', 'https://res.cloudinary.com/mandtech/raw/upload/v1/docs/kaeser-dryer-sop.pdf', 'PDF (4.8 MB)', '12 min read', '📖'),
('Emergency Troubleshooting for Generator Overheating', 'https://res.cloudinary.com/mandtech/raw/upload/v1/docs/generator-emergency-guide.pdf', 'PDF (1.2 MB)', '8 min read', '⚠️');
`;
