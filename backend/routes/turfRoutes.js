const express = require('express');
const router = express.Router();
const turfController = require('../controllers/turfController');
const { requireManagerAuth } = require('../middleware/auth');

// Public turf browsing
router.get('/', turfController.getAllTurfs);
router.get('/:id', turfController.getTurfById);

// Manager CRUD operations
router.post('/', requireManagerAuth, turfController.createTurf);
router.put('/:id', requireManagerAuth, turfController.updateTurf);
router.delete('/:id', requireManagerAuth, turfController.deleteTurf);

module.exports = router;
