USE inventory_warehouse_db;

INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic components and gadgets'),
('Groceries', 'Packaged food and consumables'),
('Stationery', 'Office and school supplies'),
('Hardware', 'Tools and hardware equipment');

INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES
('TechSource Pvt Ltd', 'Ravi Kumar', 'ravi@techsource.com', '9876543210', 'Hyderabad, India'),
('Fresh Foods Distributors', 'Anita Rao', 'anita@freshfoods.com', '9876501234', 'Bengaluru, India'),
('OfficeMart Supplies', 'Vikram Singh', 'vikram@officemart.com', '9123456780', 'Chennai, India');

INSERT INTO warehouses (name, location, capacity, manager_name) VALUES
('Central Warehouse', 'Hyderabad', 10000, 'Suresh Menon'),
('North Depot', 'Delhi', 6000, 'Priya Nair'),
('South Hub', 'Chennai', 8000, 'Arjun Reddy');

INSERT INTO products (sku, name, category_id, supplier_id, unit_price, reorder_level, reorder_quantity) VALUES
('ELEC-001', 'USB-C Cable 1m', 1, 1, 149.00, 50, 200),
('ELEC-002', 'Wireless Mouse', 1, 1, 599.00, 30, 100),
('GROC-001', 'Basmati Rice 5kg', 2, 2, 450.00, 40, 150),
('GROC-002', 'Cooking Oil 1L', 2, 2, 180.00, 60, 200),
('STAT-001', 'A4 Paper Ream', 3, 3, 250.00, 25, 100),
('HARD-001', 'Cordless Drill', 4, 1, 2499.00, 10, 30);

-- Initial stock levels
INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES
(1, 1, 300), (1, 2, 80),
(2, 1, 150), (2, 3, 40),
(3, 1, 200), (3, 2, 60),
(4, 1, 250), (4, 3, 90),
(5, 2, 120), (5, 3, 20),
(6, 1, 45), (6, 2, 8);

-- Sample sales history for AI/ML demand forecasting (last ~30 days per product)
INSERT INTO sales_history (product_id, warehouse_id, sale_date, quantity_sold)
VALUES
(1,1,'2025-08-25',12),(1,1,'2025-08-26',15),(1,1,'2025-08-27',9),(1,1,'2025-08-28',18),
(1,1,'2025-08-29',20),(1,1,'2025-08-30',10),(1,1,'2025-08-31',14),
(2,1,'2025-08-25',5),(2,1,'2025-08-26',7),(2,1,'2025-08-27',6),(2,1,'2025-08-28',9),
(2,1,'2025-08-29',11),(2,1,'2025-08-30',8),(2,1,'2025-08-31',10),
(3,1,'2025-08-25',22),(3,1,'2025-08-26',19),(3,1,'2025-08-27',25),(3,1,'2025-08-28',30),
(3,1,'2025-08-29',28),(3,1,'2025-08-30',24),(3,1,'2025-08-31',26);
