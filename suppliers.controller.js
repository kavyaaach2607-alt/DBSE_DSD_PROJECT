const pool = require('../config/db');

async function getAll(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM suppliers ORDER BY id');
    res.json(rows);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Supplier not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { name, contact_person, email, phone, address } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });
    const [result] = await pool.query(
      'INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?)',
      [name, contact_person || null, email || null, phone || null, address || null]
    );
    res.status(201).json({ id: result.insertId, name });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { name, contact_person, email, phone, address } = req.body;
    const [result] = await pool.query(
      `UPDATE suppliers SET name = COALESCE(?, name), contact_person = COALESCE(?, contact_person),
       email = COALESCE(?, email), phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE id = ?`,
      [name, contact_person, email, phone, address, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Supplier not found' });
    res.json({ message: 'Supplier updated' });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const [result] = await pool.query('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Supplier not found' });
    res.json({ message: 'Supplier deleted' });
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, create, update, remove };
