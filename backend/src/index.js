/**
 * VisionQuantech CRM Platform - Contacts API
 *
 * Demo contacts API (in-memory store). Production deployments should swap
 * the in-memory store for Postgres (DATABASE_URL) — see README.
 *
 * Required env vars (see ../../.env.example):
 *   PORT          - HTTP port (default 8004)
 *   API_KEY       - shared secret; every non-public endpoint requires it
 *                   in the `x-api-key` header (default: demo key below,
 *                   override in production; boot fails if unset in prod)
 *   CORS_ORIGINS  - comma-separated allowed origins (default none = no CORS)
 *   SEED_DEMO     - seed demo contacts on boot (default "true")
 *   NODE_ENV      - "production" enables stricter boot checks
 *
 * Public endpoints:  GET /            (service banner)
 *                    GET /health      (liveness probe)
 * Everything else requires the API key.
 */
'use strict';

const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const Joi = require('joi');
const dotenv = require('dotenv');

dotenv.config();

const PORT = parseInt(process.env.PORT || '8004', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const SEED_DEMO = (process.env.SEED_DEMO || 'true').toLowerCase() === 'true';

// ---------------------------------------------------------------------------
// API key resolution. No hardcoded secrets: the default demo key exists only
// so a fresh clone boots with `cp .env.example .env`; production refuses to
// boot without an explicitly configured key.
// ---------------------------------------------------------------------------
const DEFAULT_DEMO_KEY = 'dev-demo-key-change-me';
let API_KEY = process.env.API_KEY;
if (!API_KEY) {
  if (NODE_ENV === 'production') {
    console.error('[fatal] API_KEY is not set and NODE_ENV=production. Refusing to boot.');
    process.exit(1);
  }
  API_KEY = DEFAULT_DEMO_KEY;
  console.warn('[warn] API_KEY not set — using demo key. Set API_KEY in .env for anything real.');
}

// ---------------------------------------------------------------------------
// CORS: explicit allow-list, never wide-open "*" when credentials are used.
// ---------------------------------------------------------------------------
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const app = express();
app.use(helmet());
app.use(
  cors({
    origin: CORS_ORIGINS.length > 0 ? CORS_ORIGINS : false,
  })
);
app.use(express.json({ limit: '256kb' }));

// ---------------------------------------------------------------------------
// In-memory demo store. Contacts: { id, name, email, company, phone, notes,
// createdAt, updatedAt }. Swap for Postgres in production.
// ---------------------------------------------------------------------------
let contacts = [];
let nextId = 1;

if (SEED_DEMO) {
  contacts = [
    {
      id: nextId++,
      name: 'Aarav Mehta',
      email: 'aarav.mehta@example.com',
      company: 'Skyline Builders',
      phone: '+91-98765-43210',
      notes: 'Demo contact — site visit interest (2BHK)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: nextId++,
      name: 'Priya Nair',
      email: 'priya.nair@example.com',
      company: 'CityCare Clinic',
      phone: '+91-98111-22334',
      notes: 'Demo contact — follow-up call pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
const contactSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  email: Joi.string().trim().email().max(160).required(),
  company: Joi.string().trim().max(160).allow('', null),
  phone: Joi.string().trim().pattern(/^[+\d][\d\s\-().]{5,24}$/).allow('', null),
  notes: Joi.string().trim().max(2000).allow('', null),
});

const contactUpdateSchema = contactSchema.fork(
  ['name', 'email'],
  (f) => f.optional()
);

const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body failed validation',
          details: error.details.map((d) => d.message),
        },
      });
    }
    req.body = value;
    next();
  };
}

function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params);
    if (error) {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid path parameter' },
      });
    }
    req.params = { ...req.params, ...value };
    next();
  };
}

// ---------------------------------------------------------------------------
// API-key auth (shared-secret header) on all non-public endpoints.
// ---------------------------------------------------------------------------
function requireApiKey(req, res, next) {
  const presented = req.get('x-api-key');
  if (!presented || !timingSafeEqual(presented, API_KEY)) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid x-api-key header' },
    });
  }
  next();
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// ---------------------------------------------------------------------------
// Public routes
// ---------------------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({ message: 'CRM Platform API', version: '1.0.0', status: 'running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Protected routes
// ---------------------------------------------------------------------------
app.get('/contacts', requireApiKey, (req, res) => {
  res.json({ contacts, total: contacts.length });
});

app.post('/contacts', requireApiKey, validateBody(contactSchema), (req, res) => {
  const now = new Date().toISOString();
  const contact = { id: nextId++, ...req.body, createdAt: now, updatedAt: now };
  contacts.push(contact);
  res.status(201).json(contact);
});

app.get('/contacts/:id', requireApiKey, validateParams(idParamSchema), (req, res) => {
  const contact = contacts.find((c) => c.id === req.params.id);
  if (!contact) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Contact not found' },
    });
  }
  res.json(contact);
});

app.put(
  '/contacts/:id',
  requireApiKey,
  validateParams(idParamSchema),
  validateBody(contactUpdateSchema),
  (req, res) => {
    const index = contacts.findIndex((c) => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contact not found' },
      });
    }
    contacts[index] = { ...contacts[index], ...req.body, updatedAt: new Date().toISOString() };
    res.json(contacts[index]);
  }
);

app.delete('/contacts/:id', requireApiKey, validateParams(idParamSchema), (req, res) => {
  const index = contacts.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Contact not found' },
    });
  }
  contacts.splice(index, 1);
  res.json({ message: 'Contact deleted' });
});

app.get('/stats', requireApiKey, (req, res) => {
  res.json({
    totalContacts: contacts.length,
    companies: new Set(contacts.map((c) => c.company).filter(Boolean)).size,
  });
});

// ---------------------------------------------------------------------------
// Structured JSON errors. Stack traces are logged server-side only.
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err && err.message ? err.message : err);
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Malformed JSON body' },
    });
  }
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
});

app.listen(PORT, () => {
  console.log(`CRM Platform API running on http://localhost:${PORT} (env=${NODE_ENV})`);
});
