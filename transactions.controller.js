const pool = require('../config/db');

const VALID_TYPES = ['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'];

async function getAll(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, p.name AS product_name, w.name AS warehouse_name,
              dw.name AS destination_warehouse_name, u.name AS performed_by_name
       FROM transactions t
       JOIN products p ON p.id = t.product_id
       JOIN warehouses w ON w.id = t.warehouse_id
       LEFT JOIN warehouses dw ON dw.id = t.destination_warehouse_id
       LEFT JOIN users u ON u.id = t.performed_by
       ORDER BY t.transaction_date DESC
       LIMIT 200`
    );
    res.json(rows);
  } catch (err) { next(err); }
}

// Records a transaction via the sp_add_transaction stored procedure.
// A trigger on the transactions table then updates the `inventory` table automatically.
async function create(req, res, next) {
  try {
    const {
      product_id, warehouse_id, transaction_type, quantity,
      destination_warehouse_id, reference_no, notes
    } = req.body;

    if (!product_id || !warehouse_id || !transaction_type || !quantity) {
      return res.status(400).json({ message: 'product_id, warehouse_id, transaction_type and quantity are required' });
    }
    if (!VALID_TYPES.includes(transaction_type)) {
      return res.status(400).json({ message: `transaction_type must be one of ${VALID_TYPES.join(', ')}` });
    }
    if (transaction_type === 'TRANSFER' && !destination_warehouse_id) {
      return res.status(400).json({ message: 'destination_warehouse_id is required for TRANSFER' });
    }

    const performedBy = req.user ? req.user.id : null;

    await pool.query(
      'CALL sp_add_transaction(?, ?, ?, ?, ?, ?, ?, ?)',
      [product_id, warehouse_id, transaction_type, quantity,
       destination_warehouse_id || null, reference_no || null, performedBy, notes || null]
    );

    res.status(201).json({ message: 'Transaction recorded and inventory updated' });
  } catch (err) { next(err); }
}

async function getByProduct(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM transactions WHERE product_id = ? ORDER BY transaction_date DESC',
      [req.params.productId]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

module.exports = { getAll, create, getByProduct };
