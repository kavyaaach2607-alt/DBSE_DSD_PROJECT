const axios = require('axios');
const pool = require('../config/db');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Pulls sales history for a product from MySQL and sends it to the
// Python (Flask + Scikit-learn) microservice for demand prediction.
async function getReorderRecommendation(req, res, next) {
  try {
    const { productId } = req.params;

    const [salesRows] = await pool.query(
      'SELECT sale_date, quantity_sold FROM sales_history WHERE product_id = ? ORDER BY sale_date',
      [productId]
    );
    const [productRows] = await pool.query(
      'SELECT id, name, reorder_level, reorder_quantity FROM products WHERE id = ?',
      [productId]
    );
    if (productRows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const [stockRows] = await pool.query(
      'SELECT COALESCE(SUM(quantity),0) AS current_stock FROM inventory WHERE product_id = ?',
      [productId]
    );

    const payload = {
      product_id: Number(productId),
      current_stock: stockRows[0].current_stock,
      reorder_level: productRows[0].reorder_level,
      history: salesRows.map(r => ({ date: r.sale_date, quantity_sold: r.quantity_sold }))
    };

    const { data } = await axios.post(`${ML_URL}/predict/reorder`, payload, { timeout: 8000 });

    res.json({
      product: productRows[0],
      ...data
    });
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ message: 'ML forecasting service is unavailable' });
    }
    next(err);
  }
}

module.exports = { getReorderRecommendation };
