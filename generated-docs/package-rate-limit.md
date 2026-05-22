# Package: `@twentyfourg-express-sdk/rate-limit`

[![Version](https://flat.badgen.net/npm/v/@twentyfourg-express-sdk/rate-limit)](https://github.com/twentyfourg/express-sdk/releases)

**Current version:** 1.1.1  
**Location:** `packages/rate-limit/`

## Purpose

Express rate-limiting middleware that wraps [`express-rate-limit`](https://www.npmjs.com/package/express-rate-limit) and uses **AWS DynamoDB** as a distributed backing store (via `@twentyfourg/cloud-sdk`). This makes the rate limiter safe to use across multiple API server instances and Lambda invocations — request counts persist centrally rather than in memory.

## Installation

```bash
npm install @twentyfourg-express-sdk/rate-limit
```

## Usage

```javascript
const rateLimit = require('@twentyfourg-express-sdk/rate-limit');

// Protect a route — max 10 requests per minute, keyed on IP + email body field
router.post(
  '/auth',
  rateLimit({ max: 10, minutes: 1, keys: ['ip', 'body.email'] }),
  authController.login
);

// Protect all routes with a global limiter (default: 15 req/min)
app.use(rateLimit());

// Named limiter (composite key uses the name instead of method+URL)
app.use('/api/upload', rateLimit({ name: 'upload', max: 5, minutes: 10 }));
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `minutes` | `number` | `1` | Time window in minutes. |
| `max` | `number` | `15` | Max requests allowed per window. |
| `standardHeaders` | `boolean` | `true` | Send `RateLimit-*` headers conforming to the IETF draft. |
| `message` | `string \| object` | `{ error: 'too many requests, please try again later' }` | Response body sent when the limit is exceeded. |
| `keys` | `string[]` | `['ip', 'headers["user-agent"]']` | Express `req` property paths used to construct the composite rate-limit key. Supports lodash `_.get` paths. |
| `name` | `string` | _(unset)_ | When set, the composite key uses just this name instead of `method + URL`. Useful for named shared limiters. |
| `whiteList` | `string[]` | `SDK_EXPRESS_WHITE_LIST` env var | IP addresses to exempt from rate limiting. |

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `SDK_EXPRESS_WHITE_LIST` | Comma-separated list of IP addresses to whitelist from rate limiting. | `[]` |
| `EXPRESS_SDK_RATE_LIMIT_DISABLED` | Set to `"true"` to disable rate limiting entirely (useful for test/dev). | `false` |
| `DYNAMO_RATE_LIMIT_TABLE` | Name of the DynamoDB table used for storing rate-limit counters. | `"rate-limit"` |

## DynamoDB Store

The package includes a custom `DynamoStore` class (in `src/dynamo.store.js`) that implements the [`express-rate-limit` store interface](https://www.npmjs.com/package/express-rate-limit#store):

| Method | Description |
|---|---|
| `init(options)` | Called by `express-rate-limit` on setup; calculates the initial reset time. |
| `increment(key)` | Atomically increments the hit counter for a key; returns `{ totalHits, resetTime }`. |
| `decrement(key)` | Decrements the hit counter (used for undo operations). |
| `resetKey(key)` | Deletes a specific key from DynamoDB. |
| `resetAll()` | Deletes all keys and resets the window timer. |

Each counter entry is stored with a **TTL** equal to the remaining time in the current window, so DynamoDB automatically cleans up expired records.

If DynamoDB becomes unreachable, the store sets `this.enabled = false` and **logs the error without crashing** — rate limiting gracefully degrades to pass-through behavior.

## Composite Key Construction

The key used to identify a client is built from:

1. If `name` is provided: `[name]`
2. Otherwise: `[req.method, req.originalUrl, ...keys.map(k => _.get(req, k))]`

All parts are joined with `:`. For example, a POST to `/auth` with `keys: ['ip', 'body.email']` produces a key like:

```
POST:/auth:203.0.113.42:user@example.com
```

## Package Dependencies

| Dependency | Version |
|---|---|
| `@twentyfourg/cloud-sdk` | `^2.0.1` |
| `express-rate-limit` | `^6.5.1` |
| `lodash` | `^4.17.21` |
