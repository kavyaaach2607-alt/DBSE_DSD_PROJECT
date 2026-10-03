const pool = require('../config/db');

async function getAll(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, c.name AS category_name, s.name AS supplier_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       ORDER BY p.id DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Product not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { sku, name, category_id, supplier_id, unit_price, reorder_level, reorder_quantity } = req.body;
    if (!sku || !name) return res.status(400).json({ message: 'sku and name are required' });
    const [result] = await pool.query(
      `INSERT INTO products (sku, name, category_id, supplier_id, unit_price, reorder_level, reorder_quantity)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sku, name, category_id || null, supplier_id || null, unit_price || 0, reorder_level || 10, reorder_quantity || 50]
    );
    res.status(201).json({ id: result.insertId, sku, name });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { name, category_id, supplier_id, unit_price, reorder_level, reorder_quantity } = req.body;
    const [result] = await pool.query(
      `UPDATE products SET name = COALESCE(?, name), category_id = ?, supplier_id = ?,
       unit_price = COALESCE(?, unit_price), reorder_level = COALESCE(?, reorder_level),
       reorder_quantity = COALESCE(?, reorder_quantity) WHERE id = ?`,
      [name, category_id, supplier_id, unit_price, reorder_level, reorder_quantity, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product updated' });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, create, update, remove };
