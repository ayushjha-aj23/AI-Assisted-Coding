const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { createApp } = require('../src/app');
const { createDatabase } = require('../src/database');

const jwtSecret = 'test-secret-with-more-than-thirty-two-bytes';
let db;
let server;
let baseUrl;
let tempDirectory;

before(async () => {
  tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'user-api-test-'));
  db = createDatabase(path.join(tempDirectory, 'users.sqlite'));
  server = createApp({ db, jwtSecret }).listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
  if (db) db.close();
  if (tempDirectory) fs.rmSync(tempDirectory, { recursive: true, force: true });
});

async function request(route, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = response.status === 204 ? null : await response.json();
  return { response, data };
}

test('registers, authenticates, updates, and deletes a user', async () => {
  const registration = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Ada Lovelace', email: 'ADA@example.com', password: 'a-secure-password' }
  });
  assert.equal(registration.response.status, 201);
  assert.equal(registration.data.user.email, 'ada@example.com');
  assert.equal('passwordHash' in registration.data.user, false);
  assert.equal('password' in registration.data.user, false);
  const token = registration.data.token;

  const duplicate = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Ada', email: 'ada@example.com', password: 'another-password' }
  });
  assert.equal(duplicate.response.status, 409);

  const wrongPassword = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'ada@example.com', password: 'incorrect-password' }
  });
  assert.equal(wrongPassword.response.status, 401);

  const login = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'ADA@example.com', password: 'a-secure-password' }
  });
  assert.equal(login.response.status, 200);

  const unauthenticated = await request('/api/users/me');
  assert.equal(unauthenticated.response.status, 401);

  const update = await request('/api/users/me', {
    method: 'PATCH',
    token,
    body: { name: 'Ada Byron' }
  });
  assert.equal(update.response.status, 200);
  assert.equal(update.data.user.name, 'Ada Byron');

  const currentUser = await request('/api/users/me', { token });
  assert.equal(currentUser.response.status, 200);
  assert.equal(currentUser.data.user.email, 'ada@example.com');

  const deletion = await request('/api/users/me', { method: 'DELETE', token });
  assert.equal(deletion.response.status, 204);

  const deletedUser = await request('/api/users/me', { token });
  assert.equal(deletedUser.response.status, 401);
});

test('rejects invalid registration data and update fields', async () => {
  const registration = await request('/api/auth/register', {
    method: 'POST',
    body: { name: '', email: 'not-an-email', password: 'short' }
  });
  assert.equal(registration.response.status, 400);

  const created = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Grace Hopper', email: 'grace@example.com', password: 'a-secure-password' }
  });
  const update = await request('/api/users/me', {
    method: 'PATCH',
    token: created.data.token,
    body: { role: 'admin' }
  });
  assert.equal(update.response.status, 400);
});
