let turfsData = [];
let selectedTurf = null;
let currentAvailability = null;

document.addEventListener('DOMContentLoaded', async () => {
  initNavbar('booking');

  // Set default minimum date to today
  const dateInput = document.getElementById('booking-date');
  const today = new Date().toISOString().split('T')[0];
  dateInput.min = today;
  dateInput.value = today;

  await loadTurfsDropdown();

  // Listeners
  document.getElementById('select-turf').addEventListener('change', onTurfChanged);
  dateInput.addEventListener('change', fetchSlotAvailability);
  document.getElementById('select-duration').addEventListener('change', onDurationChanged);
  document.getElementById('btn-confirm-booking').addEventListener('click', submitBooking);
});

async function loadTurfsDropdown() {
  const select = document.getElementById('select-turf');
  try {
    const res = await API.get('/api/turfs');
    if (res.success && res.turfs) {
      turfsData = res.turfs;
      select.innerHTML = '<option value="">-- Choose a Turf Facility --</option>' +
        res.turfs.map(t => `<option value="${t.turf_id}" data-price="${t.price}">${t.turf_name} (${formatCurrency(t.price)}/hr) - ${t.location}</option>`).join('');

      // Check if URL parameter pre-selected a turf
      const urlParams = new URLSearchParams(window.location.search);
      const preselectedTurfId = urlParams.get('turf_id');
      if (preselectedTurfId) {
        select.value = preselectedTurfId;
        onTurfChanged();
      }
    }
  } catch (err) {
    showToast('Failed to load turfs: ' + err.message, 'error');
  }
}

function onTurfChanged() {
  const select = document.getElementById('select-turf');
  const turfId = parseInt(select.value, 10);
  selectedTurf = turfsData.find(t => t.turf_id === turfId) || null;

  document.getElementById('selected-time-slot').value = '';
  updateSummary();

  if (selectedTurf) {
    fetchSlotAvailability();
  } else {
    document.getElementById('slots-container').innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding: 20px; color:var(--text-muted); background:#f8fafc; border-radius:var(--radius-sm); border:1px dashed var(--border-color);">
        Please select a turf facility above.
      </div>
    `;
  }
}

function onDurationChanged() {
  updateSummary();
  // Re-evaluate slot validity if slots are already displayed
  if (currentAvailability) {
    renderSlots(currentAvailability.slots);
  }
}

async function fetchSlotAvailability() {
  if (!selectedTurf) return;
  const date = document.getElementById('booking-date').value;
  if (!date) return;

  const container = document.getElementById('slots-container');
  container.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding: 20px; color:var(--text-muted);">Checking database slot availability...</div>`;

  try {
    const res = await API.get(`/api/bookings/availability?turf_id=${selectedTurf.turf_id}&date=${date}`);
    if (res.success) {
      currentAvailability = res;
      renderSlots(res.slots);
    }
  } catch (err) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding: 16px; background:#fee2e2; color:#991b1b; border-radius:6px;">
        Database slot lookup error: ${err.message}
      </div>
    `;
  }
}

function renderSlots(slots) {
  const container = document.getElementById('slots-container');
  const duration = parseInt(document.getElementById('select-duration').value, 10) || 1;
  const currentlySelectedTime = document.getElementById('selected-time-slot').value;

  container.innerHTML = slots.map((slot, index) => {
    // Check if enough consecutive slots exist for the chosen duration
    let canFitDuration = true;
    if (slot.available && duration > 1) {
      for (let i = 1; i < duration; i++) {
        const nextSlot = slots[index + i];
        if (!nextSlot || !nextSlot.available) {
          canFitDuration = false;
          break;
        }
      }
    }

    const isAvailableForDuration = slot.available && canFitDuration;
    const isSelected = currentlySelectedTime === slot.time;

    let slotClass = 'slot-btn';
    let statusLabel = 'Available';

    if (!slot.available) {
      slotClass += ' booked';
      statusLabel = 'Occupied';
    } else if (!canFitDuration) {
      slotClass += ' booked';
      statusLabel = `Need ${duration}h free`;
    } else if (isSelected) {
      slotClass += ' selected';
      statusLabel = 'Selected';
    } else {
      slotClass += ' available';
    }

    const disabledAttr = (!isAvailableForDuration) ? 'disabled' : '';

    return `
      <button type="button" 
        class="${slotClass}" 
        ${disabledAttr} 
        onclick="selectSlot('${slot.time}', '${slot.label}')">
        <span>${slot.time.substring(0, 5)}</span>
        <span class="slot-badge">${statusLabel}</span>
      </button>
    `;
  }).join('');
}

function selectSlot(time, label) {
  document.getElementById('selected-time-slot').value = time;
  document.getElementById('summary-slot').textContent = `${time.substring(0, 5)} (${label})`;
  
  if (currentAvailability) {
    renderSlots(currentAvailability.slots);
  }
  updateSummary();
}

function updateSummary() {
  const summaryTurf = document.getElementById('summary-turf');
  const summaryDate = document.getElementById('summary-date');
  const summaryDuration = document.getElementById('summary-duration');
  const summaryRate = document.getElementById('summary-rate');
  const summaryTotal = document.getElementById('summary-total');
  const confirmBtn = document.getElementById('btn-confirm-booking');

  const dateVal = document.getElementById('booking-date').value;
  const duration = parseInt(document.getElementById('select-duration').value, 10) || 1;
  const selectedTime = document.getElementById('selected-time-slot').value;

  if (selectedTurf) {
    summaryTurf.textContent = selectedTurf.turf_name;
    const hourlyPrice = parseFloat(selectedTurf.price) || 0;
    summaryRate.textContent = formatCurrency(hourlyPrice);
    const total = hourlyPrice * duration;
    summaryTotal.textContent = formatCurrency(total);
  } else {
    summaryTurf.textContent = 'None selected';
    summaryRate.textContent = '₹0.00';
    summaryTotal.textContent = '₹0.00';
  }

  summaryDate.textContent = dateVal ? formatDate(dateVal) : '--';
  summaryDuration.textContent = `${duration} Hour${duration > 1 ? 's' : ''}`;

  if (selectedTurf && dateVal && selectedTime) {
    confirmBtn.disabled = false;
  } else {
    confirmBtn.disabled = true;
  }
}

async function submitBooking() {
  const user = await API.getCurrentUser();
  if (!user) {
    showToast('Please log in as a customer to reserve a turf slot.', 'warning');
    setTimeout(() => {
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
    }, 1200);
    return;
  }

  if (user.role !== 'customer') {
    showToast('Only registered customers can book turf slots. Please switch to a customer account.', 'error');
    return;
  }

  const turf_id = selectedTurf ? selectedTurf.turf_id : null;
  const booking_date = document.getElementById('booking-date').value;
  const booking_time = document.getElementById('selected-time-slot').value;
  const duration = parseInt(document.getElementById('select-duration').value, 10) || 1;

  if (!turf_id || !booking_date || !booking_time) {
    showToast('Please fill all booking options and choose an available time slot.', 'error');
    return;
  }

  const confirmBtn = document.getElementById('btn-confirm-booking');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Executing ACID Transaction...';

  try {
    const res = await API.post('/api/bookings', {
      turf_id,
      booking_date,
      booking_time,
      duration
    });

    if (res.success) {
      showToast(`🎉 Booking #${res.booking.booking_id} Confirmed! Payment of ${formatCurrency(res.booking.total_amount)} recorded.`, 'success', 5000);
      setTimeout(() => {
        window.location.href = '/customer-dashboard.html';
      }, 1500);
    }
  } catch (err) {
    confirmBtn.disabled = false;
    confirmBtn.textContent = '🔒 Confirm & Book Slot';
    showToast('Booking Failed: ' + err.message, 'error', 6000);
    // Refresh slots in case someone else just took that slot
    fetchSlotAvailability();
  }
}
