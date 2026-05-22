# Package: `@twentyfourg-express-sdk/setup`

[![Version](https://flat.badgen.net/npm/v/@twentyfourg-express-sdk/setup)](https://github.com/twentyfourg/express-sdk/releases)

**Current version:** 1.1.2  
**Location:** `packages/setup/`

## Purpose

An **interactive CLI tool** for bootstrapping a local development environment for a 24G Express API project. Running this tool walks a developer through a series of prompts and produces a ready-to-use set of local config files:

- `.env` — local environment variables pre-populated with service connection strings.
- `docker-compose.yml` — Docker Compose v3 file with the services the developer selected.
- `.develop/workspace.spec.json` — persisted workspace configuration for future re-runs.
- `.develop/mysql/1-setup.sql` — MySQL database initialization script (if MySQL selected).
- `.develop/mysql/wait-for-mysql.sh` — Shell script to wait for MySQL readiness.
- `.develop/dev.entrypoint.sh` — Docker entrypoint script for the API container.

## Installation

```bash
# As a project dev dependency
npm install --save-dev @twentyfourg-express-sdk/setup

# Or globally
npm install -g @twentyfourg-express-sdk/setup
```

## Usage

```bash
# Via npx
npx @twentyfourg-express-sdk/setup

# Via npm script
"scripts": {
  "setup": "setup"
}
npm run setup
```

If a `.develop/workspace.spec.json` already exists from a previous run, the tool loads it and uses the saved values as defaults — making subsequent re-runs fast.

## Interactive Prompts

| Prompt | Description |
|---|---|
| **Project name** | Defaults to the current directory name (or the saved spec value). |
| **24G developer email** | Auto-populated from your local `~/.vault-token` via the Vault API if available. |
| **24G job number** | e.g. `1234-1`. Extracted from the project name if it follows the 24G naming convention. |
| **24G job name** | Short name of the project, extracted from the project name. |
| **Services** | Multiselect — choose any of: `MySQL`, `DynamoDB`, `API`, `SQS`, `EZQ`. |
| **Vault secret path** | Comma-separated Vault KV paths for loading secrets. Pre-filled based on the job number. |

## Generated Files

### `.env`

A local dotenv file pre-configured based on selected services:

```dotenv
SECRET_PATH=/kv/1234-1/dev/backend-secrets,...
ENV=local
NODE_ENV=local
# MySQL vars (if MySQL selected)
READER_SQL_HOST=localhost
WRITER_SQL_HOST=localhost
SQL_DATABASE=my_project
SQL_USER=root
SQL_PASSWORD=
# DynamoDB vars (if DynamoDB selected)
DYNAMO_ENDPOINT=http://localhost:8000
# SQS/EZQ vars (if SQS or EZQ selected)
SQS_EZQ_URL=http://localhost:9324/queue/ezq.fifo
SQS_MAIN_URL=http://localhost:9324/queue/main
```

### `docker-compose.yml`

Generated from the service selection. Supported services and their Docker images:

| Service | Image | Ports |
|---|---|---|
| `api` | Local `Dockerfile` | `3000`, `9228`, `9229` |
| `mysql` | `mysql/mysql-server` | `3306` |
| `dynamo` | `twentyfourg/dynamodb-local` | `8000`, `8001` |
| `sqs` | `roribio16/alpine-sqs` | `9324`, `9325` |
| `ezq` | `twentyfourg/ezq` | — |

### Safe File Overwrite

If a target file already exists and differs from the newly generated content, the tool will prompt you to choose between:
- **Truncate** — replace the file entirely with the new content.
- **Append** — add the new content after a separator.
- **Keep** — leave the existing file unchanged.

## Vault Integration

During initialization the tool makes a request to `https://vault.24g.dev/v1/auth/token/lookup-self` using the token stored in `~/.vault-token`. If successful, the developer's email is pre-filled from the Vault token metadata. This is non-blocking — if Vault is unreachable the prompt is left blank.

## Package Dependencies

| Dependency | Version |
|---|---|
| `axios` | `^0.27.2` |
| `js-yaml` | `^4.1.0` |
| `prompts` | `^2.4.2` |
| `replace-in-file` | `^6.3.2` |
| `simple-git` | `^3.6.0` |
