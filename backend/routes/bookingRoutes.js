const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { requireCustomerAuth, requireManagerAuth } = require('../middleware/auth');

// Public slot availability check
router.get('/availability', bookingController.checkAvailability);

// Customer booking operations
router.post('/', requireCustomerAuth, bookingController.createBooking);
router.get('/my-bookings', requireCustomerAuth, bookingController.getCustomerBookings);
router.put('/:id/cancel', requireCustomerAuth, bookingController.cancelBooking);

// Manager booking operations
router.get('/all', requireManagerAuth, bookingController.getAllBookings);
router.put('/:id/status', requireManagerAuth, bookingController.updateBookingStatus);

module.exports = router;
