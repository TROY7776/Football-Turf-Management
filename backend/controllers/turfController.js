const db = require('../config/db');

/**
 * Get all turfs with optional search and location filter
 */
async function getAllTurfs(req, res) {
  try {
    const { search, location } = req.query;
    let sql = 'SELECT turf_id, turf_name, location, price, description, image_url, created_at FROM TURF WHERE 1=1';
    const params = [];

    if (search && search.trim()) {
      sql += ' AND (turf_name LIKE ? OR location LIKE ? OR description LIKE ?)';
      const keyword = `%${search.trim()}%`;
      params.push(keyword, keyword, keyword);
    }

    if (location && location.trim()) {
      sql += ' AND location LIKE ?';
      params.push(`%${location.trim()}%`);
    }

    sql += ' ORDER BY turf_id ASC';

    const turfs = await db.query(sql, params);
    return res.json({ success: true, count: turfs.length, turfs });
  } catch (err) {
    console.error('Error fetching turfs:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch turfs: ' + err.message });
  }
}

/**
 * Get turf by ID
 */
async function getTurfById(req, res) {
  try {
    const turfId = parseInt(req.params.id, 10);
    if (isNaN(turfId)) {
      return res.status(400).json({ success: false, error: 'Invalid turf ID.' });
    }

    const rows = await db.query('SELECT * FROM TURF WHERE turf_id = ?', [turfId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Turf not found.' });
    }

    return res.json({ success: true, turf: rows[0] });
  } catch (err) {
    console.error('Error fetching turf details:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch turf details: ' + err.message });
  }
}

/**
 * Create a new turf (Manager only)
 */
async function createTurf(req, res) {
  try {
    const { turf_name, location, price, description, image_url } = req.body;

    if (!turf_name || !location || price === undefined || price === null) {
      return res.status(400).json({
        success: false,
        error: 'Turf name, location, and price per hour are required.'
      });
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({ success: false, error: 'Price must be a valid positive number.' });
    }

    const defaultImg = image_url && image_url.trim() ? image_url.trim() : '/assets/turf-champions.jpg';

    const result = await db.query(
      'INSERT INTO TURF (turf_name, location, price, description, image_url) VALUES (?, ?, ?, ?, ?)',
      [turf_name.trim(), location.trim(), numericPrice, description ? description.trim() : '', defaultImg]
    );

    return res.status(201).json({
      success: true,
      message: 'Turf added successfully!',
      turfId: result.insertId
    });
  } catch (err) {
    console.error('Error creating turf:', err);
    return res.status(500).json({ success: false, error: 'Failed to create turf: ' + err.message });
  }
}

/**
 * Update an existing turf (Manager only)
 */
async function updateTurf(req, res) {
  try {
    const turfId = parseInt(req.params.id, 10);
    const { turf_name, location, price, description, image_url } = req.body;

    if (isNaN(turfId)) {
      return res.status(400).json({ success: false, error: 'Invalid turf ID.' });
    }

    if (!turf_name || !location || price === undefined || price === null) {
      return res.status(400).json({
        success: false,
        error: 'Turf name, location, and price are required.'
      });
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({ success: false, error: 'Price must be a valid positive number.' });
    }

    const existing = await db.query('SELECT turf_id FROM TURF WHERE turf_id = ?', [turfId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Turf does not exist.' });
    }

    await db.query(
      'UPDATE TURF SET turf_name = ?, location = ?, price = ?, description = ?, image_url = ? WHERE turf_id = ?',
      [turf_name.trim(), location.trim(), numericPrice, description ? description.trim() : '', image_url || '/assets/turf-champions.jpg', turfId]
    );

    return res.json({
      success: true,
      message: 'Turf updated successfully!'
    });
  } catch (err) {
    console.error('Error updating turf:', err);
    return res.status(500).json({ success: false, error: 'Failed to update turf: ' + err.message });
  }
}

/**
 * Delete a turf safely (Manager only)
 */
async function deleteTurf(req, res) {
  try {
    const turfId = parseInt(req.params.id, 10);
    if (isNaN(turfId)) {
      return res.status(400).json({ success: false, error: 'Invalid turf ID.' });
    }

    // Safe check: do not allow deletion if there are active confirmed future bookings
    const activeBookings = await db.query(
      'SELECT COUNT(*) as count FROM BOOKING WHERE turf_id = ? AND status = "CONFIRMED" AND booking_date >= CURDATE()',
      [turfId]
    );

    if (activeBookings[0].count > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete turf: There are ${activeBookings[0].count} active future bookings scheduled for this turf. Cancel or reassign those bookings first.`
      });
    }

    // If safe, delete (note: any past completed or cancelled bookings can be deleted or cascade-removed)
    // First remove cancelled/completed bookings if foreign key requires it
    await db.withTransaction(async (conn) => {
      // Find historical booking IDs
      const [bookings] = await conn.query('SELECT booking_id FROM BOOKING WHERE turf_id = ?', [turfId]);
      for (const b of bookings) {
        await conn.query('DELETE FROM PAYMENT WHERE booking_id = ?', [b.booking_id]);
      }
      await conn.query('DELETE FROM BOOKING WHERE turf_id = ?', [turfId]);
      await conn.query('DELETE FROM TURF WHERE turf_id = ?', [turfId]);
    });

    return res.json({
      success: true,
      message: 'Turf deleted successfully along with its archived historical records.'
    });
  } catch (err) {
    console.error('Error deleting turf:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete turf: ' + err.message });
  }
}

module.exports = {
  getAllTurfs,
  getTurfById,
  createTurf,
  updateTurf,
  deleteTurf
};
