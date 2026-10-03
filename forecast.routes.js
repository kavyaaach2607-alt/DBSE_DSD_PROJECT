const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/forecast.controller');
const { authenticate } = require('../middleware/auth');

router.get('/reorder/:productId', authenticate, ctrl.getReorderRecommendation);

module.exports = router;
