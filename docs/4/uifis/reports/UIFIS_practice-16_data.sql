-- UIFIS practice 16: small order and material dataset for SQLite
PRAGMA foreign_keys = ON;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS norms;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS materials;
DROP TABLE IF EXISTS products;

CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price REAL NOT NULL CHECK (price >= 0)
);
CREATE TABLE materials (
  material_id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price REAL NOT NULL CHECK (price >= 0)
);
CREATE TABLE norms (
  product_id INTEGER NOT NULL REFERENCES products(product_id),
  material_id INTEGER NOT NULL REFERENCES materials(material_id),
  qty REAL NOT NULL CHECK (qty > 0),
  PRIMARY KEY (product_id, material_id)
);
CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  customer TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('new', 'paid', 'done'))
);
CREATE TABLE order_items (
  order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(product_id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  PRIMARY KEY (order_id, product_id)
);

INSERT INTO products VALUES
  (1, 'P-01', 'Стеллаж', 12000),
  (2, 'P-02', 'Стол', 8000),
  (3, 'P-03', 'Шкаф', 15000),
  (4, 'P-04', 'Полка', 3500);
INSERT INTO materials VALUES
  (1, 'M-01', 'Металл', 450),
  (2, 'M-02', 'Дерево', 700),
  (3, 'M-03', 'Краска', 300),
  (4, 'M-04', 'Крепёж', 120);
INSERT INTO norms VALUES
  (1, 1, 8), (1, 2, 2), (1, 4, 20),
  (2, 2, 4), (2, 4, 12),
  (3, 2, 6), (3, 1, 2), (3, 4, 30),
  (4, 2, 1), (4, 4, 4);
INSERT INTO orders VALUES
  (1, 'ООО Альфа', '2026-09-01', 'paid'),
  (2, 'ООО Бета', '2026-09-02', 'new'),
  (3, 'Колледж', '2026-09-02', 'done'),
  (4, 'ИП Волков', '2026-09-03', 'paid'),
  (5, 'ООО Альфа', '2026-09-04', 'new');
INSERT INTO order_items VALUES
  (1, 1, 2), (1, 2, 4),
  (2, 3, 1), (2, 4, 6),
  (3, 1, 1), (3, 2, 2),
  (4, 2, 8),
  (5, 3, 2), (5, 4, 10);
