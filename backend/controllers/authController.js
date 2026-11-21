const bcrypt = require('bcrypt');
const db = require('../config/db');

/**
 * Register a new customer
 */
async function registerCustomer(req, res) {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }
    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email address format.' });
    }

    // Check if email already registered in CUSTOMER or MANAGER
    const existingCustomer = await db.query('SELECT customer_id FROM CUSTOMER WHERE email = ?', [email]);
    if (existingCustomer.length > 0) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    const existingManager = await db.query('SELECT manager_id FROM MANAGER WHERE email = ?', [email]);
    if (existingManager.length > 0) {
      return res.status(409).json({ success: false, error: 'This email is reserved for administrative accounts.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new customer
    const result = await db.query(
      'INSERT INTO CUSTOMER (name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), phone.trim(), passwordHash]
    );

    const newCustomer = {
      id: result.insertId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role: 'customer'
    };

    // Automatically establish session
    req.session.user = newCustomer;

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully!',
      user: newCustomer
    });
  } catch (err) {
    console.error('Registration Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Registration failed. ' + (err.message || 'Server error.')
    });
  }
}

/**
 * Universal Login for Customer and Manager
 */
async function login(req, res) {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. If role is explicitly manager
    if (role === 'manager') {
      const managers = await db.query('SELECT * FROM MANAGER WHERE email = ?', [normalizedEmail]);
      if (managers.length === 0) {
        return res.status(401).json({ success: false, error: 'Invalid manager email or password.' });
      }
      const manager = managers[0];
      const match = await bcrypt.compare(password, manager.password_hash);
      if (!match) {
        return res.status(401).json({ success: false, error: 'Invalid manager email or password.' });
      }

      req.session.user = {
        id: manager.manager_id,
        name: manager.name,
        email: manager.email,
        role: 'manager'
      };

      return res.json({
        success: true,
        message: 'Logged in successfully as Manager.',
        user: req.session.user
      });
    }

    // 2. If role is explicitly customer
    if (role === 'customer') {
      const customers = await db.query('SELECT * FROM CUSTOMER WHERE email = ?', [normalizedEmail]);
      if (customers.length === 0) {
        return res.status(401).json({ success: false, error: 'Invalid customer email or password.' });
      }
      const customer = customers[0];
      const match = await bcrypt.compare(password, customer.password_hash);
      if (!match) {
        return res.status(401).json({ success: false, error: 'Invalid customer email or password.' });
      }

      req.session.user = {
        id: customer.customer_id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        role: 'customer'
      };

      return res.json({
        success: true,
        message: 'Logged in successfully as Customer.',
        user: req.session.user
      });
    }

    // 3. Smart detection if role is omitted
    const managers = await db.query('SELECT * FROM MANAGER WHERE email = ?', [normalizedEmail]);
    if (managers.length > 0) {
      const manager = managers[0];
      const match = await bcrypt.compare(password, manager.password_hash);
      if (match) {
        req.session.user = {
          id: manager.manager_id,
          name: manager.name,
          email: manager.email,
          role: 'manager'
        };
        return res.json({
          success: true,
          message: 'Logged in as Manager.',
          user: req.session.user
        });
      }
    }

    const customers = await db.query('SELECT * FROM CUSTOMER WHERE email = ?', [normalizedEmail]);
    if (customers.length > 0) {
      const customer = customers[0];
      const match = await bcrypt.compare(password, customer.password_hash);
      if (match) {
        req.session.user = {
          id: customer.customer_id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          role: 'customer'
        };
        return res.json({
          success: true,
          message: 'Logged in as Customer.',
          user: req.session.user
        });
      }
    }

    return res.status(401).json({ success: false, error: 'Invalid email or password.' });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Login failed. ' + (err.message || 'Database error.')
    });
  }
}

/**
 * Logout
 */
function logout(req, res) {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Could not log out.' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true, message: 'Logged out successfully.' });
  });
}

/**
 * Get current session user
 */
function getCurrentUser(req, res) {
  if (req.session && req.session.user) {
    return res.json({
      loggedIn: true,
      user: req.session.user
    });
  }
  return res.json({
    loggedIn: false,
    user: null
  });
}

module.exports = {
  registerCustomer,
  login,
  logout,
  getCurrentUser
};
