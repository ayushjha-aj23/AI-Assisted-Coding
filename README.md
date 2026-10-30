# User REST API

An Express API that stores users in a local SQLite database and uses signed JWT bearer tokens for authentication.

## Setup

Requires Node.js 20. Install dependencies and configure the environment:

```sh
npm install
cp .env.example .env
```

Set `JWT_SECRET` in `.env` to a private random value of at least 32 bytes. For example, generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. The server refuses to start without a sufficiently long secret. `DATABASE_PATH` defaults to `./data/users.sqlite`; its parent directory is created automatically.

Start the service with `npm start`; it listens on port `3000` by default. Set `PORT` to change the port. Run integration tests with `npm test`.

## Routes

All request bodies are JSON.

| Method | Path | Authentication | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | No | Health check |
| `POST` | `/api/auth/register` | No | Create an account with `{ "name", "email", "password" }`; returns the user and a JWT |
| `POST` | `/api/auth/login` | No | Sign in with `{ "email", "password" }`; returns the user and a JWT |
| `GET` | `/api/users/me` | Bearer token | Get the authenticated user's profile |
| `PATCH` | `/api/users/me` | Bearer token | Update `name` and/or `email` |
| `DELETE` | `/api/users/me` | Bearer token | Delete the authenticated user's account |

Use the returned token in the `Authorization: Bearer <token>` header. Tokens expire after one hour. Passwords are stored as bcrypt hashes and never returned by the API. Email addresses are normalized to lowercase. Registration and profile updates return `409` if the email is already in use.
