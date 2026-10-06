const state = {
  employees: [], allEmployees: [], directoryEmployees: [], departments: [], selectedEmployee: null,
  editingId: null, toastTimer: null, searchTimer: null, view: 'dashboard',
  layout: 'table', profileTab: 'overview'
};
const byId = (id) => document.getElementById(id);
const elements = {
  rows: byId('employeeRows'), recentRows: byId('recentRows'), search: byId('searchInput'), globalSearch: byId('globalSearch'),
  departmentFilter: byId('departmentFilter'), statusFilter: byId('statusFilter'), positionFilter: byId('positionFilter'),
  joinDateFilter: byId('joinDateFilter'), modal: byId('employeeModal'), form: byId('employeeForm'),
  modalTitle: byId('modalTitle'), modalDescription: byId('modalDescription'), formMessage: byId('formMessage'),
  saveButton: byId('saveEmployeeButton'), toast: byId('toast')
};
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const fullName = (employee) => `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
const initials = (employee) => `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase();
const avatarClass = (employee) => `avatar-tone-${Math.abs(Number(employee.id) || (employee.firstName || 'P').length) % 6}`;
const money = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(amount) || 0);
const formatDate = (date, options = { month: 'short', day: 'numeric', year: 'numeric' }) => {
  if (!date) return '—';
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return '—';
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)));
};
const statusClass = (status) => status === 'Active' ? 'status-active' : status === 'On Leave' ? 'status-leave' : 'status-inactive';

async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  if (response.status === 204) return null;
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || 'Something went wrong. Please try again.');
    error.fields = result.fields || {};
    throw error;
  }
  return result;
}

function showToast(message, isError = false) {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.toggle('error', isError);
  elements.toast.classList.add('visible');
  state.toastTimer = window.setTimeout(() => elements.toast.classList.remove('visible'), 3200);
}

async function refresh() {
  const query = new URLSearchParams();
  const search = elements.search.value.trim();
  const department = elements.departmentFilter.value;
  const status = elements.statusFilter.value;
  if (search) query.set('search', search);
  if (department) query.set('department', department);
  if (status) query.set('status', status);
  try {
    const [employeeData, allData, dashboard] = await Promise.all([api(`/api/employees?${query}`), api('/api/employees'), api('/api/dashboard')]);
    state.employees = allData.employees;
    state.allEmployees = allData.employees;
    state.directoryEmployees = employeeData.employees;
    state.departments = dashboard.departmentCounts.map((item) => item.department);
    renderDashboard(dashboard);
    updateFilterOptions();
    renderDirectory();
    renderRecentEmployees();
    renderDepartmentBars(dashboard.departmentCounts);
    renderChart();
    renderActivity();
    if (state.selectedEmployee) {
      const refreshedEmployee = state.employees.find((employee) => employee.id === state.selectedEmployee.id)
        || (await api(`/api/employees/${state.selectedEmployee.id}`).catch(() => null))?.employee;
      if (refreshedEmployee) {
        state.selectedEmployee = refreshedEmployee;
        renderProfile();
      } else {
        navigate('employees');
      }
    }
  } catch (error) {
    elements.rows.innerHTML = `<tr><td colspan="7" class="empty-cell">${escapeHtml(error.message)}</td></tr>`;
    showToast(error.message, true);
  }
}

function renderDashboard(data) {
  byId('totalEmployees').textContent = data.summary.total ?? 0;
  byId('activeEmployees').textContent = data.summary.active ?? 0;
  byId('departmentTotal').textContent = data.summary.departments ?? 0;
  byId('onLeaveEmployees').textContent = state.employees.filter((employee) => employee.status === 'On Leave').length;
  byId('navEmployeeCount').textContent = data.summary.total ?? 0;
}

function applyLayout(layout) {
  state.layout = layout;
  document.body.classList.toggle('directory-grid-mode', layout === 'grid');
  document.querySelectorAll('[data-layout]').forEach((button) => button.classList.toggle('selected', button.dataset.layout === layout));
  byId('directoryTableWrap').hidden = layout !== 'table';
  byId('employeeGrid').hidden = layout !== 'grid';
}

function updateFilterOptions() {
  const currentDepartment = elements.departmentFilter.value;
  const currentPosition = elements.positionFilter.value;
  const departments = [...new Set(state.employees.map((employee) => employee.department))].sort((a, b) => a.localeCompare(b));
  const positions = [...new Set(state.employees.map((employee) => employee.jobTitle))].sort((a, b) => a.localeCompare(b));
  elements.departmentFilter.innerHTML = '<option value="">All departments</option>' + departments.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  elements.positionFilter.innerHTML = '<option value="">All positions</option>' + positions.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  if (departments.includes(currentDepartment)) elements.departmentFilter.value = currentDepartment;
  if (positions.includes(currentPosition)) elements.positionFilter.value = currentPosition;
  byId('departmentOptions').innerHTML = departments.map((value) => `<option value="${escapeHtml(value)}"></option>`).join('');
  byId('positionOptions').innerHTML = positions.map((value) => `<option value="${escapeHtml(value)}"></option>`).join('');
}

function filteredEmployees() {
  const position = elements.positionFilter.value;
  const joinDate = elements.joinDateFilter.value;
  return state.directoryEmployees.filter((employee) => (!position || employee.jobTitle === position) && (!joinDate || employee.startDate >= joinDate));
}

function employeeActions(employee) {
  return `<div class="row-actions"><button class="row-action more-action" type="button" data-action="menu" data-id="${employee.id}" aria-label="Actions for ${escapeHtml(fullName(employee))}" aria-expanded="false">···</button><div class="row-menu" data-menu="${employee.id}" hidden><button type="button" data-action="profile" data-id="${employee.id}">View profile</button><button type="button" data-action="edit" data-id="${employee.id}">Edit employee</button><button type="button" class="delete-menu-item" data-action="delete" data-id="${employee.id}">Delete employee</button></div></div>`;
}

function employeeRow(employee) {
  return `<tr>
    <td><button class="employee-cell employee-open" data-action="profile" data-id="${employee.id}" type="button"><span class="avatar ${avatarClass(employee)}">${escapeHtml(initials(employee))}</span><span class="employee-meta"><strong>${escapeHtml(fullName(employee))}</strong><small>${escapeHtml(employee.email)}</small></span></button></td>
    <td><span class="employee-id">${escapeHtml(employee.employeeCode || `EMP-${String(employee.id).padStart(3, '0')}`)}</span></td>
    <td><span class="department-cell"><i class="department-mark"></i>${escapeHtml(employee.department)}</span></td>
    <td class="job-cell">${escapeHtml(employee.jobTitle)}</td><td><span class="status-badge ${statusClass(employee.status)}">${escapeHtml(employee.status)}</span></td>
    <td class="date-cell">${escapeHtml(formatDate(employee.startDate))}</td><td>${employeeActions(employee)}</td>
  </tr>`;
}

function renderDirectory() {
  const employees = filteredEmployees();
  byId('recordCount').textContent = employees.length;
  const filtered = elements.search.value || elements.globalSearch.value || elements.departmentFilter.value || elements.statusFilter.value || elements.positionFilter.value || elements.joinDateFilter.value;
  byId('tableSummary').textContent = `Showing ${employees.length} of ${state.allEmployees.length} ${state.allEmployees.length === 1 ? 'employee' : 'employees'}${filtered ? ' matching your filters' : ''}`;
  if (!employees.length) {
    elements.rows.innerHTML = '<tr><td colspan="7" class="empty-cell"><div class="empty-state"><span class="empty-icon">♧</span><strong>No employees found</strong><span>Try adjusting your filters or add someone new.</span></div></td></tr>';
    byId('employeeGrid').innerHTML = '<div class="empty-state"><strong>No employees found</strong><span>Try adjusting your filters.</span></div>';
    return;
  }
  elements.rows.innerHTML = employees.map(employeeRow).join('');
  byId('employeeGrid').innerHTML = employees.map((employee) => `<article class="employee-card"><div class="employee-card-top"><span class="avatar ${avatarClass(employee)}">${escapeHtml(initials(employee))}</span>${employeeActions(employee)}</div><button class="employee-card-name" data-action="profile" data-id="${employee.id}" type="button"><strong>${escapeHtml(fullName(employee))}</strong><span>${escapeHtml(employee.jobTitle)}</span></button><div class="employee-card-dept">${escapeHtml(employee.department)} <span class="employee-id">${escapeHtml(employee.employeeCode || `EMP-${String(employee.id).padStart(3, '0')}`)}</span></div><div class="employee-card-foot"><span class="status-badge ${statusClass(employee.status)}">${escapeHtml(employee.status)}</span><span>${escapeHtml(formatDate(employee.startDate))}</span></div></article>`).join('');
}

function renderRecentEmployees() {
  const recent = [...state.employees].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || b.id - a.id).slice(0, 5);
  if (!recent.length) {
    elements.recentRows.innerHTML = '<tr><td colspan="7" class="loading-cell">No employee records yet.</td></tr>';
    return;
  }
  elements.recentRows.innerHTML = recent.map(employeeRow).join('');
}

const departmentColor = (index) => ['#8b5cf6', '#6575e8', '#34b88b', '#d69a47', '#c56b80', '#4e9abb'][index % 6];
function renderDepartmentBars(departments) {
  const max = Math.max(1, ...departments.map((item) => item.count));
  const render = (large = false) => departments.length ? departments.map((item, index) => {
    const percentage = Math.round((item.count / Math.max(1, state.employees.length)) * 100);
    return `<div class="department-row ${large ? 'department-row-large' : ''}"><div class="department-row-label"><span><i class="dept-dot" style="--dept-color:${departmentColor(index)}"></i>${escapeHtml(item.department)}</span><strong>${item.count}<small> ${item.count === 1 ? 'employee' : 'employees'}</small></strong></div><div class="department-track"><span style="width:${Math.max(5, (item.count / max) * 100)}%;--dept-color:${departmentColor(index)}"></span></div><span class="department-percent">${percentage}%</span></div>`;
  }).join('') : '<div class="empty-inline">Add employees to see department totals.</div>';
  byId('departmentBars').innerHTML = render();
  byId('departmentPageBars').innerHTML = render(true);
}

function renderChart() {
  const svg = byId('employeeChart');
  const period = Number(byId('chartPeriod').value || 30);
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - period);
  const pointCount = period <= 7 ? 7 : period <= 30 ? 8 : period <= 90 ? 9 : 12;
  const points = Array.from({ length: pointCount }, (_, index) => {
    const date = new Date(start.getTime() + ((now.getTime() - start.getTime()) * index / (pointCount - 1)));
    const newHires = state.employees.filter((employee) => {
      const hired = new Date(`${employee.startDate}T00:00:00Z`);
      return hired <= date;
    }).length;
    const activeHires = state.employees.filter((employee) => employee.status === 'Active' && new Date(`${employee.startDate}T00:00:00Z`) <= date).length;
    return { date, total: newHires, active: activeHires, recent: state.employees.filter((employee) => {
      const hired = new Date(`${employee.startDate}T00:00:00Z`);
      return hired <= date && hired > new Date(date.getTime() - (period / pointCount) * 86400000);
    }).length };
  });
  const chartHeight = 150;
  const top = 12;
  const maxValue = Math.max(4, state.employees.length, ...points.map((point) => point.total));
  const x = (index) => 12 + (index * 696 / Math.max(1, points.length - 1));
  const y = (value) => top + chartHeight - (value / maxValue) * chartHeight;
  const pathFor = (key) => points.map((point, index) => `${index ? 'L' : 'M'}${x(index)},${y(point[key])}`).join(' ');
  const grid = [0, 1, 2, 3].map((line) => `<line x1="10" y1="${top + line * chartHeight / 3}" x2="710" y2="${top + line * chartHeight / 3}" class="chart-grid-line"/>`).join('');
  const ticks = points.map((point, index) => index % Math.ceil(points.length / 5) === 0 || index === points.length - 1 ? `<text x="${x(index)}" y="184" text-anchor="middle" class="chart-tick">${escapeHtml(new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(point.date))}</text>` : '').join('');
  const dots = points.map((point, index) => `<circle cx="${x(index)}" cy="${y(point.total)}" r="3" class="chart-dot total-dot"/><circle cx="${x(index)}" cy="${y(point.active)}" r="2.5" class="chart-dot active-dot"/>`).join('');
  svg.innerHTML = `${grid}<path d="${pathFor('total')}" class="chart-line total-line"/><path d="${pathFor('active')}" class="chart-line active-line"/><path d="${pathFor('recent')}" class="chart-line new-line"/>${dots}${ticks}`;
}

function renderActivity() {
  const activity = [...state.employees].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || b.id - a.id).slice(0, 3);
  const items = activity.map((employee, index) => ({
    initials: initials(employee), tone: avatarClass(employee),
    text: `<strong>${escapeHtml(fullName(employee))}</strong> was added to ${escapeHtml(employee.department)}`,
    time: employee.createdAt ? `Added ${escapeHtml(formatDate(employee.createdAt.slice(0, 10)))}` : `Employee record ${index + 1}`
  }));
  items.push({ initials: 'PF', tone: 'activity-system', text: 'PeopleFirst workspace is ready to keep your records organized', time: 'System' });
  byId('activityList').innerHTML = items.map((item) => `<div class="activity-item"><span class="activity-avatar ${item.tone}">${escapeHtml(item.initials)}</span><div><p>${item.text}</p><small>${escapeHtml(item.time)}</small></div></div>`).join('');
}

function navigate(view, title = '') {
  state.view = view;
  document.querySelectorAll('[data-panel]').forEach((panel) => {
    const panelView = panel.dataset.panel;
    const isActive = panelView === view || (panelView === 'generic' && view === 'generic');
    panel.hidden = !isActive;
    panel.classList.toggle('active', isActive);
  });
  document.querySelectorAll('.nav-item[data-view]').forEach((link) => link.classList.toggle('active', link.dataset.view === view));
  byId('breadcrumbTitle').textContent = title || ({ dashboard: 'Dashboard', employees: 'Employees', profile: 'Employee profile', departments: 'Departments', attendance: 'Attendance', generic: byId('genericTitle').textContent }[view] || 'Dashboard');
  document.querySelector('#sidebar').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openGenericView(view) {
  const copy = {
    leave: ['Leave management', 'Manage leave requests and employee time away.', 'Leave workflows are not configured', 'Connect your organization’s leave policies and request approvals here. Attendance and leave entries are not stored in this demo yet.'],
    performance: ['Performance', 'Keep employee goals and development information together.', 'Performance workspace', 'Performance reviews are not stored in the current employee database. This workspace is ready to connect to your review process.'],
    payroll: ['Payroll', 'Review employee compensation information.', 'Compensation records', 'Salary is included in employee profiles. Payroll runs and payslip processing are outside this demonstration app.'],
    reports: ['Reports', 'Export employee records for your organization.', 'Employee report', 'Download the current employee directory as a CSV file.']
  }[view];
  if (view === 'reports') { exportCsv(); return; }
  byId('genericTitle').textContent = copy[0];
  byId('genericSubtitle').textContent = copy[1];
  byId('placeholderTitle').textContent = copy[2];
  byId('placeholderText').textContent = copy[3];
  navigate('generic', copy[0]);
}

function openProfile(employee) {
  state.selectedEmployee = employee;
  state.profileTab = 'overview';
  document.querySelectorAll('[data-profile-tab]').forEach((tab) => tab.classList.toggle('active', tab.dataset.profileTab === state.profileTab));
  renderProfile();
  navigate('profile', 'Employee profile');
}

function renderProfile() {
  const employee = state.selectedEmployee;
  if (!employee) return;
  byId('employeeProfileHeader').innerHTML = `<div class="profile-identity"><span class="avatar profile-avatar ${avatarClass(employee)}">${escapeHtml(initials(employee))}</span><div><div class="profile-name-row"><h1>${escapeHtml(fullName(employee))}</h1><span class="status-badge ${statusClass(employee.status)}">${escapeHtml(employee.status)}</span></div><p>${escapeHtml(employee.jobTitle)} <span>·</span> ${escapeHtml(employee.department)}</p><span class="employee-id">${escapeHtml(employee.employeeCode || `EMP-${String(employee.id).padStart(3, '0')}`)}</span></div></div><div class="profile-actions"><button class="button button-secondary" data-profile-action="edit" type="button">Edit employee</button><button class="button button-secondary profile-more-button" data-profile-action="menu" type="button">···</button><div class="row-menu profile-menu" data-profile-menu hidden><button data-profile-action="delete" type="button">Delete employee</button></div></div>`;
  const tabs = {
    overview: `<div class="profile-card-grid"><section class="panel profile-info-card"><div class="profile-section-title"><div><span class="section-kicker">EMPLOYEE RECORD</span><h2>Contact information</h2></div><button class="text-action" data-profile-action="edit" type="button">Edit <span>↗</span></button></div>${infoRows([['Work email', employee.email], ['Phone', employee.phone], ['Address', [employee.address, employee.city, employee.state, employee.country].filter(Boolean).join(', ') || 'Not provided']])}</section><section class="panel profile-info-card"><div class="profile-section-title"><div><span class="section-kicker">ROLE &amp; TEAM</span><h2>Job information</h2></div></div>${infoRows([['Position', employee.jobTitle], ['Department', employee.department], ['Manager', employee.manager || 'Not assigned'], ['Employee ID', employee.employeeCode || `EMP-${String(employee.id).padStart(3, '0')}`], ['Employment status', employee.status]])}</section><section class="panel profile-info-card"><div class="profile-section-title"><div><span class="section-kicker">EMPLOYMENT</span><h2>Joining details</h2></div></div>${infoRows([['Joining date', formatDate(employee.startDate)], ['Employment type', employee.employmentType || 'Full-time'], ['Annual salary', money(employee.salary)]])}</section></div>`,
    personal: `<section class="panel profile-info-card"><div class="profile-section-title"><div><span class="section-kicker">PERSONAL INFORMATION</span><h2>Personal details</h2></div><button class="text-action" data-profile-action="edit" type="button">Edit <span>↗</span></button></div>${infoRows([['Full name', fullName(employee)], ['Date of birth', formatDate(employee.dateOfBirth)], ['Work email', employee.email], ['Phone', employee.phone], ['Address', employee.address], ['City', employee.city], ['State / region', employee.state], ['Country', employee.country]])}</section>`,
    employment: `<section class="panel profile-info-card"><div class="profile-section-title"><div><span class="section-kicker">EMPLOYMENT</span><h2>Employment information</h2></div><button class="text-action" data-profile-action="edit" type="button">Edit <span>↗</span></button></div>${infoRows([['Employee ID', employee.employeeCode || `EMP-${String(employee.id).padStart(3, '0')}`], ['Department', employee.department], ['Position', employee.jobTitle], ['Manager', employee.manager || 'Not assigned'], ['Joining date', formatDate(employee.startDate)], ['Employment type', employee.employmentType || 'Full-time'], ['Status', employee.status]])}</section>`,
    attendance: profilePlaceholder('Attendance history is not stored in this demo. Connect a timekeeping source to see this employee’s attendance records.'),
    leave: profilePlaceholder('Leave requests and balances are not stored in this demo yet.'),
    payroll: `<section class="panel profile-info-card"><div class="profile-section-title"><div><span class="section-kicker">COMPENSATION</span><h2>Payroll information</h2></div></div>${infoRows([['Annual salary', money(employee.salary)], ['Employment type', employee.employmentType || 'Full-time'], ['Payroll processing', 'Not configured in this demo']])}</section>`,
    performance: profilePlaceholder('Performance goals and reviews are not stored in this demo yet.')
  };
  byId('profileContent').innerHTML = tabs[state.profileTab] || tabs.overview;
}

function infoRows(rows) {
  return `<dl class="info-list">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || 'Not provided')}</dd></div>`).join('')}</dl>`;
}
function profilePlaceholder(text) { return `<section class="panel placeholder-panel profile-placeholder"><span class="placeholder-icon">◷</span><h2>Employee records</h2><p>${escapeHtml(text)}</p></section>`; }

function clearFieldErrors() {
  elements.form.querySelectorAll('.form-field').forEach((field) => {
    field.classList.remove('invalid');
    field.querySelector('.field-error').textContent = '';
  });
  elements.formMessage.hidden = true;
  elements.formMessage.textContent = '';
}
function setFieldErrors(errors = {}) {
  clearFieldErrors();
  for (const [name, message] of Object.entries(errors)) {
    const input = elements.form.elements.namedItem(name);
    const field = input?.closest('.form-field');
    if (!field) continue;
    field.classList.add('invalid');
    field.querySelector('.field-error').textContent = message;
  }
  elements.form.querySelector('.form-field.invalid input, .form-field.invalid select')?.focus();
}
function openModal(employee = null) {
  state.editingId = employee?.id ?? null;
  elements.form.reset(); clearFieldErrors();
  elements.modalTitle.textContent = employee ? 'Edit employee' : 'Add employee';
  elements.modalDescription.textContent = employee ? 'Update this employee’s organizational information.' : 'Add a new employee to your organization.';
  elements.saveButton.innerHTML = employee ? 'Save changes <span>→</span>' : 'Save employee <span>→</span>';
  if (employee) {
    for (const field of ['employeeCode', 'firstName', 'lastName', 'email', 'phone', 'department', 'jobTitle', 'startDate', 'dateOfBirth', 'employmentType', 'manager', 'address', 'city', 'state', 'country', 'salary', 'status']) {
      const input = elements.form.elements.namedItem(field);
      if (input) input.value = employee[field] ?? (field === 'employmentType' ? 'Full-time' : '');
    }
  } else {
    elements.form.elements.namedItem('employeeCode').placeholder = `EMP-${String(Math.max(0, ...state.allEmployees.map((item) => item.id)) + 1).padStart(3, '0')} · generated if blank`;
  }
  elements.modal.hidden = false;
  document.body.style.overflow = 'hidden';
  elements.form.elements.namedItem('firstName').focus();
}
function closeModal() { elements.modal.hidden = true; document.body.style.overflow = ''; state.editingId = null; }

async function saveEmployee(event) {
  event.preventDefault(); clearFieldErrors();
  if (!elements.form.reportValidity()) return;
  const employee = Object.fromEntries(new FormData(elements.form).entries());
  employee.salary = Number(employee.salary);
  const wasEditing = Boolean(state.editingId);
  elements.saveButton.disabled = true; elements.saveButton.textContent = 'Saving…';
  try {
    await api(wasEditing ? `/api/employees/${state.editingId}` : '/api/employees', { method: wasEditing ? 'PUT' : 'POST', body: JSON.stringify(employee) });
    closeModal(); showToast(wasEditing ? 'Employee updated successfully.' : 'Employee added successfully.');
    await refresh();
  } catch (error) {
    if (Object.keys(error.fields).length) setFieldErrors(error.fields);
    elements.formMessage.textContent = error.message; elements.formMessage.hidden = false;
  } finally {
    elements.saveButton.disabled = false;
    elements.saveButton.innerHTML = wasEditing ? 'Save changes <span>→</span>' : 'Save employee <span>→</span>';
  }
}

async function handleEmployeeAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button) { if (!event.target.closest('.row-menu')) closeOpenMenus(); return; }
  const id = Number(button.dataset.id);
  const employee = state.employees.find((item) => item.id === id) || state.allEmployees.find((item) => item.id === id);
  if (!employee) return;
  const action = button.dataset.action;
  if (action === 'menu') {
    const menu = button.parentElement.querySelector('.row-menu');
    const opening = menu.hidden;
    closeOpenMenus(); menu.hidden = !opening; button.setAttribute('aria-expanded', String(opening));
    return;
  }
  closeOpenMenus();
  if (action === 'profile') { openProfile(employee); return; }
  if (action === 'edit') { openModal(employee); return; }
  if (action === 'delete') await deleteEmployee(employee);
}
function closeOpenMenus() {
  document.querySelectorAll('.row-menu:not([hidden])').forEach((menu) => { menu.hidden = true; menu.closest('.row-actions')?.querySelector('.more-action')?.setAttribute('aria-expanded', 'false'); });
}
async function deleteEmployee(employee) {
  if (!window.confirm(`Delete ${fullName(employee)} from the employee directory? This cannot be undone.`)) return;
  try {
    await api(`/api/employees/${employee.id}`, { method: 'DELETE' });
    state.selectedEmployee = null; showToast(`${fullName(employee)} was deleted.`); navigate('employees'); await refresh();
  } catch (error) { showToast(error.message, true); }
}

function exportCsv() {
  const employees = filteredEmployees();
  if (!employees.length) { showToast('There are no employees to export.', true); return; }
  const headings = ['Employee ID', 'First name', 'Last name', 'Email', 'Phone', 'Department', 'Position', 'Manager', 'Start date', 'Employment type', 'Status', 'Annual salary'];
  const keys = ['employeeCode', 'firstName', 'lastName', 'email', 'phone', 'department', 'jobTitle', 'manager', 'startDate', 'employmentType', 'status', 'salary'];
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const content = [headings, ...employees.map((employee) => keys.map((key) => employee[key]))].map((row) => row.map(quote).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `peoplefirst-employees-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  showToast('Employee directory exported as CSV.');
}

function setToday() {
  const now = new Date();
  byId('todayLabel').textContent = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(now);
  byId('fullDate').textContent = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(now);
}

function updateResponsiveLayout() {
  if (window.matchMedia('(max-width: 680px)').matches) applyLayout('grid');
  else applyLayout('table');
}

byId('addEmployeeButton').addEventListener('click', () => openModal());
byId('directoryAddButton').addEventListener('click', () => openModal());
byId('closeModalButton').addEventListener('click', closeModal);
byId('cancelModalButton').addEventListener('click', closeModal);
elements.modal.addEventListener('click', (event) => { if (event.target === elements.modal) closeModal(); });
elements.form.addEventListener('submit', saveEmployee);
elements.rows.addEventListener('click', handleEmployeeAction);
elements.recentRows.addEventListener('click', handleEmployeeAction);
byId('employeeGrid').addEventListener('click', handleEmployeeAction);
[ elements.departmentFilter, elements.statusFilter ].forEach((filter) => filter.addEventListener('change', refresh));
[ elements.positionFilter, elements.joinDateFilter ].forEach((filter) => filter.addEventListener('change', renderDirectory));
[ elements.search, elements.globalSearch ].forEach((input) => input.addEventListener('input', () => {
  if (input === elements.globalSearch) elements.search.value = input.value;
  else elements.globalSearch.value = input.value;
  window.clearTimeout(state.searchTimer);
  state.searchTimer = window.setTimeout(async () => { if (state.view !== 'employees' && input.value.trim()) navigate('employees'); await refresh(); }, 220);
}));
byId('exportButton').addEventListener('click', exportCsv);
byId('chartPeriod').addEventListener('change', renderChart);
byId('mobileMenu').addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
document.querySelectorAll('.nav-item[data-view]').forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  const view = link.dataset.view;
  if (['leave', 'performance', 'payroll', 'reports'].includes(view)) openGenericView(view);
  else navigate(view);
}));
document.querySelectorAll('[data-view-link]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.viewLink)));
document.querySelectorAll('[data-quick]').forEach((button) => button.addEventListener('click', () => {
  const action = button.dataset.quick;
  if (action === 'add') openModal();
  else if (action === 'reports') exportCsv();
  else if (action === 'departments' || action === 'attendance') navigate(action);
  else openGenericView('leave');
}));
byId('backToEmployees').addEventListener('click', () => navigate('employees'));
byId('profileContent').addEventListener('click', (event) => {
  if (event.target.closest('[data-profile-action="edit"]')) openModal(state.selectedEmployee);
});
document.querySelector('.profile-tabs').addEventListener('click', (event) => {
  const tab = event.target.closest('[data-profile-tab]');
  if (!tab) return;
  state.profileTab = tab.dataset.profileTab;
  document.querySelectorAll('[data-profile-tab]').forEach((item) => item.classList.toggle('active', item === tab));
  renderProfile();
});
byId('employeeProfileHeader').addEventListener('click', async (event) => {
  const action = event.target.closest('[data-profile-action]')?.dataset.profileAction;
  if (action === 'edit') openModal(state.selectedEmployee);
  if (action === 'menu') { const menu = document.querySelector('[data-profile-menu]'); menu.hidden = !menu.hidden; }
  if (action === 'delete') await deleteEmployee(state.selectedEmployee);
});
document.querySelectorAll('[data-layout]').forEach((button) => button.addEventListener('click', () => {
  applyLayout(button.dataset.layout);
}));
byId('helpButton').addEventListener('click', () => showToast('Contact your PeopleFirst administrator for support.'));
byId('settingsButton').addEventListener('click', () => showToast('Workspace settings are not configured in this demo.'));
byId('notificationButton').addEventListener('click', () => showToast('You’re all caught up.'));
function closeOwnerMenus() {
  document.querySelectorAll('[data-owner-menu]').forEach((menu) => { menu.hidden = true; });
  document.querySelectorAll('[data-profile-toggle]').forEach((button) => button.setAttribute('aria-expanded', 'false'));
}
document.querySelectorAll('[data-profile-toggle]').forEach((button) => button.addEventListener('click', (event) => {
  event.stopPropagation();
  const menu = button.parentElement.querySelector('[data-owner-menu]');
  const opening = menu.hidden;
  closeOwnerMenus();
  menu.hidden = !opening;
  button.setAttribute('aria-expanded', String(opening));
}));
document.querySelectorAll('[data-owner-menu]').forEach((menu) => menu.addEventListener('click', (event) => {
  const action = event.target.closest('[data-owner-action]')?.dataset.ownerAction;
  if (!action) return;
  closeOwnerMenus();
  const messages = {
    profile: 'Signed in as Vedant Pokale · System Administrator.',
    account: 'Account settings are not configured in this demo.',
    system: 'System settings are not configured in this demo.',
    help: 'Contact your PeopleFirst administrator for support.',
    logout: 'Sign out is unavailable because authentication is not configured.'
  };
  showToast(messages[action] || 'This option is not available.');
}));
document.addEventListener('click', (event) => { if (!event.target.closest('.owner-menu-anchor')) closeOwnerMenus(); });
document.addEventListener('click', (event) => { if (!event.target.closest('.row-actions')) closeOpenMenus(); });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { if (!elements.modal.hidden) closeModal(); closeOwnerMenus(); closeOpenMenus(); document.querySelector('#sidebar').classList.remove('open'); }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); elements.globalSearch.focus(); }
});
setToday();
updateResponsiveLayout();
window.matchMedia('(max-width: 680px)').addEventListener('change', updateResponsiveLayout);
refresh();
