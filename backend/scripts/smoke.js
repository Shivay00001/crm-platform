/**
 * Smoke test for the CRM contacts API.
 *
 * Boots the server as a child process, exercises the main endpoints, and
 * asserts expected status codes and JSON shapes. Run: `npm run smoke`
 * (or `npm test`). Exits 0 on success, 1 on first failure.
 *
 * Env knobs: PORT (default 8181 for tests), API_KEY (default test key).
 */
'use strict';

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = parseInt(process.env.PORT || '8181', 10);
const API_KEY = process.env.API_KEY || 'smoke-test-key';
const BASE = `http://127.0.0.1:${PORT}`;
const SERVER = path.join(__dirname, '..', 'src', 'index.js');

let failures = 0;

function check(name, condition, extra) {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${name}${extra ? ` — ${extra}` : ''}`);
  }
}

function request(method, route, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request(
      BASE + route,
      {
        method,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            json = null;
          }
          resolve({ status: res.statusCode, json, raw: data });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const auth = { 'x-api-key': API_KEY };

async function waitForHealth(deadlineMs = 15000) {
  const start = Date.now();
  for (;;) {
    try {
      const r = await request('GET', '/health');
      if (r.status === 200) return;
    } catch {
      /* not up yet */
    }
    if (Date.now() - start > deadlineMs) throw new Error('server did not become healthy in time');
    await new Promise((r) => setTimeout(r, 250));
  }
}

async function run() {
  console.log('smoke: booting server...');
  const child = spawn(process.execPath, [SERVER], {
    env: { ...process.env, PORT: String(PORT), API_KEY, SEED_DEMO: 'true', NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => process.stdout.write(`  [server] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`  [server:err] ${d}`));

  try {
    await waitForHealth();

    console.log('smoke: public endpoints');
    let r = await request('GET', '/');
    check('GET / -> 200', r.status === 200, `got ${r.status}`);
    check('GET / body has status running', r.json && r.json.status === 'running');

    r = await request('GET', '/health');
    check('GET /health -> 200', r.status === 200, `got ${r.status}`);
    check('GET /health body healthy', r.json && r.json.status === 'healthy');

    console.log('smoke: auth enforcement');
    r = await request('GET', '/contacts');
    check('GET /contacts without key -> 401', r.status === 401, `got ${r.status}`);
    check('401 body is structured JSON error', r.json && r.json.error && r.json.error.code === 'UNAUTHORIZED');

    r = await request('GET', '/contacts', { headers: { 'x-api-key': 'wrong-key' } });
    check('GET /contacts with wrong key -> 401', r.status === 401, `got ${r.status}`);

    console.log('smoke: contacts CRUD');
    r = await request('GET', '/contacts', { headers: auth });
    check('GET /contacts with key -> 200', r.status === 200, `got ${r.status}`);
    check('contacts list is an array', r.json && Array.isArray(r.json.contacts));
    check('demo seed has 2 contacts', r.json && r.json.total === 2, `total=${r.json && r.json.total}`);

    r = await request(
      'POST',
      '/contacts',
      { headers: auth, body: { name: 'Smoke User', email: 'smoke@example.com', company: 'Smoke Co', phone: '+91-90000-11111' } }
    );
    check('POST /contacts valid -> 201', r.status === 201, `got ${r.status}`);
    const createdId = r.json && r.json.id;
    check('created contact has an id', typeof createdId === 'number');

    r = await request('GET', `/contacts/${createdId}`, { headers: auth });
    check('GET /contacts/:id -> 200', r.status === 200, `got ${r.status}`);
    check('round-trip name matches', r.json && r.json.name === 'Smoke User');

    r = await request('PUT', `/contacts/${createdId}`, { headers: auth, body: { phone: '+91-90000-22222' } });
    check('PUT /contacts/:id -> 200', r.status === 200, `got ${r.status}`);
    check('phone updated', r.json && r.json.phone === '+91-90000-22222');

    console.log('smoke: validation');
    r = await request('POST', '/contacts', { headers: auth, body: { name: '', email: 'not-an-email' } });
    check('POST /contacts invalid -> 422', r.status === 422, `got ${r.status}`);
    check('422 body has details array', r.json && r.json.error && Array.isArray(r.json.error.details));

    r = await request('GET', '/contacts/abc', { headers: auth });
    check('GET /contacts/abc -> 422 (bad param)', r.status === 422, `got ${r.status}`);

    r = await request('GET', '/contacts/99999', { headers: auth });
    check('GET /contacts/99999 -> 404 structured', r.status === 404 && r.json && r.json.error.code === 'NOT_FOUND', `got ${r.status}`);

    r = await request('DELETE', `/contacts/${createdId}`, { headers: auth });
    check('DELETE /contacts/:id -> 200', r.status === 200, `got ${r.status}`);

    r = await request('GET', '/stats', { headers: auth });
    check('GET /stats -> 200', r.status === 200, `got ${r.status}`);
    check('stats has totalContacts', r.json && typeof r.json.totalContacts === 'number');

    console.log('smoke: error envelope');
    r = await request('GET', '/no-such-route', { headers: auth });
    check('unknown route -> 404 structured JSON', r.status === 404 && r.json && r.json.error && r.json.error.code === 'NOT_FOUND', `got ${r.status}`);

    r = await request('POST', '/contacts', { headers: auth });
    // no body at all -> express.json leaves req.body {} -> validation error
    check('POST /contacts empty body -> 422', r.status === 422, `got ${r.status}`);
  } finally {
    child.kill('SIGTERM');
  }

  if (failures > 0) {
    console.error(`smoke: ${failures} failure(s)`);
    process.exit(1);
  }
  console.log('smoke: all checks passed');
}

run().catch((err) => {
  console.error('smoke: fatal', err.message);
  process.exit(1);
});
