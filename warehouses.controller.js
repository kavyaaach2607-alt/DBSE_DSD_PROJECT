const pool = require('../config/db');

async function getAll(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM warehouses ORDER BY id');
    res.json(rows);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM warehouses WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Warehouse not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { name, location, capacity, manager_name } = req.body;
    if (!name || !location) return res.status(400).json({ message: 'name and location are required' });
    const [result] = await pool.query(
      'INSERT INTO warehouses (name, location, capacity, manager_name) VALUES (?, ?, ?, ?)',
      [name, location, capacity || 0, manager_name || null]
    );
    res.status(201).json({ id: result.insertId, name, location });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { name, location, capacity, manager_name } = req.body;
    const [result] = await pool.query(
      `UPDATE warehouses SET name = COALESCE(?, name), location = COALESCE(?, location),
       capacity = COALESCE(?, capacity), manager_name = COALESCE(?, manager_name) WHERE id = ?`,
      [name, location, capacity, manager_name, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Warehouse not found' });
    res.json({ message: 'Warehouse updated' });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const [result] = await pool.query('DELETE FROM warehouses WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Warehouse not found' });
    res.json({ message: 'Warehouse deleted' });
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, create, update, remove };
