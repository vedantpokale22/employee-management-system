# Employee Management System — PeopleFirst

GitHub repository name: `employee-management-system`.

A coursework-ready employee management mini project using a plain HTML/CSS/JavaScript frontend, a Node.js + Express REST API, and a persistent SQLite database (powered by a WebAssembly SQLite engine to avoid native build tools).

## Features

- Employee-first dashboard with workforce KPIs, department distribution, employee overview, attendance sample, and recent directory activity.
- Add, view, edit, and delete employee records, with a dedicated profile and personal/employment/contact information.
- Search by name, email, role, department, or employee ID; filter by department, status, position, and joining date.
- Table and card views, CSV export, responsive navigation, validation, duplicate email/ID protection, and delete confirmation.
- Dedicated department and attendance views; leave, performance, payroll, and report navigation with clear demo-scope messaging.
- SQLite schema and starter records are created automatically on first run.

## Requirements

- Node.js 20 or newer, with npm.

## Run locally

1. Open this project folder in a terminal.
2. Install packages with `npm install`.
3. Start the development server with `npm run dev` (or `npm start`).
4. Open `http://localhost:3000` in a browser.

The database is stored in `.data/employees.db` and is created on first launch. It is excluded from version control.

The starter employee records and support email are demonstration placeholders; replace them with approved project data before presenting or deploying the app. Vedant Pokale is the sample logged-in system administrator identity, not an employee record.

## API overview

- `GET /api/employees` — list records; optional `search`, `department`, and `status` query parameters.
- `GET /api/employees/:id` — get one employee.
- `POST /api/employees` — create an employee.
- `PUT /api/employees/:id` — update an employee.
- `DELETE /api/employees/:id` — delete an employee.
- `GET /api/dashboard` — dashboard totals and department counts.

Employee fields: `employeeCode`, `firstName`, `lastName`, `email`, `phone`, `dateOfBirth`, `department`, `jobTitle`, `manager`, `startDate`, `employmentType`, `address`, `city`, `state`, `country`, `salary`, and `status` (`Active`, `On Leave`, or `Inactive`). Existing databases are migrated when the server starts.

## Project structure

- `server.js` — Express app, API routes, and server startup.
- `src/database.js` — SQLite initialization, seed records, and prepared queries.
- `public/` — browser UI (HTML, CSS, JavaScript).
- `.data/` — generated SQLite database.

## Notes for assessment

The UI calls the backend over JSON REST endpoints; employee records are persisted in SQLite, so they remain after restarting the server. Employee attendance percentages are illustrative demo values; detailed attendance, leave workflows, performance reviews, payroll processing, and authentication are not implemented. Replace the starter employee data and administrator profile before presenting or deploying the app.
