const express = require('express');
const path = require('node:path');
const initializeDatabase = require('./src/database');

const app = express();
const port = Number(process.env.PORT) || 3000;
const allowedStatuses = new Set(['Active', 'On Leave', 'Inactive']);
const fields = ['employeeCode', 'firstName', 'lastName', 'email', 'phone', 'department', 'jobTitle', 'startDate', 'dateOfBirth', 'employmentType', 'manager', 'address', 'city', 'state', 'country', 'salary', 'status'];
let db;
let columns;

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

function validateEmployee(body = {}) {
  const value = Object.fromEntries(fields.map((field) => [field, typeof body[field] === 'string' ? body[field].trim() : body[field]]));
  const errors = {};
  for (const field of ['employeeCode', 'phone', 'manager', 'address', 'city', 'state', 'country']) value[field] ??= '';
  value.dateOfBirth ||= null;
  const required = ['firstName', 'lastName', 'email', 'department', 'jobTitle', 'startDate', 'salary', 'status'];

  for (const field of required) {
    if (value[field] === undefined || value[field] === null || value[field] === '') errors[field] = 'This field is required.';
  }
  if (value.firstName && value.firstName.length > 60) errors.firstName = 'Use 60 characters or fewer.';
  if (value.lastName && value.lastName.length > 60) errors.lastName = 'Use 60 characters or fewer.';
  if (value.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) || value.email.length > 160)) errors.email = 'Enter a valid email address.';
  if (value.phone && value.phone.length > 30) errors.phone = 'Use 30 characters or fewer.';
  for (const field of ['department', 'jobTitle']) {
    if (value[field] && value[field].length > 80) errors[field] = 'Use 80 characters or fewer.';
  }
  if (value.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(value.startDate)) errors.startDate = 'Enter a valid start date.';
  if (value.startDate && Number.isNaN(Date.parse(`${value.startDate}T00:00:00Z`))) errors.startDate = 'Enter a valid start date.';
  if (value.dateOfBirth && (!/^\d{4}-\d{2}-\d{2}$/.test(value.dateOfBirth) || Number.isNaN(Date.parse(`${value.dateOfBirth}T00:00:00Z`)))) errors.dateOfBirth = 'Enter a valid date of birth.';
  if (value.employeeCode && !/^EMP-[A-Z0-9-]{2,20}$/i.test(value.employeeCode)) errors.employeeCode = 'Use an ID such as EMP-009.';
  for (const field of ['manager', 'address', 'city', 'state', 'country']) {
    if (value[field] && value[field].length > 120) errors[field] = 'Use 120 characters or fewer.';
  }
  if (!value.employmentType) value.employmentType = 'Full-time';
  if (value.employmentType && !['Full-time', 'Part-time', 'Contract', 'Intern'].includes(value.employmentType)) errors.employmentType = 'Choose a valid employment type.';
  const salary = Number(value.salary);
  if (value.salary !== undefined && (!Number.isFinite(salary) || salary < 0 || salary > 100000000)) errors.salary = 'Enter a valid non-negative annual salary.';
  if (value.status && !allowedStatuses.has(value.status)) errors.status = 'Choose a valid employment status.';
  value.salary = salary;
  value.email = typeof value.email === 'string' ? value.email.toLowerCase() : value.email;
  return { value, errors };
}

function sendDatabaseError(error, response) {
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || /UNIQUE constraint failed/i.test(error.message)) {
    if (/employee_code/i.test(error.message)) return response.status(409).json({ error: 'This employee ID is already in use.', fields: { employeeCode: 'Choose a unique employee ID.' } });
    return response.status(409).json({ error: 'An employee with this email already exists.' });
  }
  console.error(error);
  return response.status(500).json({ error: 'Something went wrong. Please try again.' });
}

app.get('/api/employees', (req, res) => {
  const { search = '', department = '', status = '' } = req.query;
  const conditions = [];
  const params = {};
  if (typeof search === 'string' && search.trim()) {
    conditions.push("(first_name || ' ' || last_name LIKE @search OR email LIKE @search OR employee_code LIKE @search OR department LIKE @search OR job_title LIKE @search)");
    params.search = `%${search.trim()}%`;
  }
  if (typeof department === 'string' && department.trim()) {
    conditions.push('department = @department');
    params.department = department.trim();
  }
  if (typeof status === 'string' && allowedStatuses.has(status)) {
    conditions.push('status = @status');
    params.status = status;
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const employees = db.prepare(`SELECT ${columns} FROM employees ${where} ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE`).all(params);
  res.json({ employees });
});

app.get('/api/employees/:id', (req, res) => {
  const employee = db.prepare(`SELECT ${columns} FROM employees WHERE id = ?`).get(Number(req.params.id));
  if (!employee) return res.status(404).json({ error: 'Employee not found.' });
  res.json({ employee });
});

app.post('/api/employees', (req, res) => {
  const { value, errors } = validateEmployee(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please check the highlighted information.', fields: errors });
  try {
    const result = db.prepare(`
      INSERT INTO employees (employee_code, first_name, last_name, email, phone, department, job_title, start_date,
        date_of_birth, employment_type, manager, address, city, state, country, salary, status)
      VALUES (@employeeCode, @firstName, @lastName, @email, @phone, @department, @jobTitle, @startDate,
        @dateOfBirth, @employmentType, @manager, @address, @city, @state, @country, @salary, @status)
    `).run({ ...value, employeeCode: value.employeeCode || null });
    if (!value.employeeCode) db.prepare('UPDATE employees SET employee_code = ? WHERE id = ?').run(`EMP-${String(result.lastInsertRowid).padStart(3, '0')}`, result.lastInsertRowid);
    const employee = db.prepare(`SELECT ${columns} FROM employees WHERE id = ?`).get(result.lastInsertRowid);
    res.status(201).json({ employee });
  } catch (error) {
    sendDatabaseError(error, res);
  }
});

app.put('/api/employees/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid employee ID.' });
  const { value, errors } = validateEmployee(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please check the highlighted information.', fields: errors });
  try {
    const result = db.prepare(`
      UPDATE employees SET employee_code = @employeeCode, first_name = @firstName, last_name = @lastName, email = @email, phone = @phone,
        department = @department, job_title = @jobTitle, start_date = @startDate, date_of_birth = @dateOfBirth,
        employment_type = @employmentType, manager = @manager, address = @address, city = @city, state = @state,
        country = @country, salary = @salary,
        status = @status, updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `).run({ ...value, employeeCode: value.employeeCode || `EMP-${String(id).padStart(3, '0')}`, id });
    if (!result.changes) return res.status(404).json({ error: 'Employee not found.' });
    const employee = db.prepare(`SELECT ${columns} FROM employees WHERE id = ?`).get(id);
    res.json({ employee });
  } catch (error) {
    sendDatabaseError(error, res);
  }
});

app.delete('/api/employees/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid employee ID.' });
  const result = db.prepare('DELETE FROM employees WHERE id = ?').run(id);
  if (!result.changes) return res.status(404).json({ error: 'Employee not found.' });
  res.status(204).end();
});

app.get('/api/dashboard', (_req, res) => {
  const summary = db.prepare(`
    SELECT COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END), 0) AS active,
      COUNT(DISTINCT department) AS departments,
      COALESCE(SUM(CASE WHEN status = 'Active' THEN salary ELSE 0 END), 0) AS annualPayroll
    FROM employees
  `).get();
  const departmentCounts = db.prepare(`
    SELECT department, COUNT(*) AS count FROM employees GROUP BY department ORDER BY count DESC, department ASC
  `).all();
  res.json({ summary, departmentCounts });
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: 'Request body must be valid JSON.' });
  console.error(error);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

initializeDatabase().then((database) => {
  db = database.db;
  columns = database.columns;
  const server = app.listen(port, () => console.log(`PeopleFirst is ready at http://localhost:${port}`));
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}).catch((error) => {
  console.error('Unable to initialize the SQLite database:', error);
  process.exitCode = 1;
});
