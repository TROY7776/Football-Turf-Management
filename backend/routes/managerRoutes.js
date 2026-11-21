const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');
const { requireManagerAuth } = require('../middleware/auth');

// All manager metrics and reports require manager auth
router.use(requireManagerAuth);

router.get('/stats', managerController.getDashboardStats);
router.get('/customers', managerController.getCustomers);
router.get('/usage-report', managerController.getTurfUsageReport);

module.exports = router;
