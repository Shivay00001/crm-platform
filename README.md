# VisionQuantech CRM Platform

> A self-hostable, multi-tenant CRM foundation for lead management, sales pipelines, customer 360, workflow automation, and analytics.

[![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-cache%20%26%20queues-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Status](https://img.shields.io/badge/status-active-yellow)](https://github.com/Shivay00001/crm-platform)
[![License](https://img.shields.io/badge/license-VisionQuantech%20Custom-orange)](./LICENSE)

VisionQuantech CRM is a TypeScript/Node.js CRM platform concept for teams that need a controllable alternative to hosted CRM products. The repository is organized around a backend service, frontend application, workers, infrastructure, documentation, and deployment helpers.

It is designed for **self-hosting, customization, and commercial product development**—not as a claim that every enterprise capability is already complete or production-certified.

## Contents

- [Core capabilities](#core-capabilities)
- [Technology](#technology)
- [Architecture](#architecture)
- [Repository structure](#repository-structure)
- [Local development](#local-development)
- [Configuration](#configuration)
- [API surface](#api-surface)
- [Deployment](#deployment)
- [Production-readiness assessment](#production-readiness-assessment)
- [Monetization options](#monetization-options)
- [Security and privacy](#security-and-privacy)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Core capabilities

- Lead capture, scoring, routing, and bulk import
- Contact and customer 360 management
- Custom sales pipelines, deals, and stage transitions
- Activity tracking for calls, email, meetings, and notes
- Workflow and event-driven automation
- Analytics, funnels, revenue reporting, and dashboards
- Organization-aware multi-tenancy and role-based access control
- Audit logging for operational visibility and compliance work
- Redis-backed caching and queues
- Kafka-oriented asynchronous processing
- PostgreSQL persistence
- Search and integration extensibility

## Technology

| Layer | Current repository direction |
| --- | --- |
| Backend | Node.js, TypeScript, Express 4 |
| Frontend | Next.js 15, React, TypeScript |
| Data | PostgreSQL 15+, Redis 7+ |
| Messaging | KafkaJS and Bull-based workers |
| Security | Helmet, JWT, bcrypt, Joi validation, CORS |
| Integrations | Nodemailer, Twilio, AWS SDK-compatible storage/services |
| Observability | Winston logging and Prometheus client |
| Delivery | Docker, Compose, Kubernetes/Terraform documentation paths |

## Architecture

```text
Users
  │
  ▼
Next.js frontend ───────► TypeScript/Express API
                                  │
             ┌────────────────────┼────────────────────┐
             ▼                    ▼                    ▼
        PostgreSQL              Redis             Event bus
             │                    │                    │
             └────────────────────┴────────────────────┘
                                  │
                                  ▼
                         Background workers
                    imports · dispatch · analytics
```

The intended deployment separates the user-facing frontend, API, and asynchronous workers. PostgreSQL is the system of record; Redis supports caching/queues; Kafka can distribute events as workloads grow.

## Repository structure

```text
crm-platform/
├── backend/              # Express + TypeScript API and migrations
├── frontend/             # Next.js application
├── infrastructure/       # Deployment and infrastructure artifacts
├── docs/                 # Architecture and product documentation
├── scripts/              # Operational helpers
├── .env.example          # Configuration template
├── DEPLOYMENT.md         # Deployment notes and cost options
├── Dockerfile            # Multi-stage Node 20 image for the contacts API
└── package.json           # Root metadata; service scripts live below
```

The backend currently exposes build, start, test, lint, migration, and seed scripts in [`backend/package.json`](./backend/package.json). Use service-level package files rather than assuming the root `npm start` runs the complete system.

## Local development

### Prerequisites

- Node.js 18 or newer
- npm
- Docker and Docker Compose (recommended)
- PostgreSQL 15+ and Redis 7+ when running without containers
- Git

### Clone and configure

```bash
git clone https://github.com/Shivay00001/crm-platform.git
cd crm-platform
cp .env.example .env
```

The current environment template is intentionally minimal. Add only the variables supported by the implementation you are running, and keep real secrets out of Git.

### Backend (contacts API — the runnable service)

This is the currently runnable backend: a hardened Express contacts API with
API-key auth, Joi validation, and structured JSON errors. **The store is
in-memory** (with two seeded demo contacts) — Postgres persistence is the
documented production roadmap, not yet implemented.

```bash
cd backend
npm install          # or npm ci
npm test             # boots the API and runs the smoke suite (must pass)
npm start            # starts on PORT (default 8004)
```

Try it (default dev key; override with `API_KEY` in `.env`):

```bash
curl localhost:8004/health
curl -H "x-api-key: dev-demo-key-change-me" localhost:8004/contacts
curl -H "x-api-key: dev-demo-key-change-me" -H "Content-Type: application/json" \
  -d '{"name":"Ravi","email":"ravi@example.com","company":"Green Acres"}' \
  localhost:8004/contacts
```

The older docs reference `npm run build` / `migrate` / `seed` scripts — those
belong to the planned TypeScript backend and do not exist in this manifest.

### Frontend

The frontend directory is present in the repository. Install dependencies and run the scripts defined by its local package manifest:

```bash
cd frontend
npm install
npm run dev
```

Do not copy the old README's `npm init`, `create-next-app`, or artifact-copy steps into an existing checkout; those instructions describe scaffolding rather than normal development.

## Configuration

### Environment variables

Every variable is documented in [`.env.example`](./.env.example); copy it to
`.env` before running. Dummy values only — never commit real secrets.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | No | `8004` | HTTP port the API listens on (Render sets this automatically) |
| `API_KEY` | **Yes in production** | `dev-demo-key-change-me` (dev only) | Shared secret; send as `x-api-key` header on every non-public endpoint. Boot **refuses** to start when unset with `NODE_ENV=production`. Generate with `openssl rand -hex 32`. |
| `CORS_ORIGINS` | No | *(empty — no cross-origin access)* | Comma-separated allowed browser origins, e.g. `https://app.example.com`. Never `*`; credentialed endpoints stay locked down by default. |
| `SEED_DEMO` | No | `true` | Seeds two demo contacts on boot. Set `false` in production. |
| `NODE_ENV` | No | `development` | `production` enables the API_KEY boot guard. |
| `DATABASE_URL` | Roadmap | — | Postgres connection string (not yet wired in — in-memory store today) |
| `REDIS_URL` | Roadmap | — | Redis connection string (not yet wired in) |
| `JWT_SECRET` | Roadmap | — | JWT signing secret if user login is added later |

### Authentication

All non-public endpoints require the shared API key in the `x-api-key`
header (timing-safe comparison). Public: `GET /`, `GET /health`.
Protected: `/contacts*`, `/stats`. Missing/invalid key → `401` with a
structured JSON error, e.g. `{"error":{"code":"UNAUTHORIZED",...}}`.

### Error format

All errors are structured JSON — stack traces never leave the server:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

Codes: `UNAUTHORIZED` (401), `NOT_FOUND` (404), `BAD_REQUEST` (400, e.g.
malformed JSON), `VALIDATION_ERROR` (422), `INTERNAL_ERROR` (500).

The committed `.env.example` previously documented only two placeholder lines;
it is now complete for the runnable API, with the production roadmap vars
marked clearly.

## API surface

The planned API is versioned under `/api/v1`. Representative CRM resources include:

```text
POST   /leads
GET    /leads
GET    /leads/:leadId
PATCH  /leads/:leadId
DELETE /leads/:leadId
POST   /leads/bulk-import

POST   /contacts
GET    /contacts
GET    /contacts/:contactId
PATCH  /contacts/:contactId

POST   /pipelines
GET    /pipelines
POST   /deals
GET    /deals
PATCH  /deals/:dealId/stage

GET    /analytics/leads/stats
GET    /analytics/deals/revenue
GET    /analytics/funnel
```

Confirm routes, authentication requirements, response schemas, and pagination behavior against the current backend implementation before publishing an API client or integration.

## Deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for hosted-service and low-cost options.

### Deploy the API to Render (Docker)

1. Push the repo to GitHub.
2. In Render: **New → Web Service → Build from Dockerfile** (root `Dockerfile`
   builds the contacts API).
3. Set environment variables: `API_KEY` (a real secret), `SEED_DEMO=false`,
   `NODE_ENV=production`, and `CORS_ORIGINS` with your frontend origin.
4. Health check path: `/health`. Render assigns `PORT` automatically.

### Deploy with Docker locally

```bash
docker build -t crm-api .
docker run -p 8004:8004 \
  -e NODE_ENV=production \
  -e API_KEY="$(openssl rand -hex 32)" \
  -e SEED_DEMO=false \
  crm-api
curl localhost:8004/health
```

### Cloudflare

The API is a single stateless container — put it behind a Cloudflare-proxied
subdomain (e.g. `api.example.com`) for free TLS and DDoS protection; set the
`CORS_ORIGINS` value to your frontend domain served via Cloudflare Pages.

## Production-readiness assessment

### Current maturity: **prototype / early beta**

The repository has a credible architecture and useful service dependencies, but it should not currently be marketed as fully production-ready without validation. The existing documentation describes capabilities that are not all verifiable from the root configuration and service manifests.

### Strengths

- Clear multi-tenant CRM domain model and product direction.
- Backend package includes build, test, lint, migration, and seed commands.
- Security-oriented dependencies include Helmet, bcrypt, JWT, Joi, and CORS.
- Architecture anticipates asynchronous work, caching, metrics, and integrations.
- Deployment documentation gives a useful starting point for self-hosting and cost planning.

### Release blockers and priority work

1. **Make the repository runnable from a clean clone:** verify frontend/backend manifests, Docker Compose, migrations, seed data, and documented ports.
2. **Add CI gates:** type-check, lint, unit/integration tests, build, dependency audit, secret scanning, and container scanning.
3. **Prove tenant isolation:** test every query and cache key for organization scoping; add authorization tests for every role.
4. **Harden authentication:** rotateable refresh tokens, password-reset flow, MFA option, session revocation, key rotation, and secure cookie policy.
5. **Protect operational surfaces:** webhook signatures, request size limits, rate limits per tenant, idempotency keys, SSRF/path validation, and queue retry limits.
6. **Implement reliable data operations:** migration rollback strategy, point-in-time backups, restore drills, retention policies, and dead-letter queues.
7. **Add observability:** correlation IDs, structured redacted logs, SLOs, alerts, traces, worker metrics, and audit-event review.
8. **Document privacy/compliance boundaries:** consent, export/deletion, retention, regional hosting, and processor agreements for customer data.
9. **Replace unsupported claims:** benchmark latency, shard counts, active-active deployment, GDPR compliance, and encryption only after measured evidence and configuration are committed.
10. **Use reproducible dependencies:** commit lockfiles and pin compatible versions for backend, frontend, infrastructure, and workers.

## Monetization options

The custom commercial license creates a foundation for monetization, but pricing, revenue-share terms, and commercial support should be clearly explained in a separate commercial agreement and product website.

Potential revenue streams:

| Model | Offer | Best fit |
| --- | --- | --- |
| Hosted SaaS | Per-seat or per-workspace plans with usage limits | Small and mid-sized teams |
| Self-hosted commercial license | Annual license by deployment, seats, or revenue band | Regulated or infrastructure-conscious customers |
| Enterprise plan | SSO/SAML, SCIM, audit exports, regional hosting, SLA, support | Larger organizations |
| Usage-based billing | Charge for API calls, automation runs, messages, storage, or enrichment | High-volume teams |
| Add-on marketplace | Paid integrations, connectors, templates, and AI features | Ecosystem growth |
| Implementation services | Migration, customization, integrations, and data import | Businesses needing onboarding |
| Managed operations | Monitoring, upgrades, backups, and security response | Customers without platform teams |
| Partner/reseller program | White-label or agency deployments with revenue share | Agencies and regional partners |
| Support subscriptions | Community, priority, and enterprise support tiers | Self-hosted customers |

### Monetization guardrails

- Publish a simple pricing page with limits, overages, support scope, and cancellation terms.
- Keep core license terms, commercial add-ons, and revenue-share obligations consistent and legally reviewed.
- Never claim “free forever” when third-party infrastructure, messaging, storage, or AI usage can incur charges.
- Meter usage transparently and provide tenant-level export and invoice history.
- Separate customer data from billing data and restrict access to payment-related information.
- Add a free trial or developer tier only if abuse prevention and infrastructure limits are in place.

## Search and GitHub discoverability

No README can guarantee Google or GitHub ranking. This README is structured to improve legitimate discoverability by using accurate project terminology, clear headings, stable links, installation examples, and repository-specific keywords such as **multi-tenant CRM**, **self-hosted CRM**, **lead management**, **sales pipeline**, **customer 360**, **Node.js CRM**, **TypeScript CRM**, **PostgreSQL CRM**, and **workflow automation**.

Additional actions with higher long-term impact:

- Add a concise, accurate GitHub repository description and focused topics.
- Publish screenshots, a short demo, architecture diagrams, and a hosted demo with safe sample data.
- Add working CI status, release tags, changelog entries, and versioned documentation.
- Create focused landing pages for self-hosted CRM, sales pipeline automation, and multi-tenant CRM use cases.
- Earn references through useful tutorials, integrations, case studies, and genuine community contributions.
- Avoid keyword stuffing, copied competitor comparisons, fake performance numbers, and unverifiable “enterprise-grade” claims.

## Security and privacy

CRM systems process sensitive business and personal data. Before production use:

- Use TLS everywhere and encrypt managed database/storage services.
- Hash passwords with a reviewed cost factor and never log credentials or tokens.
- Enforce organization scoping in API, database, cache, search, and worker paths.
- Verify inbound webhooks and protect outbound integrations with least-privilege credentials.
- Add audit events for administrative and data-export actions.
- Define retention, deletion, export, consent, and breach-response procedures.
- Run dependency, container, SAST, DAST, and secret scans in CI.

## Roadmap

Prioritize the following in order:

- [ ] Clean-clone developer experience with verified Compose stack
- [ ] Complete API contract and generated documentation
- [ ] Tenant-isolation and authorization test suite
- [ ] CI/CD with security and migration gates
- [ ] Billing, usage metering, plans, and entitlements
- [ ] SSO/SAML, SCIM, MFA, and enterprise audit exports
- [ ] Reliable queues, dead-letter handling, and worker autoscaling
- [ ] Production dashboards, SLOs, backups, and restore drills
- [ ] Customer-facing hosted demo and onboarding flow

## Contributing

1. Open an issue describing the problem or feature.
2. Keep changes scoped to the affected service.
3. Update configuration and API documentation with code changes.
4. Add tests for authorization, tenancy, migrations, and failure paths.
5. Run lint, tests, type checks, and builds locally.
6. Never commit secrets, real customer data, or unverified production claims.

## License

This project is distributed under the [VisionQuantech Custom Commercial License](./LICENSE), not the MIT License. Read the complete license before commercial, revenue-generating, or enterprise use. Contact VisionQuantech for licensing, hosted plans, implementation, or support options.

## Links

- [Repository](https://github.com/Shivay00001/crm-platform)
- [Issues](https://github.com/Shivay00001/crm-platform/issues)
- [VisionQuantech](https://visionquantech.com)
