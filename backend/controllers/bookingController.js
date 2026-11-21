const db = require('../config/db');

/**
 * Format time string HH:MM:SS or HH:MM to standard HH:MM:SS
 */
function normalizeTime(t) {
  if (!t) return '00:00:00';
  const parts = t.trim().split(':');
  const hh = parts[0].padStart(2, '0');
  const mm = (parts[1] || '00').padStart(2, '0');
  const ss = (parts[2] || '00').padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * Check slot availability for a turf on a specific date
 */
async function checkAvailability(req, res) {
  try {
    const { turf_id, date } = req.query;

    if (!turf_id || !date) {
      return res.status(400).json({
        success: false,
        error: 'Both turf_id and date query parameters are required.'
      });
    }

    const turfId = parseInt(turf_id, 10);
    if (isNaN(turfId)) {
      return res.status(400).json({ success: false, error: 'Invalid turf_id.' });
    }

    // Get turf info
    const turfs = await db.query('SELECT turf_id, turf_name, price FROM TURF WHERE turf_id = ?', [turfId]);
    if (turfs.length === 0) {
      return res.status(404).json({ success: false, error: 'Turf not found.' });
    }

    // Query active bookings for the specified turf and date
    const bookedRows = await db.query(
      `SELECT booking_id, booking_time, duration, status
       FROM BOOKING
       WHERE turf_id = ? AND booking_date = ? AND status != 'CANCELLED'
       ORDER BY booking_time ASC`,
      [turfId, date]
    );

    // Standard hours operating from 06:00 to 22:00 (1-hour slots)
    const operationalHours = [];
    for (let hour = 6; hour <= 22; hour++) {
      const slotTime = `${hour.toString().padStart(2, '0')}:00:00`;
      const slotEndHour = hour + 1;
      const slotEndTime = `${slotEndHour.toString().padStart(2, '0')}:00:00`;

      // Check if this 1-hour slot conflicts with any existing booking
      let isBooked = false;
      let matchedBooking = null;

      for (const b of bookedRows) {
        const bStartParts = b.booking_time.split(':').map(Number);
        const bStartMinutes = bStartParts[0] * 60 + bStartParts[1];
        const bEndMinutes = bStartMinutes + b.duration * 60;

        const slotStartMinutes = hour * 60;
        const slotEndMinutes = (hour + 1) * 60;

        // Overlap condition: slotStart < bEnd AND slotEnd > bStart
        if (slotStartMinutes < bEndMinutes && slotEndMinutes > bStartMinutes) {
          isBooked = true;
          matchedBooking = {
            booking_id: b.booking_id,
            status: b.status,
            booked_start: b.booking_time,
            duration: b.duration
          };
          break;
        }
      }

      operationalHours.push({
        time: slotTime,
        label: `${hour.toString().padStart(2, '0')}:00 - ${slotEndHour.toString().padStart(2, '0')}:00`,
        hour,
        available: !isBooked,
        booking: matchedBooking
      });
    }

    return res.json({
      success: true,
      turf: turfs[0],
      date,
      slots: operationalHours,
      existingBookingsCount: bookedRows.length
    });
  } catch (err) {
    console.error('Error checking availability:', err);
    return res.status(500).json({ success: false, error: 'Failed to check slot availability: ' + err.message });
  }
}

/**
 * Create a new booking with ACID transaction and strict overlapping slot prevention
 */
async function createBooking(req, res) {
  try {
    const { turf_id, booking_date, booking_time, duration } = req.body;
    const customer_id = req.session.user.id; // From customer session

    // 1. Parameter Validation
    if (!turf_id || !booking_date || !booking_time) {
      return res.status(400).json({
        success: false,
        error: 'Turf, date, and start time are required.'
      });
    }

    const turfId = parseInt(turf_id, 10);
    const numDuration = parseInt(duration, 10) || 1;

    if (isNaN(turfId)) {
      return res.status(400).json({ success: false, error: 'Invalid turf selection.' });
    }

    if (numDuration < 1 || numDuration > 4) {
      return res.status(400).json({ success: false, error: 'Duration must be between 1 and 4 hours.' });
    }

    const startTimeNormalized = normalizeTime(booking_time);

    // Validate that booking is not in the past
    const today = new Date().toISOString().split('T')[0];
    if (booking_date < today) {
      return res.status(400).json({ success: false, error: 'Cannot book slots on a past date.' });
    }

    // 2. Perform Concurrency-Safe Transaction
    const bookingResult = await db.withTransaction(async (conn) => {
      // Step A: Lock and verify turf existence and pricing
      const [turfs] = await conn.query('SELECT turf_id, turf_name, price FROM TURF WHERE turf_id = ? FOR UPDATE', [turfId]);
      if (turfs.length === 0) {
        throw new Error('Selected turf does not exist.');
      }
      const turf = turfs[0];
      const hourlyPrice = parseFloat(turf.price);
      const totalAmount = (hourlyPrice * numDuration).toFixed(2);

      // Step B: Lock and check conflicting bookings for this turf and date
      // Interval overlap logic in SQL:
      // Requested interval: [startTimeNormalized, startTimeNormalized + numDuration hours]
      // Conflicting interval: [b.booking_time, b.booking_time + b.duration hours]
      // Overlap condition: (requested_start < existing_end) AND (requested_end > existing_start)
      const durationSeconds = numDuration * 3600;

      const [conflicts] = await conn.query(
        `SELECT booking_id, booking_time, duration, status
         FROM BOOKING
         WHERE turf_id = ?
           AND booking_date = ?
           AND status != 'CANCELLED'
           AND (
             ? < ADDTIME(booking_time, SEC_TO_TIME(duration * 3600))
             AND ADDTIME(?, SEC_TO_TIME(?)) > booking_time
           )
         FOR UPDATE`,
        [turfId, booking_date, startTimeNormalized, startTimeNormalized, durationSeconds]
      );

      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        const conflictErr = new Error(`Slot collision: The requested slot (${startTimeNormalized} for ${numDuration}h) overlaps with an existing booking (#${conflict.booking_id} at ${conflict.booking_time} for ${conflict.duration}h).`);
        conflictErr.statusCode = 409;
        throw conflictErr;
      }

      // Step C: Insert Booking record
      const [insertBookingResult] = await conn.query(
        `INSERT INTO BOOKING (customer_id, turf_id, booking_date, booking_time, duration, status, total_amount)
         VALUES (?, ?, ?, ?, ?, 'CONFIRMED', ?)`,
        [customer_id, turfId, booking_date, startTimeNormalized, numDuration, totalAmount]
      );

      const newBookingId = insertBookingResult.insertId;

      // Step D: Insert matching Payment record (Preserving synopsis entity relationship)
      const [insertPaymentResult] = await conn.query(
        `INSERT INTO PAYMENT (booking_id, amount, payment_status, payment_date)
         VALUES (?, ?, 'PAID', NOW())`,
        [newBookingId, totalAmount]
      );

      return {
        booking_id: newBookingId,
        payment_id: insertPaymentResult.insertId,
        turf_name: turf.turf_name,
        booking_date,
        booking_time: startTimeNormalized,
        duration: numDuration,
        total_amount: totalAmount,
        status: 'CONFIRMED'
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully!',
      booking: bookingResult
    });
  } catch (err) {
    console.error('Booking Creation Error:', err);
    const statusCode = err.statusCode || (err.message.includes('Slot collision') ? 409 : 500);
    return res.status(statusCode).json({
      success: false,
      error: err.message || 'Failed to complete booking.'
    });
  }
}

/**
 * Get bookings for the currently logged in customer
 */
async function getCustomerBookings(req, res) {
  try {
    const customer_id = req.session.user.id;

    const sql = `
      SELECT 
        b.booking_id,
        b.booking_date,
        b.booking_time,
        b.duration,
        b.status,
        b.total_amount,
        b.created_at,
        t.turf_name,
        t.location,
        t.price AS hourly_price,
        p.payment_id,
        p.payment_status,
        p.payment_date
      FROM BOOKING b
      INNER JOIN TURF t ON b.turf_id = t.turf_id
      LEFT JOIN PAYMENT p ON b.booking_id = p.booking_id
      WHERE b.customer_id = ?
      ORDER BY b.booking_date DESC, b.booking_time DESC
    `;

    const bookings = await db.query(sql, [customer_id]);
    return res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    console.error('Error fetching customer bookings:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve bookings: ' + err.message });
  }
}

/**
 * Cancel booking by customer
 */
async function cancelBooking(req, res) {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const customerId = req.session.user.id;

    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, error: 'Invalid booking ID.' });
    }

    const rows = await db.query(
      'SELECT booking_id, status, booking_date FROM BOOKING WHERE booking_id = ? AND customer_id = ?',
      [bookingId, customerId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found or unauthorized.' });
    }

    const booking = rows[0];
    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ success: false, error: 'Booking is already cancelled.' });
    }

    // Atomic cancellation and payment refund update
    await db.withTransaction(async (conn) => {
      await conn.query('UPDATE BOOKING SET status = "CANCELLED" WHERE booking_id = ?', [bookingId]);
      await conn.query('UPDATE PAYMENT SET payment_status = "REFUNDED" WHERE booking_id = ?', [bookingId]);
    });

    return res.json({
      success: true,
      message: 'Booking cancelled successfully. Payment marked as refunded.'
    });
  } catch (err) {
    console.error('Error cancelling booking:', err);
    return res.status(500).json({ success: false, error: 'Failed to cancel booking: ' + err.message });
  }
}

/**
 * Get all bookings (Manager only) with filters for date, turf, status
 */
async function getAllBookings(req, res) {
  try {
    const { date, turf_id, status } = req.query;

    let sql = `
      SELECT 
        b.booking_id,
        b.customer_id,
        c.name AS customer_name,
        c.email AS customer_email,
        c.phone AS customer_phone,
        b.turf_id,
        t.turf_name,
        t.location,
        b.booking_date,
        b.booking_time,
        b.duration,
        b.status,
        b.total_amount,
        b.created_at,
        p.payment_id,
        p.payment_status,
        p.amount AS payment_amount
      FROM BOOKING b
      INNER JOIN CUSTOMER c ON b.customer_id = c.customer_id
      INNER JOIN TURF t ON b.turf_id = t.turf_id
      LEFT JOIN PAYMENT p ON b.booking_id = p.booking_id
      WHERE 1=1
    `;
    const params = [];

    if (date && date.trim()) {
      sql += ' AND b.booking_date = ?';
      params.push(date.trim());
    }

    if (turf_id && turf_id.trim()) {
      sql += ' AND b.turf_id = ?';
      params.push(parseInt(turf_id.trim(), 10));
    }

    if (status && status.trim()) {
      sql += ' AND b.status = ?';
      params.push(status.trim().toUpperCase());
    }

    sql += ' ORDER BY b.booking_date DESC, b.booking_time DESC';

    const bookings = await db.query(sql, params);
    return res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    console.error('Error fetching manager bookings:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve all bookings: ' + err.message });
  }
}

/**
 * Update booking status (Manager only)
 */
async function updateBookingStatus(req, res) {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, error: 'Invalid booking ID.' });
    }

    const validStatuses = ['CONFIRMED', 'CANCELLED', 'COMPLETED', 'PENDING'];
    if (!status || !validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const newStatus = status.toUpperCase();

    await db.withTransaction(async (conn) => {
      await conn.query('UPDATE BOOKING SET status = ? WHERE booking_id = ?', [newStatus, bookingId]);
      if (newStatus === 'CANCELLED') {
        await conn.query('UPDATE PAYMENT SET payment_status = "REFUNDED" WHERE booking_id = ?', [bookingId]);
      } else if (newStatus === 'COMPLETED' || newStatus === 'CONFIRMED') {
        await conn.query('UPDATE PAYMENT SET payment_status = "PAID" WHERE booking_id = ?', [bookingId]);
      }
    });

    return res.json({
      success: true,
      message: `Booking #${bookingId} status updated to ${newStatus}.`
    });
  } catch (err) {
    console.error('Error updating booking status:', err);
    return res.status(500).json({ success: false, error: 'Failed to update status: ' + err.message });
  }
}

module.exports = {
  checkAvailability,
  createBooking,
  getCustomerBookings,
  cancelBooking,
  getAllBookings,
  updateBookingStatus
};
