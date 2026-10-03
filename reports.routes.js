const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reports.controller');
const { authenticate } = require('../middleware/auth');

router.get('/warehouse-valuation', authenticate, ctrl.warehouseValuation);
router.get('/stock-summary', authenticate, ctrl.stockSummary);
router.get('/transaction-summary', authenticate, ctrl.transactionSummary);
router.get('/sales-history/:productId', authenticate, ctrl.salesHistoryByProduct);

module.exports = router;
