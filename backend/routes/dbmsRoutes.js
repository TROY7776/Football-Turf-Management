const express = require('express');
const router = express.Router();
const dbmsDemoController = require('../controllers/dbmsDemoController');
const { requireManagerAuth } = require('../middleware/auth');

// DBMS demonstration for college examiner (secured to managers or examiner review)
router.use(requireManagerAuth);

router.get('/overview', dbmsDemoController.getDatabaseOverview);
router.get('/table/:table', dbmsDemoController.getTableData);
router.post('/demo', dbmsDemoController.runSqlDemo);

module.exports = router;
