/**
 * Central API Client and UI utilities
 */

const API = {
  /**
   * Wrapper around fetch with credentials and JSON headers
   */
  async request(endpoint, options = {}) {
    const config = {
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(endpoint, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body });
  },

  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  /**
   * Get current logged-in user
   */
  async getCurrentUser() {
    try {
      const res = await this.get('/api/auth/me');
      return res.loggedIn ? res.user : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Log out current user
   */
  async logout() {
    try {
      await this.post('/api/auth/logout');
      showToast('Logged out successfully', 'info');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 500);
    } catch (err) {
      showToast('Logout failed: ' + err.message, 'error');
    }
  }
};

/**
 * Toast Notification System
 */
function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button style="background:none;border:none;color:#ffffff;cursor:pointer;font-weight:bold;font-size:1.1rem;" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Check and display database connectivity status banner
 */
async function initDatabaseStatusBanner() {
  try {
    const res = await API.get('/api/health');
    const db = res.database || {};
    
    let banner = document.getElementById('db-status-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'db-status-banner';
      document.body.insertBefore(banner, document.body.firstChild);
    }

    if (db.connected) {
      banner.className = 'db-alert-banner connected';
      banner.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="badge">MySQL Connected</span>
          <span>Database: <strong>${db.config.database}</strong> on <strong>${db.config.host}:${db.config.port}</strong> (Pool Active)</span>
        </div>
        <div style="font-size:0.8rem;color:#15803d;">ACID Transactions & Overlap Protection Enabled</div>
      `;
    } else {
      banner.className = 'db-alert-banner';
      banner.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="badge">MySQL Disconnected</span>
          <span>MySQL Server is not reachable at <strong>${db.config?.host || 'localhost'}:${db.config?.port || 3306}</strong>.</span>
        </div>
        <div>
          <span>Please start your local MySQL service and run: <code style="background:rgba(0,0,0,0.06);padding:2px 6px;border-radius:4px;font-weight:700;">npm run db:init</code></span>
        </div>
      `;
    }
  } catch (e) {
    // server might be starting
  }
}

/**
 * Render dynamic navigation bar
 */
async function initNavbar(activePage = '') {
  const user = await API.getCurrentUser();
  const navContainer = document.querySelector('.nav-container');
  if (!navContainer) return;

  let linksHtml = `
    <ul class="nav-links">
      <li><a href="/index.html" class="${activePage === 'home' ? 'active' : ''}">Home</a></li>
      <li><a href="/turfs.html" class="${activePage === 'turfs' ? 'active' : ''}">Browse Turfs</a></li>
      <li><a href="/booking.html" class="${activePage === 'booking' ? 'active' : ''}">Book a Slot</a></li>
  `;

  let actionsHtml = '';

  if (user) {
    if (user.role === 'customer') {
      linksHtml += `
        <li><a href="/customer-dashboard.html" class="${activePage === 'customer-dashboard' ? 'active' : ''}">My Dashboard</a></li>
        <li><a href="/booking-history.html" class="${activePage === 'booking-history' ? 'active' : ''}">Booking History</a></li>
      `;
      actionsHtml = `
        <div class="user-badge">
          <span>👤 ${user.name}</span>
          <span class="role-pill customer">Customer</span>
        </div>
        <button class="btn btn-sm btn-outline" onclick="API.logout()">Logout</button>
      `;
    } else if (user.role === 'manager') {
      linksHtml += `
        <li><a href="/manager-dashboard.html" class="${activePage === 'manager-dashboard' ? 'active' : ''}">Manager Dashboard</a></li>
        <li><a href="/database-overview.html" class="${activePage === 'database-overview' ? 'active' : ''}" style="color:#f59e0b;font-weight:700;">Database Overview (DBMS)</a></li>
      `;
      actionsHtml = `
        <div class="user-badge">
          <span>🛡️ ${user.name}</span>
          <span class="role-pill manager">Manager</span>
        </div>
        <button class="btn btn-sm btn-outline" onclick="API.logout()">Logout</button>
      `;
    }
  } else {
    actionsHtml = `
      <a href="/login.html" class="btn btn-sm btn-outline">Log In</a>
      <a href="/register.html" class="btn btn-sm btn-primary">Register</a>
    `;
  }

  linksHtml += '</ul>';

  navContainer.innerHTML = `
    <a href="/index.html" class="brand-link">
      <img src="/assets/logo.svg" alt="Football Turf Management Logo" class="brand-logo" />
    </a>
    ${linksHtml}
    <div class="nav-actions">
      ${actionsHtml}
    </div>
  `;
}

/**
 * Format currency to INR
 */
function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Format date nicely
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Global auto-boot for navbar and DB banner
document.addEventListener('DOMContentLoaded', () => {
  initDatabaseStatusBanner();
});
