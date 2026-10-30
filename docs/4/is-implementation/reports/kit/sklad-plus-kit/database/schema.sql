-- Учебная схема «Склад+» для MySQL в XAMPP.
-- База создаётся отдельно: CREATE DATABASE sklad_plus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE sklad_plus;

CREATE TABLE counterparty (
  id VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  inn VARCHAR(20) NOT NULL,
  address VARCHAR(500) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  party_type VARCHAR(24) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE item (
  id INT AUTO_INCREMENT NOT NULL,
  code VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  unit VARCHAR(16) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT ck_item_kind CHECK (kind IN ('product','material','operation'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE price (
  item_id INT NOT NULL,
  valid_from DATE NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  PRIMARY KEY (item_id, valid_from),
  CONSTRAINT fk_price_item FOREIGN KEY (item_id) REFERENCES item(id),
  CONSTRAINT ck_price_amount CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE warehouse (
  id INT AUTO_INCREMENT NOT NULL,
  code VARCHAR(16) UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL,
  address VARCHAR(300) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE stock (
  warehouse_id INT NOT NULL,
  item_id INT NOT NULL,
  qty DECIMAL(14,3) NOT NULL,
  reserved DECIMAL(14,3) NOT NULL DEFAULT 0,
  PRIMARY KEY (warehouse_id, item_id),
  CONSTRAINT fk_stock_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouse(id),
  CONSTRAINT fk_stock_item FOREIGN KEY (item_id) REFERENCES item(id),
  CONSTRAINT ck_stock_qty CHECK (qty >= 0),
  CONSTRAINT ck_stock_reserved CHECK (reserved >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE customer_order (
  id INT AUTO_INCREMENT NOT NULL,
  doc_no VARCHAR(64) UNIQUE NOT NULL,
  doc_date DATE NOT NULL,
  customer_id VARCHAR(32) NOT NULL,
  warehouse_id INT NOT NULL,
  status VARCHAR(32) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_order_customer FOREIGN KEY (customer_id) REFERENCES counterparty(id),
  CONSTRAINT fk_order_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouse(id),
  CONSTRAINT ck_order_status CHECK (status IN ('Новый','Подтверждён','Зарезервирован','Отгружен','Отменён'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE customer_order_line (
  id INT AUTO_INCREMENT NOT NULL,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  qty DECIMAL(14,3) NOT NULL,
  sale_price DECIMAL(14,2) NOT NULL,
  discount DECIMAL(14,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT fk_line_order FOREIGN KEY (order_id) REFERENCES customer_order(id),
  CONSTRAINT fk_line_product FOREIGN KEY (product_id) REFERENCES item(id),
  CONSTRAINT ck_line_qty CHECK (qty > 0),
  CONSTRAINT ck_line_price CHECK (sale_price >= 0),
  CONSTRAINT ck_line_discount CHECK (discount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE users (
  id INT AUTO_INCREMENT NOT NULL,
  login VARCHAR(64) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(16) NOT NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  CONSTRAINT ck_users_role CHECK (role IN ('admin','manager','storekeeper'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE notes (
  id INT AUTO_INCREMENT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  id_user INT NOT NULL,
  created_at DATE NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_notes_user FOREIGN KEY (id_user) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
