document.addEventListener('DOMContentLoaded', async () => {
  initNavbar('home');

  const container = document.getElementById('featured-turfs-grid');
  if (!container) return;

  try {
    const res = await API.get('/api/turfs');
    if (res.success && res.turfs && res.turfs.length > 0) {
      container.innerHTML = res.turfs.slice(0, 3).map(turf => `
        <div class="turf-card">
          <img src="${turf.image_url || '/assets/turf-champions.jpg'}" alt="${turf.turf_name}" class="turf-card-image" onerror="this.src='/assets/turf-champions.jpg'" />
          <div class="turf-card-body">
            <h3 class="turf-card-title">${turf.turf_name}</h3>
            <div class="turf-card-location">📍 ${turf.location}</div>
            <p class="turf-card-desc">${turf.description || 'Modern synthetic grass football turf with floodlights.'}</p>
            <div class="turf-card-footer">
              <div class="turf-price">${formatCurrency(turf.price)} <small>/ hr</small></div>
              <div style="display: flex; gap: 8px;">
                <a href="/booking.html?turf_id=${turf.turf_id}" class="btn btn-primary btn-sm">Book Now</a>
              </div>
            </div>
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted); grid-column: 1 / -1;">
          No turfs found in database. Please ensure sample data is seeded.
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; color: #991b1b; grid-column: 1 / -1;">
        <strong>Database Connection Notice:</strong> Could not load turfs (${err.message}).<br>
        If MySQL is offline, start MySQL server on port 3306 and run <code>npm run db:init</code>.
      </div>
    `;
  }
});
