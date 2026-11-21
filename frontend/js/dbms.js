let currentSelectedTable = 'CUSTOMER';

document.addEventListener('DOMContentLoaded', async () => {
  initNavbar('database-overview');

  const user = await API.getCurrentUser();
  if (!user) {
    showToast('Please log in as a Turf Manager or Examiner to access DBMS Overview.', 'warning');
    setTimeout(() => {
      window.location.href = '/login.html?redirect=/database-overview.html';
    }, 1000);
    return;
  }

  if (user.role !== 'manager') {
    showToast('Access restricted: Manager / Examiner privileges required.', 'error');
    setTimeout(() => {
      window.location.href = '/customer-dashboard.html';
    }, 1200);
    return;
  }

  // Load High-Level Overview
  await loadOverviewCounts();

  // Load Initial Table Inspection
  await inspectTable('CUSTOMER');

  // Load Initial SQL Demo (INNER JOIN)
  await runDemo('INNER_JOIN');
});

async function loadOverviewCounts() {
  try {
    const res = await API.get('/api/dbms/overview');
    if (res.success && res.counts) {
      document.getElementById('count-customer').textContent = res.counts.customers;
      document.getElementById('count-manager').textContent = res.counts.managers;
      document.getElementById('count-turf').textContent = res.counts.turfs;
      document.getElementById('count-booking').textContent = res.counts.bookings;
      document.getElementById('count-payment').textContent = res.counts.payments;
    }
  } catch (err) {
    showToast('Failed to load database schema overview: ' + err.message, 'error');
  }
}

async function inspectTable(tableName) {
  currentSelectedTable = tableName;

  // Toggle active button
  ['CUSTOMER', 'MANAGER', 'TURF', 'BOOKING', 'PAYMENT'].forEach(t => {
    const btn = document.getElementById(`btn-tbl-${t}`);
    if (btn) {
      if (t === tableName) {
        btn.classList.add('active');
        btn.style.backgroundColor = 'var(--primary)';
        btn.style.color = '#ffffff';
      } else {
        btn.classList.remove('active');
        btn.style.backgroundColor = '#ffffff';
        btn.style.color = '#334155';
      }
    }
  });

  document.getElementById('schema-table-title').textContent = tableName;
  const thead = document.getElementById('inspect-thead');
  const tbody = document.getElementById('inspect-tbody');
  const schemaTbody = document.getElementById('schema-columns-tbody');

  tbody.innerHTML = `<tr><td style="text-align:center; padding:30px;">Loading ${tableName} records from SQLite...</td></tr>`;

  try {
    const res = await API.get(`/api/dbms/table/${tableName}`);
    if (res.success) {
      // 1. Render Schema Metadata Columns
      if (res.columns && res.columns.length > 0) {
        schemaTbody.innerHTML = res.columns.map(col => `
          <tr>
            <td><strong>${col.COLUMN_NAME}</strong></td>
            <td><code>${col.COLUMN_TYPE}</code></td>
            <td>${col.IS_NULLABLE}</td>
            <td><span class="badge" style="background:#e0f2fe; color:#0369a1;">${col.COLUMN_KEY || '-'}</span></td>
            <td>${col.COLUMN_DEFAULT !== null ? col.COLUMN_DEFAULT : 'NULL'}</td>
            <td>${col.EXTRA || '-'}</td>
          </tr>
        `).join('');
      }

      // 2. Render Live Data Records
      const records = res.records || [];
      if (records.length === 0) {
        thead.innerHTML = '';
        tbody.innerHTML = `<tr><td style="text-align:center; padding:30px;">Table "${tableName}" is currently empty.</td></tr>`;
        return;
      }

      const columns = Object.keys(records[0]);
      thead.innerHTML = `<tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>`;

      tbody.innerHTML = records.map(row => `
        <tr>
          ${columns.map(col => {
            let val = row[col];
            if (val === null || val === undefined) val = '<em style="color:#94a3b8;">NULL</em>';
            if (col.includes('price') || col.includes('amount')) val = `<strong>${formatCurrency(val)}</strong>`;
            if (col === 'password_hash') val = `<span style="font-family:var(--font-mono); font-size:0.75rem; color:#6b7280;">${val}</span>`;
            return `<td>${val}</td>`;
          }).join('')}
        </tr>
      `).join('');
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td style="text-align:center; color:#991b1b; padding:20px;">Error inspecting ${tableName}: ${err.message}</td></tr>`;
  }
}

async function runDemo(demoKey) {
  // Update button active state
  const demoButtons = document.querySelectorAll('.demo-selector .demo-btn');
  demoButtons.forEach(btn => {
    if (btn.id === `demo-${demoKey}`) {
      btn.classList.add('active');
      btn.style.backgroundColor = 'var(--primary)';
      btn.style.color = '#ffffff';
    } else {
      btn.classList.remove('active');
      btn.style.backgroundColor = '#ffffff';
      btn.style.color = '#334155';
    }
  });

  const thead = document.getElementById('demo-thead');
  const tbody = document.getElementById('demo-tbody');
  tbody.innerHTML = `<tr><td style="text-align:center; padding:30px;">Executing SQLite Query...</td></tr>`;

  try {
    const res = await API.post('/api/dbms/demo', { demoKey });
    if (res.success) {
      document.getElementById('demo-concept-title').textContent = `Concept: ${res.concept}`;
      document.getElementById('demo-concept-explanation').textContent = res.explanation;
      document.getElementById('demo-timing-badge').textContent = `SQLite Query Time: ${res.executionTimeMs} ms`;
      document.getElementById('demo-sql-box').textContent = res.sqlQuery;
      document.getElementById('demo-rows-count').textContent = `${res.rowCount} record${res.rowCount === 1 ? '' : 's'} returned`;

      renderDemoResultsTable(res.results);
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td style="text-align:center; color:#991b1b; padding:20px;">SQL Error: ${err.message}</td></tr>`;
  }
}

async function runCustomQuery() {
  const customSql = document.getElementById('custom-sql-input').value.trim();
  if (!customSql) {
    showToast('Please type a SQL SELECT query first.', 'warning');
    return;
  }

  const thead = document.getElementById('demo-thead');
  const tbody = document.getElementById('demo-tbody');
  tbody.innerHTML = `<tr><td style="text-align:center; padding:30px;">Executing Custom Query in MySQL...</td></tr>`;

  try {
    const res = await API.post('/api/dbms/demo', { demoKey: 'CUSTOM', customSql });
    if (res.success) {
      document.getElementById('demo-concept-title').textContent = 'Concept: Custom Examiner Query';
      document.getElementById('demo-concept-explanation').textContent = 'Live examiner query executed against football_turf_management database.';
      document.getElementById('demo-timing-badge').textContent = `MySQL Query Time: ${res.executionTimeMs} ms`;
      document.getElementById('demo-sql-box').textContent = res.sqlQuery;
      document.getElementById('demo-rows-count').textContent = `${res.rowCount} records returned`;

      renderDemoResultsTable(res.results);
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td style="text-align:center; color:#991b1b; padding:20px;">${err.message}</td></tr>`;
    showToast(err.message, 'error');
  }
}

function renderDemoResultsTable(results) {
  const thead = document.getElementById('demo-thead');
  const tbody = document.getElementById('demo-tbody');

  if (!results || results.length === 0) {
    thead.innerHTML = '';
    tbody.innerHTML = `<tr><td style="text-align:center; padding:30px; color:var(--text-muted);">Query returned 0 rows.</td></tr>`;
    return;
  }

  const columns = Object.keys(results[0]);
  thead.innerHTML = `<tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr>`;

  tbody.innerHTML = results.map(row => `
    <tr>
      ${columns.map(c => {
        let val = row[c];
        if (val === null || val === undefined) val = '<em style="color:#94a3b8;">NULL</em>';
        return `<td>${val}</td>`;
      }).join('')}
    </tr>
  `).join('');
}
