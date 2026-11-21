/**
 * Authentication and Role-Based Authorization Middleware
 */

function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({
    success: false,
    error: 'Authentication required. Please log in to proceed.'
  });
}

function requireCustomerAuth(req, res, next) {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'customer') {
      return next();
    }
    return res.status(403).json({
      success: false,
      error: 'Access denied: Customer privileges required.'
    });
  }
  return res.status(401).json({
    success: false,
    error: 'Please log in as a customer to access this feature.'
  });
}

function requireManagerAuth(req, res, next) {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'manager') {
      return next();
    }
    return res.status(403).json({
      success: false,
      error: 'Access denied: Turf Manager privileges required.'
    });
  }
  return res.status(401).json({
    success: false,
    error: 'Please log in as a manager to access this feature.'
  });
}

module.exports = {
  requireAuth,
  requireCustomerAuth,
  requireManagerAuth
};
