let managerTurfs = [];
let managerBookings = [];

document.addEventListener('DOMContentLoaded', async () => {
  initNavbar('manager-dashboard');

  const user = await API.getCurrentUser();
  if (!user) {
    showToast('Please log in as a Manager to access this dashboard.', 'warning');
    setTimeout(() => {
      window.location.href = '/login.html?redirect=/manager-dashboard.html';
    }, 1000);
    return;
  }

  if (user.role !== 'manager') {
    showToast('Access denied. Manager role required.', 'error');
    setTimeout(() => {
      window.location.href = '/customer-dashboard.html';
    }, 1200);
    return;
  }

  document.getElementById('manager-info').textContent = 
    `Logged in as Manager: ${user.name} (${user.email}) | DBMS Administrator Privileges Active`;

  // Set today's date for monitor
  const todayStr = new Date().toISOString().split('T')[0];
  document.getElementById('monitor-date').value = todayStr;

  // Initial Data Load
  await loadStats();
  await loadTurfsCrud();
  await loadAllBookings();
  await loadCustomers();
  await loadUsageReport();

  // Listeners
  document.getElementById('turf-crud-form').addEventListener('submit', handleSaveTurf);
});

function switchTab(tabId) {
  const tabs = ['turfs', 'bookings', 'customers', 'usage', 'monitor'];
  tabs.forEach(t => {
    const sec = document.getElementById(`tab-section-${t}`);
    const btn = document.getElementById(`tab-btn-${t}`);
    if (sec && btn) {
      if (t === tabId) {
        sec.style.display = 'block';
        btn.classList.add('active-tab');
        btn.style.backgroundColor = 'var(--primary)';
        btn.style.color = '#ffffff';
      } else {
        sec.style.display = 'none';
        btn.classList.remove('active-tab');
        btn.style.backgroundColor = 'transparent';
        btn.style.color = 'var(--primary)';
      }
    }
  });

  if (tabId === 'monitor') {
    populateMonitorTurfDropdown();
  }
}

async function loadStats() {
  try {
    const res = await API.get('/api/manager/stats');
    if (res.success && res.stats) {
      const s = res.stats;
      document.getElementById('stat-customers').textContent = s.totalCustomers;
      document.getElementById('stat-turfs').textContent = s.totalTurfs;
      document.getElementById('stat-bookings').textContent = s.totalBookings;
      document.getElementById('stat-revenue').textContent = formatCurrency(s.totalRevenue);
    }
  } catch (err) {
    showToast('Could not load manager statistics: ' + err.message, 'error');
  }
}

// -------------------------------------------------------------
// TURF CRUD
// -------------------------------------------------------------
async function loadTurfsCrud() {
  const tbody = document.getElementById('turfs-table-tbody');
  try {
    const res = await API.get('/api/turfs');
    if (res.success && res.turfs) {
      managerTurfs = res.turfs;
      populateFilterTurfDropdowns();

      if (managerTurfs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px;">No turfs exist in the TURF table.</td></tr>`;
        return;
      }

      tbody.innerHTML = managerTurfs.map(t => `
        <tr>
          <td><strong>#TRF-${t.turf_id}</strong></td>
          <td><img src="${t.image_url || '/assets/turf-champions.jpg'}" alt="Turf" style="width:65px; height:45px; object-fit:cover; border-radius:4px;" onerror="this.src='/assets/turf-champions.jpg'"></td>
          <td><strong>${t.turf_name}</strong></td>
          <td>${t.location}</td>
          <td><strong>${formatCurrency(t.price)}</strong> / hr</td>
          <td style="max-width:260px; font-size:0.85rem; color:var(--text-muted);">${t.description || 'N/A'}</td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-outline-dark btn-sm" onclick="openEditTurfModal(${t.turf_id})">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteTurf(${t.turf_id}, '${t.turf_name.replace(/'/g, "\\'")}')">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#991b1b; padding:20px;">Error loading turfs: ${err.message}</td></tr>`;
  }
}

function openAddTurfModal() {
  document.getElementById('turf-crud-modal-title').textContent = 'Add New Football Turf';
  document.getElementById('crud-turf-id').value = '';
  document.getElementById('crud-turf-name').value = '';
  document.getElementById('crud-turf-location').value = '';
  document.getElementById('crud-turf-price').value = '';
  document.getElementById('crud-turf-desc').value = '';
  document.getElementById('crud-turf-image').value = '/assets/turf-champions.jpg';

  document.getElementById('turf-crud-modal').classList.add('open');
}

function openEditTurfModal(turfId) {
  const t = managerTurfs.find(item => item.turf_id === turfId);
  if (!t) return;

  document.getElementById('turf-crud-modal-title').textContent = `Edit Turf: ${t.turf_name}`;
  document.getElementById('crud-turf-id').value = t.turf_id;
  document.getElementById('crud-turf-name').value = t.turf_name;
  document.getElementById('crud-turf-location').value = t.location;
  document.getElementById('crud-turf-price').value = t.price;
  document.getElementById('crud-turf-desc').value = t.description || '';
  document.getElementById('crud-turf-image').value = t.image_url || '/assets/turf-champions.jpg';

  document.getElementById('turf-crud-modal').classList.add('open');
}

function closeTurfCrudModal() {
  document.getElementById('turf-crud-modal').classList.remove('open');
}

async function handleSaveTurf(e) {
  e.preventDefault();
  const turfId = document.getElementById('crud-turf-id').value;
  const turf_name = document.getElementById('crud-turf-name').value.trim();
  const location = document.getElementById('crud-turf-location').value.trim();
  const price = parseFloat(document.getElementById('crud-turf-price').value);
  const description = document.getElementById('crud-turf-desc').value.trim();
  const image_url = document.getElementById('crud-turf-image').value;

  const btn = document.getElementById('btn-save-turf');
  btn.disabled = true;

  try {
    if (turfId) {
      // UPDATE
      const res = await API.put(`/api/turfs/${turfId}`, { turf_name, location, price, description, image_url });
      showToast(res.message || 'Turf updated successfully in MySQL!', 'success');
    } else {
      // INSERT
      const res = await API.post('/api/turfs', { turf_name, location, price, description, image_url });
      showToast(res.message || 'Turf inserted successfully into MySQL!', 'success');
    }
    closeTurfCrudModal();
    await loadTurfsCrud();
    await loadStats();
    await loadUsageReport();
  } catch (err) {
    showToast(err.message || 'Failed to save turf.', 'error');
  } finally {
    btn.disabled = false;
  }
}

async function deleteTurf(turfId, turfName) {
  if (!confirm(`Are you sure you want to delete turf "${turfName}" (#TRF-${turfId})?\n\nMySQL will verify referential integrity constraints.`)) {
    return;
  }

  try {
    const res = await API.delete(`/api/turfs/${turfId}`);
    showToast(res.message || 'Turf deleted successfully.', 'success');
    await loadTurfsCrud();
    await loadStats();
    await loadUsageReport();
  } catch (err) {
    showToast('Delete prohibited: ' + err.message, 'error', 6000);
  }
}

function populateFilterTurfDropdowns() {
  const filterDropdown = document.getElementById('filter-booking-turf');
  const monitorDropdown = document.getElementById('monitor-turf');

  const options = '<option value="">All Turfs</option>' + 
    managerTurfs.map(t => `<option value="${t.turf_id}">${t.turf_name}</option>`).join('');

  if (filterDropdown) filterDropdown.innerHTML = options;
  if (monitorDropdown) {
    monitorDropdown.innerHTML = managerTurfs.map(t => `<option value="${t.turf_id}">${t.turf_name}</option>`).join('');
  }
}

// -------------------------------------------------------------
// BOOKINGS MANAGEMENT
// -------------------------------------------------------------
async function loadAllBookings(params = {}) {
  const tbody = document.getElementById('all-bookings-tbody');
  try {
    let url = '/api/bookings/all';
    const query = new URLSearchParams(params).toString();
    if (query) url += `?${query}`;

    const res = await API.get(url);
    if (res.success && res.bookings) {
      managerBookings = res.bookings;

      if (managerBookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:30px;">No bookings match the filter criteria.</td></tr>`;
        return;
      }

      tbody.innerHTML = managerBookings.map(b => {
        let badgeClass = 'badge-confirmed';
        if (b.status === 'COMPLETED') badgeClass = 'badge-completed';
        if (b.status === 'CANCELLED') badgeClass = 'badge-cancelled';
        if (b.status === 'PENDING') badgeClass = 'badge-pending';

        return `
          <tr>
            <td><strong>#BK-${b.booking_id}</strong></td>
            <td><strong>${b.customer_name}</strong><br><small style="color:var(--text-muted);">${b.customer_email}</small></td>
            <td>${b.customer_phone}</td>
            <td>${b.turf_name}</td>
            <td>${formatDate(b.booking_date)}</td>
            <td>${b.booking_time ? b.booking_time.substring(0, 5) : ''}</td>
            <td>${b.duration} hr</td>
            <td><strong>${formatCurrency(b.total_amount)}</strong></td>
            <td><span class="badge-status ${badgeClass}">${b.status}</span></td>
            <td>
              <span style="color:${b.payment_status === 'REFUNDED' ? '#dc2626' : '#16a34a'}; font-weight:700;">
                ${b.payment_status || 'PAID'}
              </span>
            </td>
            <td>
              <select class="form-control" style="font-size:0.8rem; padding:4px 6px; width:130px;" onchange="updateStatus(${b.booking_id}, this.value)">
                <option value="CONFIRMED" ${b.status === 'CONFIRMED' ? 'selected' : ''}>CONFIRMED</option>
                <option value="COMPLETED" ${b.status === 'COMPLETED' ? 'selected' : ''}>COMPLETED</option>
                <option value="CANCELLED" ${b.status === 'CANCELLED' ? 'selected' : ''}>CANCELLED</option>
              </select>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; color:#991b1b; padding:20px;">Error loading bookings: ${err.message}</td></tr>`;
  }
}

function filterBookings() {
  const date = document.getElementById('filter-booking-date').value;
  const turf_id = document.getElementById('filter-booking-turf').value;
  const status = document.getElementById('filter-booking-status').value;

  const params = {};
  if (date) params.date = date;
  if (turf_id) params.turf_id = turf_id;
  if (status) params.status = status;

  loadAllBookings(params);
}

function resetBookingFilters() {
  document.getElementById('filter-booking-date').value = '';
  document.getElementById('filter-booking-turf').value = '';
  document.getElementById('filter-booking-status').value = '';
  loadAllBookings({});
}

async function updateStatus(bookingId, newStatus) {
  try {
    const res = await API.put(`/api/bookings/${bookingId}/status`, { status: newStatus });
    showToast(res.message || 'Status updated.', 'success');
    await loadStats();
    await loadUsageReport();
  } catch (err) {
    showToast('Failed to update status: ' + err.message, 'error');
    loadAllBookings();
  }
}

// -------------------------------------------------------------
// CUSTOMER RECORDS
// -------------------------------------------------------------
async function loadCustomers() {
  const tbody = document.getElementById('customers-table-tbody');
  try {
    const res = await API.get('/api/manager/customers');
    if (res.success && res.customers) {
      if (res.customers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px;">No registered customers in database.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.customers.map(c => `
        <tr>
          <td><strong>#CUST-${c.customer_id}</strong></td>
          <td><strong>${c.name}</strong></td>
          <td>${c.email}</td>
          <td>${c.phone}</td>
          <td>${formatDate(c.created_at)}</td>
          <td><span class="badge" style="background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:4px; font-weight:700;">${c.total_bookings} Bookings</span></td>
          <td><strong>${formatCurrency(c.total_spent)}</strong></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#991b1b; padding:20px;">Error loading customers: ${err.message}</td></tr>`;
  }
}

// -------------------------------------------------------------
// USAGE & REVENUE REPORT
// -------------------------------------------------------------
async function loadUsageReport() {
  const tbody = document.getElementById('usage-table-tbody');
  try {
    const res = await API.get('/api/manager/usage-report');
    if (res.success && res.report) {
      if (res.report.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px;">No usage records available.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.report.map(r => `
        <tr>
          <td>#TRF-${r.turf_id}</td>
          <td><strong>${r.turf_name}</strong></td>
          <td>${r.location}</td>
          <td>${formatCurrency(r.hourly_rate)} / hr</td>
          <td><strong>${r.total_bookings}</strong></td>
          <td><strong>${r.total_hours_booked} Hours</strong></td>
          <td style="color:#15803d; font-size:1.05rem;"><strong>${formatCurrency(r.total_revenue)}</strong></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#991b1b; padding:20px;">Error loading report: ${err.message}</td></tr>`;
  }
}

// -------------------------------------------------------------
// SLOT MONITOR
// -------------------------------------------------------------
function populateMonitorTurfDropdown() {
  const monitorDropdown = document.getElementById('monitor-turf');
  if (managerTurfs.length > 0 && monitorDropdown && monitorDropdown.options.length === 0) {
    monitorDropdown.innerHTML = managerTurfs.map(t => `<option value="${t.turf_id}">${t.turf_name}</option>`).join('');
  }
  checkMonitorSlots();
}

async function checkMonitorSlots() {
  const turfId = document.getElementById('monitor-turf').value;
  const date = document.getElementById('monitor-date').value;
  const container = document.getElementById('monitor-slots-grid');

  if (!turfId || !date) return;

  container.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding:20px;">Inspecting slot occupancy...</div>`;

  try {
    const res = await API.get(`/api/bookings/availability?turf_id=${turfId}&date=${date}`);
    if (res.success && res.slots) {
      container.innerHTML = res.slots.map(s => {
        let cls = s.available ? 'slot-btn available' : 'slot-btn booked';
        let status = s.available ? 'FREE' : `BOOKED (#${s.booking.booking_id})`;
        return `
          <div class="${cls}" style="cursor:default;">
            <span style="font-weight:700;">${s.time.substring(0, 5)}</span>
            <span class="slot-badge">${status}</span>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    container.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; color:#991b1b;">Error: ${err.message}</div>`;
  }
}
