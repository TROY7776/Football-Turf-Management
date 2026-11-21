const db = require('../config/db');

/**
 * Get aggregated dashboard statistics
 */
async function getDashboardStats(req, res) {
  try {
    // 1. Total Customers
    const custResult = await db.query('SELECT COUNT(*) AS total_customers FROM CUSTOMER');
    const totalCustomers = custResult[0].total_customers;

    // 2. Total Turfs
    const turfResult = await db.query('SELECT COUNT(*) AS total_turfs FROM TURF');
    const totalTurfs = turfResult[0].total_turfs;

    // 3. Total Bookings
    const bookingResult = await db.query('SELECT COUNT(*) AS total_bookings FROM BOOKING');
    const totalBookings = bookingResult[0].total_bookings;

    // 4. Total Revenue (from completed/paid payments)
    const revResult = await db.query(
      "SELECT COALESCE(SUM(amount), 0) AS total_revenue FROM PAYMENT WHERE payment_status = 'PAID'"
    );
    const totalRevenue = parseFloat(revResult[0].total_revenue) || 0;

    // 5. Today's Bookings
    const todayResult = await db.query(
      "SELECT COUNT(*) AS today_bookings FROM BOOKING WHERE booking_date = date('now', 'localtime') AND status != 'CANCELLED'"
    );
    const todayBookings = todayResult[0].today_bookings;

    // 6. Status Breakdown (GROUP BY)
    const statusResult = await db.query(
      'SELECT status, COUNT(*) AS count FROM BOOKING GROUP BY status'
    );

    // 7. Recent 5 Bookings (INNER JOIN CUSTOMER and TURF)
    const recentBookings = await db.query(`
      SELECT 
        b.booking_id,
        b.booking_date,
        b.booking_time,
        b.duration,
        b.status,
        b.total_amount,
        c.name AS customer_name,
        c.email AS customer_email,
        t.turf_name,
        p.payment_status
      FROM BOOKING b
      INNER JOIN CUSTOMER c ON b.customer_id = c.customer_id
      INNER JOIN TURF t ON b.turf_id = t.turf_id
      LEFT JOIN PAYMENT p ON b.booking_id = p.booking_id
      ORDER BY b.booking_id DESC
      LIMIT 6
    `);

    return res.json({
      success: true,
      stats: {
        totalCustomers,
        totalTurfs,
        totalBookings,
        totalRevenue,
        todayBookings,
        statusBreakdown: statusResult,
        recentBookings
      }
    });
  } catch (err) {
    console.error('Error fetching manager dashboard stats:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve stats: ' + err.message });
  }
}

/**
 * Get customer records list with booking counts and spending
 */
async function getCustomers(req, res) {
  try {
    const sql = `
      SELECT 
        c.customer_id,
        c.name,
        c.email,
        c.phone,
        c.created_at,
        COUNT(b.booking_id) AS total_bookings,
        COALESCE(SUM(CASE WHEN b.status != 'CANCELLED' THEN b.total_amount ELSE 0 END), 0) AS total_spent
      FROM CUSTOMER c
      LEFT JOIN BOOKING b ON c.customer_id = b.customer_id
      GROUP BY c.customer_id, c.name, c.email, c.phone, c.created_at
      ORDER BY c.customer_id ASC
    `;

    const customers = await db.query(sql);
    return res.json({ success: true, count: customers.length, customers });
  } catch (err) {
    console.error('Error fetching customers:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve customers: ' + err.message });
  }
}

/**
 * Get turf usage and revenue report
 */
async function getTurfUsageReport(req, res) {
  try {
    const sql = `
      SELECT 
        t.turf_id,
        t.turf_name,
        t.location,
        t.price AS hourly_rate,
        COUNT(b.booking_id) AS total_bookings,
        COALESCE(SUM(CASE WHEN b.status != 'CANCELLED' THEN b.duration ELSE 0 END), 0) AS total_hours_booked,
        COALESCE(SUM(CASE WHEN p.payment_status = 'PAID' THEN p.amount ELSE 0 END), 0) AS total_revenue
      FROM TURF t
      LEFT JOIN BOOKING b ON t.turf_id = b.turf_id
      LEFT JOIN PAYMENT p ON b.booking_id = p.booking_id
      GROUP BY t.turf_id, t.turf_name, t.location, t.price
      ORDER BY total_revenue DESC, total_bookings DESC
    `;

    const report = await db.query(sql);
    return res.json({ success: true, count: report.length, report });
  } catch (err) {
    console.error('Error fetching usage report:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve usage report: ' + err.message });
  }
}

module.exports = {
  getDashboardStats,
  getCustomers,
  getTurfUsageReport
};
