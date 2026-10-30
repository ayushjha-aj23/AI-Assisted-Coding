# Project Instructions

These guidelines apply to AI-assisted changes in this repository. Keep changes scoped to the request, inspect existing code and documentation before editing, and preserve unrelated work.

## Project Structure

- The backend is a Node.js CommonJS application in `src/`, built with Express and `better-sqlite3`.
- `src/app.js` defines API routes and validation, `src/auth.js` handles JWT creation and authentication, `src/database.js` initializes SQLite, and `src/server.js` configures and starts the server.
- `test/` contains the Node.js API integration tests.
- Root-level UI and demo files are separate from the backend. Do not modify them unless the request requires it.
- Read `README.md` for setup and endpoint documentation; update it when API behavior or setup changes.

## Implementation

- Follow the existing CommonJS style and keep route logic, authentication, and database setup in their current modules.
- Validate request data and return explicit, appropriate HTTP status codes. Do not expose password hashes, JWT secrets, or other credentials in responses or logs.
- Hash passwords with bcrypt. Keep JWT verification restricted to the configured algorithm and require authenticated routes to use the existing middleware.
- Use parameterized SQLite statements for values. Do not interpolate untrusted input into SQL.
- Keep secrets in environment variables; never commit `.env` files, database files, or credentials. Update `.env.example` with placeholder values if configuration changes.
- Preserve existing API behavior unless the request calls for a change. Add or update tests for behavior changes.

## Verification

- Run the focused API suite with `npm test`.
- For server startup, configure `JWT_SECRET` as described in `README.md` before running `npm start`.
- Report commands that were run and any validation that could not be completed.
