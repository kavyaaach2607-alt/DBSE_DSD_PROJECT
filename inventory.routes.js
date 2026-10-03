const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventory.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getAll);
router.get('/low-stock', authenticate, ctrl.getLowStock);
router.get('/alerts', authenticate, ctrl.getAlerts);
router.patch('/alerts/:id/resolve', authenticate, ctrl.resolveAlert);

module.exports = router;
