require('dotenv').config();
const { createApp } = require('./app');
const { createDatabase } = require('./database');

const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}
if (typeof jwtSecret !== 'string' || Buffer.byteLength(jwtSecret) < 32) {
  throw new Error('Set JWT_SECRET to a secret of at least 32 bytes');
}

const db = createDatabase();
const app = createApp({ db, jwtSecret });
const server = app.listen(port, () => {
  console.log(`User API listening on port ${port}`);
});

function shutdown() {
  server.close(error => {
    if (error) {
      console.error('Failed to close the HTTP server:', error);
      process.exitCode = 1;
    }
    db.close();
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
