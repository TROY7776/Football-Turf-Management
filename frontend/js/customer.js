let customerBookings = [];

document.addEventListener('DOMContentLoaded', async () => {
  const isDashboard = !!document.getElementById('welcome-header');
  const isHistory = !!document.getElementById('history-table-tbody');

  initNavbar(isDashboard ? 'customer-dashboard' : 'booking-history');

  const user = await API.getCurrentUser();
  if (!user) {
    showToast('Please log in to view your bookings.', 'warning');
    setTimeout(() => {
      window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    }, 1000);
    return;
  }

  if (user.role !== 'customer') {
    showToast('Customer portal is only accessible to customer accounts.', 'error');
    setTimeout(() => {
      window.location.href = '/manager-dashboard.html';
    }, 1200);
    return;
  }

  if (isDashboard && document.getElementById('welcome-header')) {
    document.getElementById('welcome-header').textContent = `Welcome back, ${user.name}!`;
    document.getElementById('welcome-sub').textContent = `Customer Account: ${user.email} | Mobile: ${user.phone || 'N/A'}`;
  }

  await loadCustomerBookings(isDashboard, isHistory);

  if (isHistory) {
    const filterSelect = document.getElementById('filter-history-status');
    filterSelect.addEventListener('change', () => {
      renderHistoryTable(filterSelect.value);
    });
  }
});

async function loadCustomerBookings(isDashboard, isHistory) {
  try {
    const res = await API.get('/api/bookings/my-bookings');
    if (res.success && res.bookings) {
      customerBookings = res.bookings;

      if (isDashboard) {
        renderDashboard(customerBookings);
      }
      if (isHistory) {
        renderHistoryTable('ALL');
      }
    }
  } catch (err) {
    showToast('Failed to load bookings: ' + err.message, 'error');
  }
}

function renderDashboard(bookings) {
  const todayStr = new Date().toISOString().split('T')[0];

  const upcoming = bookings.filter(b => b.booking_date >= todayStr && b.status === 'CONFIRMED');
  const completed = bookings.filter(b => b.status === 'COMPLETED' || (b.booking_date < todayStr && b.status !== 'CANCELLED'));
  const totalSpent = bookings
    .filter(b => b.payment_status === 'PAID')
    .reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);

  // Update KPI counters
  document.getElementById('kpi-upcoming').textContent = upcoming.length;
  document.getElementById('kpi-completed').textContent = completed.length;
  document.getElementById('kpi-total').textContent = bookings.length;
  document.getElementById('kpi-spent').textContent = formatCurrency(totalSpent);

  // Render Upcoming Table
  const upcomingTbody = document.getElementById('upcoming-bookings-tbody');
  if (upcoming.length === 0) {
    upcomingTbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center; padding:30px; color:var(--text-muted);">
          No upcoming matches scheduled. <a href="/booking.html" style="color:var(--primary); font-weight:600;">Book a football turf now &rarr;</a>
        </td>
      </tr>
    `;
  } else {
    upcomingTbody.innerHTML = upcoming.map(b => `
      <tr>
        <td><strong>#BK-${b.booking_id}</strong></td>
        <td><strong>${b.turf_name}</strong><br><small style="color:var(--text-muted);">${b.location}</small></td>
        <td>${formatDate(b.booking_date)}</td>
        <td>${b.booking_time ? b.booking_time.substring(0, 5) : ''}</td>
        <td>${b.duration} Hour${b.duration > 1 ? 's' : ''}</td>
        <td><strong>${formatCurrency(b.total_amount)}</strong></td>
        <td><span class="badge-status badge-confirmed">${b.status}</span></td>
        <td><span style="color:#16a34a; font-weight:600;">✓ ${b.payment_status || 'PAID'}</span></td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="cancelBooking(${b.booking_id})">Cancel</button>
        </td>
      </tr>
    `).join('');
  }

  // Render Past Bookings Preview
  const pastTbody = document.getElementById('past-bookings-tbody');
  const pastList = bookings.filter(b => b.booking_date < todayStr || b.status !== 'CONFIRMED').slice(0, 5);

  if (pastList.length === 0) {
    pastTbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:20px; color:var(--text-muted);">
          No past bookings recorded yet.
        </td>
      </tr>
    `;
  } else {
    pastTbody.innerHTML = pastList.map(b => {
      let badgeClass = 'badge-confirmed';
      if (b.status === 'COMPLETED') badgeClass = 'badge-completed';
      if (b.status === 'CANCELLED') badgeClass = 'badge-cancelled';

      return `
        <tr>
          <td>#BK-${b.booking_id}</td>
          <td>${b.turf_name}</td>
          <td>${formatDate(b.booking_date)}</td>
          <td>${b.booking_time ? b.booking_time.substring(0, 5) : ''}</td>
          <td>${b.duration} hr</td>
          <td>${formatCurrency(b.total_amount)}</td>
          <td><span class="badge-status ${badgeClass}">${b.status}</span></td>
          <td>${b.payment_status || 'PAID'}</td>
        </tr>
      `;
    }).join('');
  }
}

function renderHistoryTable(statusFilter = 'ALL') {
  const tbody = document.getElementById('history-table-tbody');
  const countEl = document.getElementById('history-count');

  let list = customerBookings;
  if (statusFilter !== 'ALL') {
    list = list.filter(b => b.status === statusFilter);
  }

  countEl.textContent = `Found ${list.length} bookings`;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align:center; padding:30px; color:var(--text-muted);">
          No booking records matching the filter.
        </td>
      </tr>
    `;
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];

  tbody.innerHTML = list.map(b => {
    let badgeClass = 'badge-confirmed';
    if (b.status === 'COMPLETED') badgeClass = 'badge-completed';
    if (b.status === 'CANCELLED') badgeClass = 'badge-cancelled';

    const canCancel = b.status === 'CONFIRMED' && b.booking_date >= todayStr;

    return `
      <tr>
        <td><strong>#BK-${b.booking_id}</strong></td>
        <td><strong>${b.turf_name}</strong></td>
        <td><small style="color:var(--text-muted);">${b.location}</small></td>
        <td>${formatDate(b.booking_date)}</td>
        <td>${b.booking_time ? b.booking_time.substring(0, 5) : ''}</td>
        <td>${b.duration} hr</td>
        <td>${formatCurrency(b.hourly_price)}</td>
        <td><strong>${formatCurrency(b.total_amount)}</strong></td>
        <td><span class="badge-status ${badgeClass}">${b.status}</span></td>
        <td>
          <span style="font-size:0.82rem; font-weight:600; color:${b.payment_status === 'REFUNDED' ? '#dc2626' : '#16a34a'};">
            ${b.payment_status || 'PAID'}
          </span>
          <br><small style="color:var(--text-muted);">Ref: #${b.payment_id || b.booking_id}</small>
        </td>
        <td>
          ${canCancel ? `<button class="btn btn-danger btn-sm" onclick="cancelBooking(${b.booking_id})">Cancel</button>` : `<span style="color:var(--text-light); font-size:0.8rem;">None</span>`}
        </td>
      </tr>
    `;
  }).join('');
}

async function cancelBooking(bookingId) {
  if (!confirm(`Are you sure you want to cancel booking #BK-${bookingId}? Your payment will be marked as REFUNDED.`)) {
    return;
  }

  try {
    const res = await API.put(`/api/bookings/${bookingId}/cancel`);
    showToast(res.message || 'Booking cancelled successfully.', 'success');
    // Reload bookings
    const isDashboard = !!document.getElementById('welcome-header');
    const isHistory = !!document.getElementById('history-table-tbody');
    await loadCustomerBookings(isDashboard, isHistory);
  } catch (err) {
    showToast('Failed to cancel: ' + err.message, 'error');
  }
}
