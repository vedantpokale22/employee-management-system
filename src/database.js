const fs = require('node:fs');
const path = require('node:path');
const dataDirectory = path.join(__dirname, '..', '.data');
fs.mkdirSync(dataDirectory, { recursive: true });

const initSqlJs = require('sql.js');
const databasePath = path.join(dataDirectory, 'employees.db');
const columns = `
  id,
  employee_code AS employeeCode,
  first_name AS firstName,
  last_name AS lastName,
  email,
  phone,
  department,
  job_title AS jobTitle,
  start_date AS startDate,
  date_of_birth AS dateOfBirth,
  employment_type AS employmentType,
  manager,
  address,
  city,
  state,
  country,
  salary,
  status,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

function normalizeParams(params) {
  if (params.length === 1 && params[0] && !Array.isArray(params[0]) && typeof params[0] === 'object') {
    return Object.fromEntries(Object.entries(params[0]).map(([key, value]) => [`@${key.replace(/^[@:$]/, '')}`, value]));
  }
  if (params.length === 1 && Array.isArray(params[0])) return params[0];
  return params;
}

function createDatabaseAdapter(database) {
  function prepare(sql) {
    return {
      get(...params) {
        const statement = database.prepare(sql);
        try {
          statement.bind(normalizeParams(params));
          return statement.step() ? statement.getAsObject() : undefined;
        } finally {
          statement.free();
        }
      },
      all(...params) {
        const statement = database.prepare(sql);
        const rows = [];
        try {
          statement.bind(normalizeParams(params));
          while (statement.step()) rows.push(statement.getAsObject());
          return rows;
        } finally {
          statement.free();
        }
      },
      run(...params) {
        database.run(sql, normalizeParams(params));
        const changes = database.getRowsModified();
        const lastInsertRowid = database.exec('SELECT last_insert_rowid() AS id')[0]?.values[0][0] ?? 0;
        persist();
        return { changes, lastInsertRowid };
      }
    };
  }

  function persist() {
    const temporaryPath = `${databasePath}.tmp`;
    fs.writeFileSync(temporaryPath, Buffer.from(database.export()));
    fs.renameSync(temporaryPath, databasePath);
  }

  return { prepare, persist };
}

async function initializeDatabase() {
  fs.mkdirSync(dataDirectory, { recursive: true });
  const SQL = await initSqlJs({ locateFile: (file) => require.resolve(`sql.js/dist/${file}`) });
  const rawDatabase = fs.existsSync(databasePath)
    ? new SQL.Database(new Uint8Array(fs.readFileSync(databasePath)))
    : new SQL.Database();

  rawDatabase.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_code TEXT UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      phone TEXT NOT NULL DEFAULT '',
      department TEXT NOT NULL,
      job_title TEXT NOT NULL,
      start_date TEXT NOT NULL,
      date_of_birth TEXT,
      employment_type TEXT NOT NULL DEFAULT 'Full-time',
      manager TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      salary REAL NOT NULL CHECK (salary >= 0),
      status TEXT NOT NULL CHECK (status IN ('Active', 'On Leave', 'Inactive')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const existingColumns = new Set(rawDatabase.exec('PRAGMA table_info(employees)')[0].values.map((column) => column[1]));
  const migrations = [
    ['employee_code', 'TEXT'],
    ['date_of_birth', 'TEXT'],
    ['employment_type', "TEXT NOT NULL DEFAULT 'Full-time'"],
    ['manager', "TEXT NOT NULL DEFAULT ''"],
    ['address', "TEXT NOT NULL DEFAULT ''"],
    ['city', "TEXT NOT NULL DEFAULT ''"],
    ['state', "TEXT NOT NULL DEFAULT ''"],
    ['country', "TEXT NOT NULL DEFAULT ''"]
  ];
  for (const [name, definition] of migrations) {
    if (!existingColumns.has(name)) rawDatabase.exec(`ALTER TABLE employees ADD COLUMN ${name} ${definition}`);
  }
  rawDatabase.exec(`UPDATE employees SET employee_code = printf('EMP-%03d', id) WHERE employee_code IS NULL OR employee_code = ''`);
  rawDatabase.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_employee_code ON employees(employee_code) WHERE employee_code IS NOT NULL AND employee_code <> ''`);
  const migrationAdapter = createDatabaseAdapter(rawDatabase);
  migrationAdapter.persist();

  const adapter = migrationAdapter;
  const employeeCount = adapter.prepare('SELECT COUNT(*) AS count FROM employees').get().count;
  if (employeeCount === 0) {
    const insert = adapter.prepare(`
      INSERT INTO employees
        (employee_code, first_name, last_name, email, phone, department, job_title, start_date, salary, status)
      VALUES
        (@employeeCode, @firstName, @lastName, @email, @phone, @department, @jobTitle, @startDate, @salary, @status)
    `);
    const employees = [
      { firstName: 'Olivia', lastName: 'Rhye', email: 'olivia.rhye@example.com', phone: '+1 (555) 010-2234', department: 'Design', jobTitle: 'Senior Product Designer', startDate: '2022-04-18', salary: 92000, status: 'Active' },
      { firstName: 'Phoenix', lastName: 'Baker', email: 'phoenix.baker@example.com', phone: '+1 (555) 010-8841', department: 'Engineering', jobTitle: 'Engineering Manager', startDate: '2021-08-02', salary: 128000, status: 'Active' },
      { firstName: 'Lana', lastName: 'Steiner', email: 'lana.steiner@example.com', phone: '+1 (555) 010-4512', department: 'Marketing', jobTitle: 'Marketing Coordinator', startDate: '2023-01-16', salary: 68000, status: 'On Leave' },
      { firstName: 'Demi', lastName: 'Wilkinson', email: 'demi.wilkinson@example.com', phone: '+1 (555) 010-6720', department: 'People', jobTitle: 'HR Business Partner', startDate: '2020-11-09', salary: 84000, status: 'Active' },
      { firstName: 'Candice', lastName: 'Wu', email: 'candice.wu@example.com', phone: '+1 (555) 010-3398', department: 'Engineering', jobTitle: 'Software Engineer', startDate: '2024-02-12', salary: 105000, status: 'Active' },
      { firstName: 'Natali', lastName: 'Craig', email: 'natali.craig@example.com', phone: '+1 (555) 010-1055', department: 'Finance', jobTitle: 'Financial Analyst', startDate: '2022-06-27', salary: 79000, status: 'Inactive' },
      { firstName: 'Drew', lastName: 'Cano', email: 'drew.cano@example.com', phone: '+1 (555) 010-9361', department: 'Customer Success', jobTitle: 'Customer Success Lead', startDate: '2023-09-04', salary: 88000, status: 'Active' },
      { firstName: 'Andi', lastName: 'Lane', email: 'andi.lane@example.com', phone: '+1 (555) 010-7433', department: 'Design', jobTitle: 'UX Researcher', startDate: '2024-05-20', salary: 81000, status: 'Active' }
    ];
    employees.forEach((employee, index) => insert.run({ ...employee, employeeCode: `EMP-${String(index + 1).padStart(3, '0')}` }));
  } else if (!fs.existsSync(databasePath)) {
    adapter.persist();
  }

  return { db: adapter, columns };
}

module.exports = initializeDatabase;
