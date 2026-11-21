let allTurfs = [];

document.addEventListener('DOMContentLoaded', () => {
  initNavbar('turfs');
  loadTurfs();

  document.getElementById('btn-search').addEventListener('click', performFilter);
  document.getElementById('turf-search').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performFilter();
  });
  document.getElementById('btn-reset').addEventListener('click', () => {
    document.getElementById('turf-search').value = '';
    renderTurfs(allTurfs);
  });
});

async function loadTurfs() {
  const container = document.getElementById('turfs-grid');
  try {
    const res = await API.get('/api/turfs');
    if (res.success && res.turfs) {
      allTurfs = res.turfs;
      renderTurfs(allTurfs);
    } else {
      container.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding: 40px;">No turfs available.</div>`;
    }
  } catch (err) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding: 30px; background:#fee2e2; color:#991b1b; border-radius:8px;">
        Failed to load turfs from database: ${err.message}. Please check MySQL status.
      </div>
    `;
  }
}

function renderTurfs(list) {
  const container = document.getElementById('turfs-grid');
  const countBadge = document.getElementById('turf-count-badge');
  countBadge.textContent = `Showing ${list.length} turfs`;

  if (list.length === 0) {
    container.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding: 40px; color:var(--text-muted);">No turfs match your search.</div>`;
    return;
  }

  container.innerHTML = list.map(turf => `
    <div class="turf-card">
      <img src="${turf.image_url || '/assets/turf-champions.jpg'}" alt="${turf.turf_name}" class="turf-card-image" onerror="this.src='/assets/turf-champions.jpg'" />
      <div class="turf-card-body">
        <h3 class="turf-card-title">${turf.turf_name}</h3>
        <div class="turf-card-location">📍 ${turf.location}</div>
        <p class="turf-card-desc">${turf.description || 'Premium artificial grass football turf with all-weather floodlights.'}</p>
        <div class="turf-card-footer">
          <div class="turf-price">${formatCurrency(turf.price)} <small>/ hr</small></div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-outline-dark btn-sm" onclick="openTurfModal(${turf.turf_id})">Details</button>
            <a href="/booking.html?turf_id=${turf.turf_id}" class="btn btn-primary btn-sm">Book Slot</a>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function performFilter() {
  const q = document.getElementById('turf-search').value.trim().toLowerCase();
  if (!q) {
    renderTurfs(allTurfs);
    return;
  }
  const filtered = allTurfs.filter(t => 
    t.turf_name.toLowerCase().includes(q) ||
    t.location.toLowerCase().includes(q) ||
    (t.description && t.description.toLowerCase().includes(q))
  );
  renderTurfs(filtered);
}

function openTurfModal(turfId) {
  const turf = allTurfs.find(t => t.turf_id === turfId);
  if (!turf) return;

  document.getElementById('modal-turf-name').textContent = turf.turf_name;
  document.getElementById('modal-turf-image').src = turf.image_url || '/assets/turf-champions.jpg';
  document.getElementById('modal-turf-location').textContent = turf.location;
  document.getElementById('modal-turf-price').textContent = `${formatCurrency(turf.price)} per hour`;
  document.getElementById('modal-turf-desc').textContent = turf.description || 'Full-sized synthetic turf engineered for football performance.';
  document.getElementById('modal-book-link').href = `/booking.html?turf_id=${turf.turf_id}`;

  document.getElementById('turf-modal').classList.add('open');
}

function closeTurfModal() {
  document.getElementById('turf-modal').classList.remove('open');
}

// Close modal on click outside
window.addEventListener('click', (e) => {
  const modal = document.getElementById('turf-modal');
  if (e.target === modal) {
    closeTurfModal();
  }
});
