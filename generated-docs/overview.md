# 24G Express SDK — Overview

## What Is It?

The **24G Express SDK** (`express-sdk`) is a **Lerna-managed monorepo** of composable [Express.js](https://expressjs.com/) middleware packages published to the `@twentyfourg-express-sdk` npm scope. Each package is independently versioned and published; the `core` package acts as a single aggregated entry point that re-exports every other package automatically.

The SDK provides plug-and-play solutions for the most common concerns shared across 24G Node/Express APIs:

| Package | NPM Name | Description |
|---|---|---|
| [`core`](./package-core.md) | `@twentyfourg-express-sdk/core` | Aggregator — auto-requires all sibling SDK packages |
| [`cors`](./package-cors.md) | `@twentyfourg-express-sdk/cors` | Environment-aware CORS middleware |
| [`rate-limit`](./package-rate-limit.md) | `@twentyfourg-express-sdk/rate-limit` | DynamoDB-backed Express rate limiter |
| [`doc-generator`](./package-doc-generator.md) | `@twentyfourg-express-sdk/doc-generator` | CLI to scaffold OpenAPI/YAML docs for undocumented routes |
| [`setup`](./package-setup.md) | `@twentyfourg-express-sdk/setup` | Interactive CLI to bootstrap local development environments |

---

## Repository Architecture

```
express-sdk/
├── lerna.json                  # Lerna config (independent versioning)
├── package.json                # Root workspace — dev tooling only
├── packages/
│   ├── core/                   # Aggregator package
│   ├── cors/                   # CORS middleware
│   ├── rate-limit/             # Rate-limit middleware (DynamoDB store)
│   ├── doc-generator/          # OpenAPI doc scaffold CLI
│   └── setup/                  # Local dev workspace bootstrap CLI
└── .github/
    └── workflows/
        └── release.yml         # Automated release pipeline
```

All packages under `packages/` are independent npm packages. They share the root-level lint, formatting, and commit-lint configuration but carry their own `package.json`, `CHANGELOG.md`, and `src/index.js`.

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm

### Install the monorepo

```bash
git clone https://github.com/twentyfourg/express-sdk.git
cd express-sdk
npm install
```

### Install an individual package in your project

Each package is published independently to npm under the `@twentyfourg-express-sdk` scope:

```bash
# Install everything through the core aggregator
npm install @twentyfourg-express-sdk/core

# Or install packages individually
npm install @twentyfourg-express-sdk/cors
npm install @twentyfourg-express-sdk/rate-limit
npm install @twentyfourg-express-sdk/doc-generator
npm install @twentyfourg-express-sdk/setup
```

### Quick-start example

```javascript
const express = require('express');
const cors = require('cors');
const sdk = require('@twentyfourg-express-sdk/core');
// sdk.cors, sdk.rateLimit are now available

const app = express();

// Apply CORS middleware using the SDK's environment-aware handler
app.use(cors(sdk.cors));

// Apply rate-limiting to a sensitive route
app.post('/auth', sdk.rateLimit({ max: 10, minutes: 1, keys: ['ip', 'body.email'] }), (req, res) => {
  res.json({ ok: true });
});

app.listen(3000);
```

---

## Tooling & Development

### Linting & Formatting

The root workspace uses **ESLint** (Airbnb base) + **Prettier**. Both are enforced via `lint-staged` on pre-commit:

```bash
npm run lint:eslint   # Fix ESLint issues
npm run lint:prettier # Fix formatting
```

### Commit Convention

Commit messages are enforced by **commitlint** (`@commitlint/config-conventional`). Use conventional commit types:

- `feat:` — new feature → triggers a minor/patch bump and appears in changelogs
- `fix:` — bug fix → patch bump
- `build:` — build-related changes → patch bump

### Creating a New Package

A helper script scaffolds new packages interactively:

```bash
npm run create-package
```

This generates the required `package.json` and `README.md` inside `packages/<name>/`.

---

## Release Pipeline

Releases are fully automated via **GitHub Actions** (`.github/workflows/release.yml`):

1. Triggered on every push to `master`.
2. Runs `lerna version --conventional-commits --conventional-graduate` — bumps only changed packages.
3. Creates GitHub Releases with auto-generated changelogs.
4. Publishes changed packages to npm via `lerna publish from-git`.

Package versions are **independent** — a change to `cors` does not force a version bump of `rate-limit`.

---

## Package Version Reference

| Package | Current Version |
|---|---|
| `@twentyfourg-express-sdk/core` | 1.0.9 |
| `@twentyfourg-express-sdk/cors` | 1.2.0 |
| `@twentyfourg-express-sdk/rate-limit` | 1.1.1 |
| `@twentyfourg-express-sdk/doc-generator` | 1.0.2 |
| `@twentyfourg-express-sdk/setup` | 1.1.2 |
