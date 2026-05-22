# Package: `@twentyfourg-express-sdk/doc-generator`

[![Version](https://flat.badgen.net/npm/v/@twentyfourg-express-sdk/doc-generator)](https://github.com/twentyfourg/express-sdk/releases)

**Current version:** 1.0.2  
**Location:** `packages/doc-generator/`

## Purpose

An **interactive CLI tool** that inspects a running Express application, compares its registered routes against existing OpenAPI YAML documentation files, and **generates stub YAML documentation** for any undocumented routes. This ensures that as new routes are added to an API, their documentation can be scaffolded quickly and consistently.

## Installation

```bash
# As a project dev dependency
npm install --save-dev @twentyfourg-express-sdk/doc-generator

# Or globally
npm install -g @twentyfourg-express-sdk/doc-generator
```

## Usage

### Running the CLI

```bash
# If installed globally
doc-generator

# Via npx
npx @twentyfourg-express-sdk/doc-generator

# Via npm script in package.json
"scripts": {
  "docs:generate": "doc-generator"
}
```

### Interactive Prompts

When run, the tool will:

1. **Confirm the path to your Express app file** — the file that exports the configured Express `app` object (e.g. `./src/app.js`). Defaults to `SDK_EXPRESS_APP_PATH` env var, or `./src/app.js`.
2. **Confirm the path to your docs directory** — the directory containing existing `.yml` OpenAPI spec files (e.g. `./src/docs`). Defaults to `SDK_EXPRESS_DOCS_PATH` env var, or `./src/docs`.
3. **Preview the routes to be documented** — lists the undocumented method+path combinations and asks for confirmation before writing.

### Generated YAML Format

For each undocumented route, the tool generates an OpenAPI-compatible YAML stub organized by route path. A new entry looks like:

```yaml
/users/{id}:
  get:
    security:
      - jwt: []
    tags:
      - users
    responses:
      200:
        description: OK
        content:
          application/json:
            example: {}
```

- The first path segment is used as the **tag** (e.g. `/users/...` → `users`).
- Path parameters (`:id` style) are converted to OpenAPI format (`{id}`).
- A `jwt` security requirement is added by default.
- Stubs are appended to the appropriate per-resource `.yml` file (e.g. `users.yml`) in the docs directory, creating the file if it does not exist.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `SDK_EXPRESS_APP_PATH` | Path to your Express app entry file | `./src/app.js` |
| `SDK_EXPRESS_DOCS_PATH` | Path to the docs YAML directory | `./src/docs` |

## Example Workflow

1. Add new routes to your Express app.
2. Run `npx @twentyfourg-express-sdk/doc-generator`.
3. Confirm the app path and docs directory.
4. Review the list of undocumented routes.
5. Confirm to generate — YAML stubs are written to your docs folder.
6. Edit the generated stubs to add real request/response schemas.

## Package Dependencies

| Dependency | Version |
|---|---|
| `dotenv` | `^16.0.0` |
| `enquirer` | `^2.3.6` |
| `express-list-endpoints` | `^6.0.0` |
| `js-yaml` | `^4.1.0` |
