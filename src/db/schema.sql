-- ============================================================
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
  id                  VARCHAR(20)  PRIMARY KEY,  -- MT-xxxxxx format
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

-- Indexes for common query patterns
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
