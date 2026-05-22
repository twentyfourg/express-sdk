# Package: `@twentyfourg-express-sdk/core`

[![Version](https://flat.badgen.net/npm/v/@twentyfourg-express-sdk/core)](https://github.com/twentyfourg/express-sdk/releases)

**Current version:** 1.0.9  
**Location:** `packages/core/`

## Purpose

The `core` package is the **aggregator entry point** for the 24G Express SDK. Instead of requiring each SDK package individually in your application, you install and require `core` once — it automatically discovers and loads every other `@twentyfourg-express-sdk/*` package listed as a dependency and re-exports them as named properties of a single object.

## How It Works

At startup, `core/src/index.js`:

1. Reads its own `package.json` dependencies.
2. Filters for any dependency whose name contains `@twentyfourg-express-sdk`.
3. For each match, derives a **camelCase** property name from the package folder name (e.g. `rate-limit` → `rateLimit`).
4. Requires the package either from `node_modules` (production) or from a relative local path (when `SDK_CORE_LOCATION=local`).
5. Exposes all loaded packages as a single exported object.

```js
// core/src/index.js (simplified)
const { dependencies } = require('../package.json');
const packages = {};

for (const [dependency] of Object.entries(dependencies)) {
  if (dependency.includes('@twentyfourg-express-sdk')) {
    const name = /* camelCase transform */ ...;
    packages[name] = require(dependency); // or local path
  }
}

module.exports = packages;
```

## Installation

```bash
npm install @twentyfourg-express-sdk/core
```

> Installing `core` will also install its peer SDK packages (`cors`, `rate-limit`) as transitive dependencies.

## Usage

```javascript
const sdk = require('@twentyfourg-express-sdk/core');

// sdk.cors      → @twentyfourg-express-sdk/cors middleware
// sdk.rateLimit → @twentyfourg-express-sdk/rate-limit middleware

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors(sdk.cors));

app.post('/login',
  sdk.rateLimit({ max: 5, minutes: 1 }),
  (req, res) => res.json({ ok: true })
);
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `SDK_CORE_LOCATION` | Set to `local` to resolve sibling packages from the monorepo filesystem instead of `node_modules` | _(unset — uses npm)_ |

## Package Dependencies

| Dependency | Version |
|---|---|
| `@twentyfourg-express-sdk/cors` | `^1.2.0` |
| `@twentyfourg-express-sdk/rate-limit` | `^1.1.1` |
| `dotenv` | `^16.0.0` |
