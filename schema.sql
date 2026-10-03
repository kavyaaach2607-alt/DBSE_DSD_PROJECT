-- ============================================================
-- Inventory and Warehouse Management System - MySQL Schema
-- ============================================================
DROP DATABASE IF EXISTS inventory_warehouse_db;
CREATE DATABASE inventory_warehouse_db;
USE inventory_warehouse_db;

-- ---------------------------------------------------------
-- USERS (system users: admin / staff)
-- ---------------------------------------------------------
CREATE TABLE users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            ENUM('admin','manager','staff') NOT NULL DEFAULT 'staff',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------
CREATE TABLE categories (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     VARCHAR(255)
);

-- ---------------------------------------------------------
-- SUPPLIERS
-- ---------------------------------------------------------
CREATE TABLE suppliers (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    contact_person  VARCHAR(100),
    email           VARCHAR(150),
    phone           VARCHAR(20),
    address         VARCHAR(255),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- WAREHOUSES
-- ---------------------------------------------------------
CREATE TABLE warehouses (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    location        VARCHAR(255) NOT NULL,
    capacity        INT NOT NULL DEFAULT 0,
    manager_name    VARCHAR(100),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------
CREATE TABLE products (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    sku                 VARCHAR(50) NOT NULL UNIQUE,
    name                VARCHAR(150) NOT NULL,
    category_id         INT,
    supplier_id         INT,
    unit_price          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    reorder_level       INT NOT NULL DEFAULT 10,      -- threshold that triggers low-stock alert
    reorder_quantity    INT NOT NULL DEFAULT 50,       -- suggested quantity to reorder
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------
-- INVENTORY (stock of each product per warehouse)
-- ---------------------------------------------------------
CREATE TABLE inventory (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    product_id      INT NOT NULL,
    warehouse_id    INT NOT NULL,
    quantity        INT NOT NULL DEFAULT 0,
    last_updated    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_product_warehouse (product_id, warehouse_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- TRANSACTIONS (stock IN / OUT / TRANSFER / ADJUSTMENT)
-- ---------------------------------------------------------
CREATE TABLE transactions (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    product_id              INT NOT NULL,
    warehouse_id            INT NOT NULL,
    transaction_type        ENUM('IN','OUT','TRANSFER','ADJUSTMENT') NOT NULL,
    quantity                INT NOT NULL,
    destination_warehouse_id INT NULL,                 -- used only for TRANSFER
    reference_no            VARCHAR(50),
    performed_by            INT,
    notes                   VARCHAR(255),
    transaction_date        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (destination_warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------
-- PURCHASE ORDERS (restocking from suppliers)
-- ---------------------------------------------------------
CREATE TABLE purchase_orders (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id     INT NOT NULL,
    product_id      INT NOT NULL,
    warehouse_id    INT NOT NULL,
    quantity        INT NOT NULL,
    status          ENUM('PENDING','APPROVED','RECEIVED','CANCELLED') DEFAULT 'PENDING',
    order_date      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_date   DATE,
    received_date   DATE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- STOCK ALERTS (auto-generated, consumed by AI/reporting layer)
-- ---------------------------------------------------------
CREATE TABLE stock_alerts (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    product_id      INT NOT NULL,
    warehouse_id    INT NOT NULL,
    alert_type      ENUM('LOW_STOCK','OUT_OF_STOCK','OVERSTOCK') NOT NULL,
    message         VARCHAR(255),
    is_resolved     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- SALES HISTORY (feeds the Python/Scikit-learn forecasting model)
-- ---------------------------------------------------------
CREATE TABLE sales_history (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    product_id      INT NOT NULL,
    warehouse_id    INT NOT NULL,
    sale_date       DATE NOT NULL,
    quantity_sold   INT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);

-- Helpful indexes
CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_warehouse ON inventory(warehouse_id);
CREATE INDEX idx_transactions_product ON transactions(product_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_sales_history_product_date ON sales_history(product_id, sale_date);

-- ============================================================
-- VIEWS
-- ============================================================

-- Current stock per product across all warehouses
CREATE OR REPLACE VIEW vw_current_stock AS
SELECT
    p.id AS product_id,
    p.sku,
    p.name AS product_name,
    w.id AS warehouse_id,
    w.name AS warehouse_name,
    i.quantity,
    p.reorder_level,
    p.unit_price,
    (i.quantity * p.unit_price) AS stock_value
FROM inventory i
JOIN products p ON p.id = i.product_id
JOIN warehouses w ON w.id = i.warehouse_id;

-- Products currently at/below reorder level (low stock)
CREATE OR REPLACE VIEW vw_low_stock AS
SELECT * FROM vw_current_stock
WHERE quantity <= reorder_level;

-- Total inventory valuation per warehouse
CREATE OR REPLACE VIEW vw_warehouse_valuation AS
SELECT
    w.id AS warehouse_id,
    w.name AS warehouse_name,
    SUM(i.quantity) AS total_units,
    SUM(i.quantity * p.unit_price) AS total_value
FROM warehouses w
LEFT JOIN inventory i ON i.warehouse_id = w.id
LEFT JOIN products p ON p.id = i.product_id
GROUP BY w.id, w.name;

-- ============================================================
-- TRIGGERS
-- ============================================================
DELIMITER //

-- Keep inventory in sync whenever a transaction is inserted
CREATE TRIGGER trg_after_transaction_insert
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
    IF NEW.transaction_type = 'IN' THEN
        INSERT INTO inventory (product_id, warehouse_id, quantity)
        VALUES (NEW.product_id, NEW.warehouse_id, NEW.quantity)
        ON DUPLICATE KEY UPDATE quantity = quantity + NEW.quantity;

    ELSEIF NEW.transaction_type = 'OUT' THEN
        UPDATE inventory
        SET quantity = GREATEST(quantity - NEW.quantity, 0)
        WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id;

    ELSEIF NEW.transaction_type = 'ADJUSTMENT' THEN
        INSERT INTO inventory (product_id, warehouse_id, quantity)
        VALUES (NEW.product_id, NEW.warehouse_id, NEW.quantity)
        ON DUPLICATE KEY UPDATE quantity = NEW.quantity;

    ELSEIF NEW.transaction_type = 'TRANSFER' THEN
        UPDATE inventory
        SET quantity = GREATEST(quantity - NEW.quantity, 0)
        WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id;

        INSERT INTO inventory (product_id, warehouse_id, quantity)
        VALUES (NEW.product_id, NEW.destination_warehouse_id, NEW.quantity)
        ON DUPLICATE KEY UPDATE quantity = quantity + NEW.quantity;
    END IF;
END//

-- Auto-create a low stock / out of stock alert after inventory changes
CREATE TRIGGER trg_after_inventory_update
AFTER UPDATE ON inventory
FOR EACH ROW
BEGIN
    DECLARE p_reorder_level INT;
    SELECT reorder_level INTO p_reorder_level FROM products WHERE id = NEW.product_id;

    IF NEW.quantity = 0 THEN
        INSERT INTO stock_alerts (product_id, warehouse_id, alert_type, message)
        VALUES (NEW.product_id, NEW.warehouse_id, 'OUT_OF_STOCK', 'Product is out of stock.');
    ELSEIF NEW.quantity <= p_reorder_level THEN
        INSERT INTO stock_alerts (product_id, warehouse_id, alert_type, message)
        VALUES (NEW.product_id, NEW.warehouse_id, 'LOW_STOCK', 'Stock at or below reorder level.');
    END IF;
END//

DELIMITER ;

-- ============================================================
-- STORED PROCEDURE: safely record a stock transaction
-- ============================================================
DELIMITER //
CREATE PROCEDURE sp_add_transaction (
    IN p_product_id INT,
    IN p_warehouse_id INT,
    IN p_type VARCHAR(20),
    IN p_quantity INT,
    IN p_destination_warehouse_id INT,
    IN p_reference_no VARCHAR(50),
    IN p_performed_by INT,
    IN p_notes VARCHAR(255)
)
BEGIN
    INSERT INTO transactions (
        product_id, warehouse_id, transaction_type, quantity,
        destination_warehouse_id, reference_no, performed_by, notes
    ) VALUES (
        p_product_id, p_warehouse_id, p_type, p_quantity,
        p_destination_warehouse_id, p_reference_no, p_performed_by, p_notes
    );
END//
DELIMITER ;
