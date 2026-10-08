const fs = require('node:fs');
const path = require('node:path');
const PDFDocument = require('pdfkit');

const root = path.join(__dirname, '..');
const outputPath = path.join(root, 'Employee-Management-System-Report.pdf');
const doc = new PDFDocument({ size: 'A4', margins: { top: 58, bottom: 58, left: 62, right: 62 }, bufferPages: true, info: {
  Title: 'PeopleFirst Employee Management System — Project Report',
  Author: 'Vedant Pokale',
  Subject: 'Employee Management System Mini Project'
} });
const output = fs.createWriteStream(outputPath);
doc.pipe(output);

const colors = { navy: '#080B12', panel: '#11151D', purple: '#8B5CF6', white: '#F8FAFC', muted: '#526071', border: '#DCE2EA', pale: '#F3F0FC', green: '#15803D' };
const pageWidth = doc.page.width;
const contentWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;

function text(value, options = {}) {
  doc.fillColor(options.color || colors.navy).font(options.font || 'Helvetica').fontSize(options.size || 10).text(value, options.x ?? doc.page.margins.left, options.y ?? doc.y, {
    width: options.width ?? contentWidth,
    lineGap: options.lineGap ?? 2,
    align: options.align || 'left',
    continued: options.continued || false
  });
}

function newPageIfNeeded(required = 70) {
  if (doc.y + required > doc.page.height - doc.page.margins.bottom) doc.addPage();
}

function heading(label, title) {
  newPageIfNeeded(70);
  doc.moveDown(0.35);
  text(label.toUpperCase(), { size: 8, color: colors.purple, font: 'Helvetica-Bold' });
  doc.moveDown(0.25);
  text(title, { size: 19, font: 'Helvetica-Bold' });
  doc.moveDown(0.45);
}

function paragraph(value) {
  text(value, { size: 9.4, color: '#263242', lineGap: 3.5 });
  doc.moveDown(0.55);
}

function bullet(value) {
  const x = doc.page.margins.left + 8;
  const y = doc.y;
  doc.circle(x + 2, y + 5, 2).fillColor(colors.purple).fill();
  text(value, { x: x + 12, y: y - 1, width: contentWidth - 20, size: 9.2, color: '#263242', lineGap: 2 });
  doc.moveDown(0.25);
}

function bullets(values) { values.forEach(bullet); doc.moveDown(0.35); }

function table(headers, rows, widths, options = {}) {
  const rowFont = options.fontSize || 8;
  const cellPadding = 6;
  const xStart = doc.page.margins.left;
  let x = xStart;
  let y = doc.y;
  const drawRow = (cells, fill, bold = false) => {
    const heights = cells.map((cell, index) => doc.heightOfString(String(cell), { width: widths[index] - cellPadding * 2, font: bold ? 'Helvetica-Bold' : 'Helvetica', fontSize: rowFont, lineGap: 1 }));
    const height = Math.max(24, Math.max(...heights) + cellPadding * 2);
    if (y + height > doc.page.height - doc.page.margins.bottom) { doc.addPage(); y = doc.y; }
    x = xStart;
    cells.forEach((cell, index) => {
      if (fill) doc.rect(x, y, widths[index], height).fill(fill);
      doc.rect(x, y, widths[index], height).lineWidth(0.45).stroke(colors.border);
      doc.fillColor(bold ? colors.white : '#263242').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(rowFont).text(String(cell), x + cellPadding, y + cellPadding, { width: widths[index] - cellPadding * 2, height: height - cellPadding * 2, lineGap: 1 });
      x += widths[index];
    });
    y += height;
    doc.y = y;
  };
  drawRow(headers, colors.panel, true);
  rows.forEach((row, index) => drawRow(row, index % 2 ? '#F7F8FA' : '#FFFFFF'));
  doc.moveDown(0.55);
}

function codeBlock(value) {
  const height = doc.heightOfString(value, { width: contentWidth - 24, font: 'Courier', fontSize: 8, lineGap: 3 }) + 20;
  newPageIfNeeded(height + 10);
  const y = doc.y;
  doc.roundedRect(doc.page.margins.left, y, contentWidth, height, 5).fill('#F4F5F7');
  doc.fillColor('#263242').font('Courier').fontSize(8).text(value, doc.page.margins.left + 12, y + 10, { width: contentWidth - 24, lineGap: 3 });
  doc.y = y + height + 12;
}

function linkLine(label, url) {
  doc.fillColor(colors.purple).font('Helvetica').fontSize(9).text(`${label}: ${url}`, { link: url, underline: true, width: contentWidth });
  doc.moveDown(0.35);
}

// Cover
const coverTop = 118;
doc.rect(0, 0, pageWidth, 390).fill(colors.navy);
doc.roundedRect(doc.page.margins.left, 56, 104, 26, 6).fill('#211A31');
doc.fillColor('#D7C6FF').font('Helvetica-Bold').fontSize(8).text('PEOPLEFIRST  /  EMS', doc.page.margins.left + 12, 65);
doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(30).text('Employee Management\nSystem', doc.page.margins.left, coverTop, { width: contentWidth - 10, lineGap: 4 });
doc.fillColor('#C7B7E8').font('Helvetica').fontSize(13).text('Project Report', doc.page.margins.left, coverTop + 86);
doc.moveTo(doc.page.margins.left, coverTop + 124).lineTo(pageWidth - doc.page.margins.right, coverTop + 124).lineWidth(1).stroke('#393149');
doc.fillColor('#B6C0CF').font('Helvetica').fontSize(10).text('A responsive full-stack employee directory and management platform.', doc.page.margins.left, coverTop + 145, { width: contentWidth - 20 });

const detailY = 438;
const detailRows = [
  ['STUDENT', 'Vedant Pokale'],
  ['BRANCH', 'ENCS'],
  ['SECTION', 'C'],
  ['SERIAL NUMBER', '49'],
  ['PROJECT', 'PeopleFirst — Employee Management System'],
  ['TECHNOLOGY', 'HTML · CSS · JavaScript · Node.js · Express · SQLite'],
  ['DATE', 'Wednesday, October 7, 2026']
];
detailRows.forEach((row, index) => {
  const y = detailY + index * 43;
  doc.fillColor(colors.muted).font('Helvetica-Bold').fontSize(7.5).text(row[0], doc.page.margins.left, y, { width: 105 });
  doc.fillColor(colors.navy).font('Helvetica').fontSize(10).text(row[1], doc.page.margins.left + 112, y - 1, { width: contentWidth - 112 });
  doc.moveTo(doc.page.margins.left, y + 24).lineTo(pageWidth - doc.page.margins.right, y + 24).lineWidth(0.5).stroke(colors.border);
});
doc.fillColor(colors.muted).font('Helvetica').fontSize(8).text('GitHub: github.com/vedantpokale22/employee-management-system', doc.page.margins.left, detailY + detailRows.length * 43 + 7, { link: 'https://github.com/vedantpokale22/employee-management-system', underline: true });
doc.addPage();

// 1. Executive summary
heading('01 · Overview', 'Executive Summary');
paragraph('PeopleFirst is a browser-based Employee Management System (EMS) for maintaining employee records and viewing essential workforce information. The application combines a responsive HTML, CSS, and JavaScript interface with a Node.js and Express REST API and a persistent SQLite database. Its primary workflow is employee management: users can create, search, view, update, filter, export, and delete employee records.');
paragraph('The system includes a dashboard with employee-focused summaries, department distribution, a recent employee list, and employee profile views. Vedant Pokale is represented as the sample logged-in system administrator and is not part of the seeded employee records.');
paragraph('This is a functional coursework/demo system. Attendance figures are illustrative; leave approval, performance reviews, payroll processing, authentication, and authorization are not implemented.');

// 2. Introduction and problem
heading('02 · Context', 'Introduction and Problem Statement');
paragraph('Employee information is often spread across spreadsheets and disconnected documents. Common tasks—finding a person, checking their position or department, updating employment information, and maintaining consistency—can become slow and error-prone.');
paragraph('PeopleFirst addresses this need with one employee directory backed by a structured database. A browser interface communicates with a server through JSON REST endpoints. The server validates employee data before saving it to SQLite, while the interface supports directory workflows across desktop and mobile screen sizes.');

// 3. Aim and objectives
heading('03 · Goals', 'Aim and Objectives');
paragraph('Aim: design and implement a responsive Employee Management System that stores and manages employee and organizational information through a web interface.');
bullets([
  'Centralize employee records and employment details in one directory.',
  'Support create, read, update, and delete (CRUD) operations.',
  'Search by name, email, employee ID, department, and job title.',
  'Filter by department, status, position, and joining date.',
  'Provide workforce counts and department distribution.',
  'Persist records in SQLite between application restarts.',
  'Validate inputs on the server and use parameterized database queries.',
  'Provide responsive table/card views, profiles, and CSV export.'
]);

// 4. Scope
heading('04 · Scope', 'Project Scope');
text('Included', { size: 11, font: 'Helvetica-Bold' }); doc.moveDown(0.3);
bullets(['Employee dashboard, KPIs, chart, department distribution, and recent employee records.', 'Directory table and card layouts with search, filters, CSV export, and actions.', 'Employee profile and add/edit form for personal, employment, and contact information.', 'Department and illustrative attendance views.', 'SQLite initialization, schema migration, and sample records.']);
text('Not included', { size: 11, font: 'Helvetica-Bold' }); doc.moveDown(0.3);
bullets(['Authentication, authorization, roles, and secure account management.', 'Live attendance event storage, leave approvals, performance reviews, or payroll processing.', 'Notifications, audit trail, cloud hosting, or backup administration.']);
paragraph('These boundaries are intentional for the project scope. Incomplete workflows are identified in the interface rather than presented as live business data.');

// 5. Stack
heading('05 · Implementation', 'Technology Stack');
table(['Layer', 'Technology', 'Responsibility'], [
  ['Frontend', 'HTML5', 'Semantic application structure, tables and forms'],
  ['Styling', 'CSS3', 'Dark enterprise theme, responsive layout, and states'],
  ['Browser logic', 'Vanilla JavaScript', 'REST calls, rendering, filtering, and interactions'],
  ['Runtime', 'Node.js 20+', 'Server-side JavaScript runtime'],
  ['Backend', 'Express 4', 'Static files, REST routes, JSON, and error handling'],
  ['Database', 'SQLite / sql.js', 'Persistent relational records via WebAssembly'],
  ['Tooling', 'npm', 'Dependency installation and run scripts']
], [95, 128, contentWidth - 223]);
paragraph('The requested coursework stack permits Node.js/Express or Python/Flask and SQLite or MongoDB. This implementation uses Node.js, Express, and SQLite.');

// 6. Architecture
heading('06 · Architecture', 'System Architecture');
codeBlock('Browser UI\n   ↓ JSON over HTTP\nExpress REST API\n   ↓ validate and normalize\nParameterized SQL via sql.js\n   ↓\n.data/employees.db');
paragraph('Request flow: a browser action sends a JSON fetch request; Express validates input; the API binds values into SQL statements; sql.js updates the SQLite database and persists the database file; Express returns a JSON response; the UI refreshes the relevant view.');

// 7. Modules
heading('07 · Modules', 'Main Features');
text('Dashboard', { size: 10, font: 'Helvetica-Bold' }); doc.moveDown(0.2);
paragraph('Shows total, active, department, and on-leave employee counts; an employee overview chart; department distribution; recent employees; quick actions; and an explicitly illustrative attendance snapshot. Chart points are reconstructed from current employee start dates and are not historical snapshots.');
text('Employee directory', { size: 10, font: 'Helvetica-Bold' }); doc.moveDown(0.2);
paragraph('Supports search, filters by department/status/position/joining date, employee table and card views, profile access, editing, deletion confirmation, and CSV export of matching records.');
text('Employee records and profiles', { size: 10, font: 'Helvetica-Bold' }); doc.moveDown(0.2);
paragraph('Profiles organize contact and employment information into tabs. The add/edit form captures identity, work role, department, manager, joining date, employment type, salary, and optional address details. Generated IDs use a pattern such as EMP-009.');
text('Other screens', { size: 10, font: 'Helvetica-Bold' }); doc.moveDown(0.2);
paragraph('Departments are derived from the employees in SQLite. Attendance percentages are demo-only. Leave, performance, and payroll screens explain that those workflows have not been implemented.');

// 8. Data model
heading('08 · Database', 'Database Design');
paragraph('The application uses one primary relational table: employees. The schema includes an internal auto-increment ID, a unique employee code, employee name and email, phone, department, job title, joining date, date of birth, employment type, manager, address fields, salary, status, and created/updated timestamps.');
table(['Data group', 'Fields / rules'], [
  ['Identity', 'id (primary key), employee_code (unique), first_name, last_name'],
  ['Contact', 'email (case-insensitive unique), phone, address, city, state, country'],
  ['Employment', 'department, job_title, manager, start_date, employment_type, status'],
  ['Compensation', 'salary: required, numeric and non-negative'],
  ['Metadata', 'created_at and updated_at timestamps']
], [112, contentWidth - 112]);
paragraph('The database module creates the table on first run and migrates existing files to add newer profile columns. Starter records are inserted only when the employee table is empty. The database file is written under .data/employees.db and excluded from Git.');

// 9. API
heading('09 · Backend API', 'REST API Endpoints');
table(['Method', 'Endpoint', 'Purpose'], [
  ['GET', '/api/employees', 'List employees; accepts search, department, status'],
  ['GET', '/api/employees/:id', 'Retrieve one employee by internal ID'],
  ['POST', '/api/employees', 'Create a validated employee record'],
  ['PUT', '/api/employees/:id', 'Update an employee record'],
  ['DELETE', '/api/employees/:id', 'Delete an employee record'],
  ['GET', '/api/dashboard', 'Return summary totals and department counts']
], [58, 150, contentWidth - 208]);
paragraph('Typical responses include 200 OK, 201 Created, and 204 No Content. Errors use 400 Bad Request for invalid input, 404 Not Found for missing records/routes, and 409 Conflict for duplicate email or employee ID.');

// 10. Validation and security
heading('10 · Safeguards', 'Validation, Security, and Privacy');
bullets([
  'Required field, format, and maximum-length checks are enforced server-side.',
  'Email addresses are normalized to lowercase; statuses and employment types use allowlists.',
  'Dates must use an ISO-style format; salary must be numeric, finite, non-negative, and within the configured limit.',
  'Employee IDs and emails are unique; duplicate records return conflict responses.',
  'SQL user values are bound as parameters rather than concatenated into queries.',
  'Frontend rendering escapes employee-provided strings before inserting them into markup.'
]);
paragraph('The demo has no login or access control. Home address, date of birth, email, and salary can be sensitive personal data. Do not publish real employee information until authentication, authorization, privacy review, secure hosting, and suitable safeguards are in place.');

// 11. User interface
heading('11 · User Experience', 'Interface and Accessibility');
paragraph('The dark navy interface uses restrained purple accents, subtle borders, clear typography, and responsive panels. Desktop users receive a fixed sidebar; tablet and phone layouts use a drawer. Directory records can be shown as a table or as cards.');
bullets(['Semantic labels and headings, named controls, and dialog roles.', 'Visible keyboard focus indicators and accessible status/toast announcements.', 'Escape closes menus/dialogs; Ctrl/Cmd+K focuses global search.', 'Reduced-motion preferences are respected.', 'Responsive layouts stack dashboard content and employee cards at narrow widths.']);

// 12. Operation
heading('12 · Running the Application', 'Installation and Operation');
table(['Step', 'Action'], [
  ['1', 'Install Node.js 20+ and npm.'],
  ['2', 'Open the Employee Management System project directory in a terminal.'],
  ['3', 'Run npm install to install dependencies.'],
  ['4', 'Run npm run dev for development, or npm start for a normal run.'],
  ['5', 'Open http://localhost:3000 in a browser.'],
  ['6', 'Press Ctrl+C in the server terminal to stop the process.']
], [45, contentWidth - 45]);
paragraph('Do not start a second server on the same port while the first process is still running. The generated SQLite file is local to the machine unless a separate hosting/synchronization system is configured.');

// 13. Testing
heading('13 · Verification', 'Testing and Results');
table(['Check', 'Observed result'], [
  ['Node syntax checks', 'Server, database, and browser scripts passed.'],
  ['Employee listing and dashboard', '8 records; 6 active employees; 6 departments.'],
  ['Search and department/status filters', 'Matching records returned in smoke checks.'],
  ['Employee ID search and duplicate checks', 'Search worked; duplicate ID was rejected.'],
  ['Create, update, delete API', 'Passed; temporary test records were removed.'],
  ['Profile and tab navigation', 'Employee details and profile tabs rendered.'],
  ['Table/card switch', 'Both layouts displayed the employee set.'],
  ['Responsive layout', 'No document-wide overflow in tested browser view.']
], [145, contentWidth - 145]);
paragraph('These are implementation-time manual smoke checks, not a comprehensive automated test suite. Counts represent the current demonstration database and may change when records are edited.');

// 14. Structure
heading('14 · Source Layout', 'Project Structure');
table(['Path', 'Purpose'], [
  ['server.js', 'Express server, API routes, validation, startup.'],
  ['src/database.js', 'SQLite schema, migrations, sample data, persistence adapter.'],
  ['public/index.html', 'Dashboard, directory, profile, and form markup.'],
  ['public/app.js', 'Browser API calls, rendering, profiles, filters, export.'],
  ['public/styles.css', 'Core dark theme and responsive dashboard styling.'],
  ['public/responsive.css', 'Drawer navigation and small-screen layout.'],
  ['README.md', 'Quick setup, feature summary, and API guide.'],
  ['REPORT.md', 'Full coursework project report source.']
], [140, contentWidth - 140]);

// 15. Limitations and conclusion
heading('15 · Future Work', 'Limitations and Enhancements');
bullets(['Implement login, secure sessions, authorization, and role-based permissions.', 'Add automated API and UI tests, pagination, and server-side sorting.', 'Add audit logs, backup/restore, production logging, and secure deployment.', 'Implement attendance events, shifts, leave requests, and approval workflows.', 'Add performance-review records and a documented payroll workflow/integration.', 'Use a real historical workforce data model for chart trends.', 'Replace demonstration seed data and support placeholders before real use.']);
heading('16 · Conclusion', 'Conclusion');
paragraph('PeopleFirst demonstrates a full-stack foundation for employee record management. It connects a responsive vanilla JavaScript interface to an Express REST API and persistent SQLite storage. The system validates employee data and supports directory, profile, search, filter, and export workflows. The project is suitable as a coursework demonstration; the stated security, privacy, and workflow limitations should be addressed before any production use.');

// References and placeholders
heading('17 · References', 'Project References and Submission Details');
linkLine('GitHub source repository', 'https://github.com/vedantpokale22/employee-management-system');
paragraph('Project setup and API details are documented in README.md. Main backend and database implementations are in server.js and src/database.js.');
doc.moveDown(0.4);
table(['Submission field', 'Details'], [
  ['Student name', 'Vedant Pokale'],
  ['Branch', 'ENCS'],
  ['Section', 'C'],
  ['Serial number', '49'],
  ['Course / subject', 'MDM Backend Development'],
  ['Institution', 'Ramdeobaba University'],
  ['Faculty / guide', 'Sameer Tembhurney']
], [142, contentWidth - 142]);

// 18. Dashboard screenshots
heading('18 · Application Screens', 'Dashboard Screenshots');
paragraph('The dashboard is shown in four consecutive captures so its workforce metrics, charts, employee records, attendance snapshot, and activity feed remain readable in the PDF.');
const dashboardScreenshots = [
  { file: 'dashboard-full-view.png', title: 'Complete dashboard view' },
  { file: 'dashboard-01-overview.png', title: 'Dashboard overview and workforce metrics' },
  { file: 'dashboard-02-teams.png', title: 'Employee overview and department distribution' },
  { file: 'dashboard-03-employees.png', title: 'Recent employee records and quick actions' },
  { file: 'dashboard-04-attendance.png', title: 'Attendance snapshot and recent activity' }
];
dashboardScreenshots.forEach((screenshot, index) => {
  if (index > 0) doc.addPage();
  text(screenshot.title, { size: 11, font: 'Helvetica-Bold' });
  doc.moveDown(0.4);
  const imagePath = path.join(root, 'report-assets', screenshot.file);
  const image = doc.openImage(imagePath);
  const imageY = doc.y;
  const availableHeight = doc.page.height - doc.page.margins.bottom - imageY;
  const scale = Math.min(contentWidth / image.width, availableHeight / image.height);
  const imageWidth = image.width * scale;
  const imageHeight = image.height * scale;
  doc.image(image, doc.page.margins.left + (contentWidth - imageWidth) / 2, imageY, { width: imageWidth, height: imageHeight });
  doc.y = imageY + imageHeight + 10;
});

// Add page chrome without triggering PDFKit's automatic page-break behavior.
const range = doc.bufferedPageRange();
const contentPageCount = range.count;
for (let index = 1; index < contentPageCount; index += 1) {
  doc.switchToPage(index);
  const pageNumber = index + 1;
  const bottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  doc.y = 31;
  doc.save();
  doc.rect(0, 0, pageWidth, 31).fill(colors.navy);
  doc.fillColor('#D7C6FF').font('Helvetica-Bold').fontSize(8).text('PEOPLEFIRST', doc.page.margins.left, 11);
  doc.fillColor('#B6C0CF').font('Helvetica').fontSize(8).text('EMPLOYEE MANAGEMENT SYSTEM · PROJECT REPORT', pageWidth - doc.page.margins.right - 235, 11, { width: 235, align: 'right' });
  doc.moveTo(doc.page.margins.left, doc.page.height - 39).lineTo(pageWidth - doc.page.margins.right, doc.page.height - 39).lineWidth(.5).stroke(colors.border);
  doc.fillColor(colors.muted).font('Helvetica').fontSize(8).text('Vedant Pokale  ·  ENCS  ·  Section C  ·  Serial No. 49', doc.page.margins.left, doc.page.height - 29, { width: contentWidth - 60 });
  doc.fillColor(colors.muted).text(`${pageNumber}`, pageWidth - doc.page.margins.right - 30, doc.page.height - 29, { width: 30, align: 'right' });
  doc.restore();
  doc.page.margins.bottom = bottomMargin;
}

const pageCount = doc.bufferedPageRange().count;
if (pageCount !== contentPageCount) throw new Error(`PDF decoration unexpectedly added pages (${contentPageCount} -> ${pageCount}).`);
doc.end();
output.on('finish', () => console.log(`PDF report created (${pageCount} pages): ${outputPath}`));
output.on('error', (error) => { console.error('Unable to write report PDF:', error); process.exitCode = 1; });
