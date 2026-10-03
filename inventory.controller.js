const pool = require('../config/db');

async function getAll(req, res, next) {
  try {
    const { warehouse_id, product_id } = req.query;
    let sql = `SELECT * FROM vw_current_stock WHERE 1=1`;
    const params = [];
    if (warehouse_id) { sql += ' AND warehouse_id = ?'; params.push(warehouse_id); }
    if (product_id) { sql += ' AND product_id = ?'; params.push(product_id); }
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
}

async function getLowStock(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM vw_low_stock');
    res.json(rows);
  } catch (err) { next(err); }
}

async function getAlerts(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT sa.*, p.name AS product_name, w.name AS warehouse_name
       FROM stock_alerts sa
       JOIN products p ON p.id = sa.product_id
       JOIN warehouses w ON w.id = sa.warehouse_id
       WHERE sa.is_resolved = FALSE
       ORDER BY sa.created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
}

async function resolveAlert(req, res, next) {
  try {
    const [result] = await pool.query('UPDATE stock_alerts SET is_resolved = TRUE WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Alert not found' });
    res.json({ message: 'Alert resolved' });
  } catch (err) { next(err); }
}

module.exports = { getAll, getLowStock, getAlerts, resolveAlert };
