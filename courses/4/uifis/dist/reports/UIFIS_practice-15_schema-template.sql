-- UIFIS practice 15: schema template for SQLite
PRAGMA foreign_keys = ON;

CREATE TABLE clients (
  client_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT
);

CREATE TABLE equipment (
  equipment_id INTEGER PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(client_id) ON DELETE RESTRICT,
  model TEXT NOT NULL,
  serial_no TEXT NOT NULL UNIQUE
);

CREATE TABLE requests (
  request_id INTEGER PRIMARY KEY,
  equipment_id INTEGER NOT NULL REFERENCES equipment(equipment_id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('new', 'in_progress', 'done', 'cancelled')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high'))
);

CREATE TABLE works (
  work_id INTEGER PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES requests(request_id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  hours REAL NOT NULL CHECK (hours > 0),
  cost REAL NOT NULL CHECK (cost >= 0)
);

CREATE TABLE parts (
  part_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL CHECK (stock >= 0)
);

CREATE TABLE usage (
  usage_id INTEGER PRIMARY KEY,
  work_id INTEGER NOT NULL REFERENCES works(work_id) ON DELETE CASCADE,
  part_id INTEGER NOT NULL REFERENCES parts(part_id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL CHECK (qty > 0),
  UNIQUE (work_id, part_id)
);

CREATE INDEX idx_requests_equipment ON requests(equipment_id);
CREATE INDEX idx_works_request ON works(request_id);
CREATE INDEX idx_usage_work ON usage(work_id);
