# Package: `@twentyfourg-express-sdk/cors`

[![Version](https://flat.badgen.net/npm/v/@twentyfourg-express-sdk/cors)](https://github.com/twentyfourg/express-sdk/releases)

**Current version:** 1.2.0  
**Location:** `packages/cors/`

## Purpose

An environment-aware **CORS origin callback** for Express. It builds a list of allowed origins from environment variables and handles the common edge-cases of:

- Exact-matching a primary frontend URL and all its subdomains.
- Allowing `localhost` for `local`, `dev`, and `qa` environments.
- Allowing arbitrary extra origins via a comma-separated list (`SDK_CORS_ORIGINS`).
- Supporting wildcard domain patterns via `SDK_CORS_WILDCARD_ORIGINS`.

## Installation

```bash
npm install @twentyfourg-express-sdk/cors
# cors package is needed separately in your app
npm install cors
```

## Usage

The package exports a **cors origin callback** — a function with the signature `(req, callback)`. Pass it directly to the `cors` npm package's `origin` option:

```javascript
const cors = require('cors');
const sdkCors = require('@twentyfourg-express-sdk/cors');

const app = require('express')();

// Apply as middleware
app.use(cors(sdkCors));
```

Or via the `core` aggregator:

```javascript
const sdk = require('@twentyfourg-express-sdk/core');
const cors = require('cors');

app.use(cors(sdk.cors));
```

## Origin Resolution Logic

When a request arrives the middleware evaluates the request `origin` header against the following priority order:

1. **`SDK_CORS_WILDCARD_ORIGINS`** — wildcard patterns (e.g. `https://*.example.com`). Automatically generates `www.*` variants.
2. **`SDK_CORS_ORIGINS`** — explicit comma-separated origins. Also auto-adds `www.` variants.
3. **`FRONTEND_URL`** (fallback) — the apex domain is extracted and any subdomain of that apex is permitted.
4. **localhost** — always allowed when `ENV` or `NODE_ENV` is `local`, `dev`, or `qa`.

If none of the patterns match, the callback returns `origin: false`, which causes CORS to reject the request.

All matched requests have **`credentials: true`** enabled.

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `FRONTEND_URL` | Primary frontend URL. Subdomains of the apex domain are automatically allowed. | `https://app.example.com` |
| `SDK_CORS_ORIGINS` | Comma-separated list of additional explicit origins to allow. | `https://admin.example.com,https://partner.io` |
| `SDK_CORS_WILDCARD_ORIGINS` | Comma-separated wildcard patterns. Use `*` as a wildcard. | `https://*.staging.example.com` |
| `ENV` / `NODE_ENV` | Environment name. `localhost` is permitted when set to `local`, `dev`, or `qa`. | `local` |

## Examples

### Allowing a primary domain and all subdomains

```bash
FRONTEND_URL=https://app.example.com
```

Allows: `https://app.example.com`, `https://www.example.com`, `https://admin.example.com`, etc.

### Allowing specific extra origins

```bash
SDK_CORS_ORIGINS=https://admin.example.com,https://partner.io
```

Allows: `https://admin.example.com`, `https://www.admin.example.com`, `https://partner.io`, `https://www.partner.io`.

### Allowing wildcard staging domains

```bash
SDK_CORS_WILDCARD_ORIGINS=https://*.staging.example.com
```

Allows any origin matching `https://<anything>.staging.example.com`.

## Package Dependencies

| Dependency | Version |
|---|---|
| `regex-escape` | `^3.4.10` |
