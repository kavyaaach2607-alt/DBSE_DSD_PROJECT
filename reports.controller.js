const pool = require('../config/db');

async function warehouseValuation(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM vw_warehouse_valuation');
    res.json(rows);
  } catch (err) { next(err); }
}

async function stockSummary(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT p.id, p.sku, p.name, p.reorder_level,
             COALESCE(SUM(i.quantity), 0) AS total_stock,
             COUNT(DISTINCT i.warehouse_id) AS warehouses_stocked
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id
      GROUP BY p.id, p.sku, p.name, p.reorder_level
      ORDER BY total_stock ASC
    `);
    res.json(rows);
  } catch (err) { next(err); }
}

async function transactionSummary(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT transaction_type, COUNT(*) AS count, SUM(quantity) AS total_quantity
      FROM transactions
      WHERE transaction_date >= (CURDATE() - INTERVAL 30 DAY)
      GROUP BY transaction_type
    `);
    res.json(rows);
  } catch (err) { next(err); }
}

async function salesHistoryByProduct(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT sale_date, quantity_sold FROM sales_history WHERE product_id = ? ORDER BY sale_date',
      [req.params.productId]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

module.exports = { warehouseValuation, stockSummary, transactionSummary, salesHistoryByProduct };
