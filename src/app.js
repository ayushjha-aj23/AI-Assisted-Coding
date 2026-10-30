const { randomUUID } = require('node:crypto');
const bcrypt = require('bcryptjs');
const express = require('express');
const helmet = require('helmet');
const { createAuthMiddleware, createToken } = require('./auth');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BCRYPT_PASSWORD_BYTES = 72;

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function validateName(name) {
  if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 100) {
    return 'Name must be a non-empty string of at most 100 characters';
  }
  return null;
}

function validateEmail(email) {
  if (typeof email !== 'string') {
    return 'A valid email address is required';
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) {
    return 'A valid email address is required';
  }
  return null;
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_BCRYPT_PASSWORD_BYTES) {
    return 'Password must not exceed 72 UTF-8 bytes';
  }
  return null;
}

function createApp({ db, jwtSecret }) {
  if (!db || typeof db.prepare !== 'function') {
    throw new TypeError('A SQLite database connection is required');
  }
  if (typeof jwtSecret !== 'string' || Buffer.byteLength(jwtSecret) < 32) {
    throw new Error('JWT_SECRET must be set to a secret of at least 32 bytes');
  }

  const app = express();
  const requireAuth = createAuthMiddleware(db, jwtSecret);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '16kb' }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/auth/register', async (req, res, next) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'A JSON object is required' });
    }

    const nameError = validateName(body.name);
    const emailError = validateEmail(body.email);
    const passwordError = validatePassword(body.password);
    const validationError = nameError || emailError || passwordError;
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    try {
      const now = new Date().toISOString();
      const user = {
        id: randomUUID(),
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        passwordHash: await bcrypt.hash(body.password, 12),
        createdAt: now,
        updatedAt: now
      };

      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
        VALUES (@id, @name, @email, @passwordHash, @createdAt, @updatedAt)
      `).run(user);

      return res.status(201).json({
        user: publicUser(user),
        token: createToken(user.id, jwtSecret)
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/auth/login', async (req, res, next) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        typeof body.email !== 'string' || typeof body.password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
      const email = body.email.trim().toLowerCase();
      const user = db.prepare(`
        SELECT id, name, email, password_hash AS passwordHash,
          created_at AS createdAt, updated_at AS updatedAt
        FROM users
        WHERE email = ?
      `).get(email);

      if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      return res.json({
        user: publicUser(user),
        token: createToken(user.id, jwtSecret)
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/users/me', requireAuth, (req, res) => {
    res.json({ user: publicUser(req.user) });
  });

  app.patch('/api/users/me', requireAuth, (req, res, next) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'A JSON object is required' });
    }

    const fields = Object.keys(body);
    if (fields.length === 0 || fields.some(field => field !== 'name' && field !== 'email')) {
      return res.status(400).json({ error: 'Provide name and/or email to update' });
    }

    if (Object.hasOwn(body, 'name')) {
      const error = validateName(body.name);
      if (error) return res.status(400).json({ error });
    }
    if (Object.hasOwn(body, 'email')) {
      const error = validateEmail(body.email);
      if (error) return res.status(400).json({ error });
    }

    const updates = {};
    if (Object.hasOwn(body, 'name')) updates.name = body.name.trim();
    if (Object.hasOwn(body, 'email')) updates.email = body.email.trim().toLowerCase();

    const assignments = Object.keys(updates).map(field => `${field} = @${field}`);
    assignments.push('updated_at = @updatedAt');

    try {
      db.prepare(`
        UPDATE users
        SET ${assignments.join(', ')}
        WHERE id = @id
      `).run({ ...updates, updatedAt: new Date().toISOString(), id: req.user.id });

      const user = db.prepare(`
        SELECT id, name, email, created_at AS createdAt, updated_at AS updatedAt
        FROM users
        WHERE id = ?
      `).get(req.user.id);
      return res.json({ user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/users/me', requireAuth, (req, res, next) => {
    try {
      db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
      return res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Email address is already registered' });
    }

    console.error('Unhandled API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
