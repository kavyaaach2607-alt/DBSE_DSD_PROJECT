const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/transactions.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getAll);
router.get('/product/:productId', authenticate, ctrl.getByProduct);
router.post('/', authenticate, ctrl.create);

module.exports = router;
