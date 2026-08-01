-- ============================================================
--  Mandtech Services — Seed Data
--  (Mirrors all hardcoded frontend data exactly)
-- ============================================================

-- Default admin user (password: mandtech_admin_2024)
INSERT INTO users (email, password_hash, role) VALUES
  ('admin@mandtech.com.ng', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKo1W.4RhTN2u3a', 'admin')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
--  PRODUCTS (Equipment for Sale)
-- ============================================================
INSERT INTO products (title, category, brand, driven_type, capacity, badge, specs, image_url) VALUES
(
  'Sullair 185 Series',
  'Air Compressors', 'Sullair', 'Diesel Driven', 185, 'IN STOCK',
  '[{"label":"185 CFM Capacity","icon_name":"Activity"},{"label":"Diesel Driven Engine","icon_name":"Zap"},{"label":"Heavy-Duty Frame","icon_name":"Shield"}]',
  'https://res.cloudinary.com/mandtech/image/upload/v1/products/sullair-185.jpg'
),
(
  'Electric Power Dry E-40',
  'Air Dryers', 'Kaeser', 'Electric', 40, NULL,
  '[{"label":"Electric Driven 400V","icon_name":"Zap"},{"label":"40 CFM Low Noise","icon_name":"Activity"},{"label":"Zero Emissions","icon_name":"Shield"}]',
  'https://res.cloudinary.com/mandtech/image/upload/v1/products/kaeser-e40.jpg'
),
(
  'Mandtech Titan X-120',
  'Air Compressors', 'Sullair', 'Diesel Driven', 120, 'FEATURED',
  '[{"label":"120 CFM, Diesel Driven","icon_name":"Activity"},{"label":"Site-Ready Portable","icon_name":"Settings"},{"label":"Extended Runtime","icon_name":"Shield"}]',
  'https://res.cloudinary.com/mandtech/image/upload/v1/products/titan-x120.jpg'
),
(
  'High-Capacity Pump V9',
  'Pumps', 'Ingersoll Rand', 'Diesel Driven', 900, NULL,
  '[{"label":"900 GPM Flow Rate","icon_name":"Activity"},{"label":"Corrosion Resistant","icon_name":"Settings"},{"label":"High Torque Diesel","icon_name":"Zap"}]',
  'https://res.cloudinary.com/mandtech/image/upload/v1/products/pump-v9.jpg'
),
(
  'Sullair 375 Tier 4',
  'Air Compressors', 'Sullair', 'Diesel Driven', 375, NULL,
  '[{"label":"375 CFM Capacity","icon_name":"Activity"},{"label":"Emission Compliant","icon_name":"Shield"},{"label":"Smart Monitoring","icon_name":"Settings"}]',
  'https://res.cloudinary.com/mandtech/image/upload/v1/products/sullair-375.jpg'
),
(
  'DryLine Industrial S',
  'Air Dryers', 'Atlas Copco', 'Electric', 600, NULL,
  '[{"label":"Desiccant Drying","icon_name":"Shield"},{"label":"Electric 230V/400V","icon_name":"Zap"},{"label":"Variable Flow Rate","icon_name":"Activity"}]',
  'https://res.cloudinary.com/mandtech/image/upload/v1/products/dryline-s.jpg'
),
(
  'Atlas Copco GA-160',
  'Air Compressors', 'Atlas Copco', 'Electric', 800, 'IN STOCK',
  '[{"label":"160 kW Rotary Screw","icon_name":"Activity"},{"label":"Variable Speed Electric","icon_name":"Zap"},{"label":"Remote Monitoring","icon_name":"Shield"}]',
  'https://res.cloudinary.com/mandtech/image/upload/v1/products/ac-ga160.jpg'
),
(
  'Prime Power 500 kVA',
  'Generators', 'Ingersoll Rand', 'Diesel Driven', 500, NULL,
  '[{"label":"500 kVA Prime Output","icon_name":"Zap"},{"label":"Low-Consumption Diesel","icon_name":"Activity"},{"label":"Sound-Attenuated Shell","icon_name":"Shield"}]',
  'https://res.cloudinary.com/mandtech/image/upload/v1/products/prime-500kva.jpg'
);

-- ============================================================
--  PARTS (Spare Parts Catalog)
-- ============================================================
INSERT INTO parts (title, category, brand, sku, compatibility, condition, badge, image_url) VALUES
(
  'High-Pressure Oil Filter',
  'Air Filtration', 'Sullair', 'SL-98230-XP',
  'LS Series, 16-25 Series Compressors',
  'New OEM', 'IN STOCK',
  'https://res.cloudinary.com/mandtech/image/upload/v1/parts/oil-filter.jpg'
),
(
  'Digital Pressure Sensor',
  'Control Systems', 'Ingersoll Rand', 'IR-PG-400X',
  'SSR/M Series Rotary Screw',
  'New OEM', 'IN STOCK',
  'https://res.cloudinary.com/mandtech/image/upload/v1/parts/pressure-sensor.jpg'
),
(
  'Thermal Control Valve',
  'Control Systems', 'Atlas Copco', 'AC-TCV-772',
  'GA VSD+ Series Compressors',
  'New OEM', 'LOW STOCK',
  'https://res.cloudinary.com/mandtech/image/upload/v1/parts/thermal-valve.jpg'
),
(
  'Service Overhaul Gasket Kit',
  'Mechanical Gaskets', 'Sullair', 'MK-GSKT-KIT-V2',
  'Universal 2-Stage Air Ends',
  'New OEM', 'IN STOCK',
  'https://res.cloudinary.com/mandtech/image/upload/v1/parts/gasket-kit.jpg'
),
(
  'Reinforced Cooling Fan',
  'Mechanical Gaskets', 'Sullair', 'SL-FAN-0098',
  'TS Series, LS Series Compressors',
  'New OEM', 'IN STOCK',
  'https://res.cloudinary.com/mandtech/image/upload/v1/parts/cooling-fan.jpg'
),
(
  'Heavy-Duty Pressure Switch',
  'Electrical Spares', 'Kaeser', 'KS-PSW-300',
  'BSD, CSD, DSD Compressor Units',
  'Refurbished', 'REFURBISHED AVAILABLE',
  'https://res.cloudinary.com/mandtech/image/upload/v1/parts/pressure-switch.jpg'
);

-- ============================================================
--  TECHNICAL LIBRARY DOCUMENTS
-- ============================================================
INSERT INTO documents (title, file_url, file_size, read_duration, icon_emoji) VALUES
(
  'Daily Air Compressor Field Checklist',
  'https://res.cloudinary.com/mandtech/raw/upload/v1/docs/air-compressor-checklist.pdf',
  'PDF (2.4 MB)', '5 min read', '📋'
),
(
  'Standard Operating Procedures: Kaeser Dryer Lines',
  'https://res.cloudinary.com/mandtech/raw/upload/v1/docs/kaeser-dryer-sop.pdf',
  'PDF (4.8 MB)', '12 min read', '📖'
),
(
  'Emergency Troubleshooting for Generator Overheating',
  'https://res.cloudinary.com/mandtech/raw/upload/v1/docs/generator-emergency-guide.pdf',
  'PDF (1.2 MB)', '8 min read', '⚠️'
);
