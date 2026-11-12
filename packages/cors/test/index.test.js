const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const ENV_KEYS = ['FRONTEND_URL', 'SDK_CORS_ORIGINS', 'SDK_CORS_WILDCARD_ORIGINS', 'ENV', 'NODE_ENV'];

function loadCors(env) {
  const previous = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));

  for (const key of ENV_KEYS) {
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }

  const id = require.resolve('../src/index.js');
  delete require.cache[id];
  const cors = require('../src/index.js');

  for (const [key, value] of previous) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  return cors;
}

function allowedOrigin(cors, origin) {
  return new Promise((resolve, reject) => {
    cors({ get: (header) => (header === 'origin' ? origin : undefined) }, (err, options) => {
      if (err) reject(err);
      else resolve(options.origin);
    });
  });
}

describe('FRONTEND_URL apex fallback', () => {
  const cors = loadCors({ FRONTEND_URL: 'https://clark.aisc.org' });

  test('allows the configured frontend and its subdomains', async () => {
    assert.equal(await allowedOrigin(cors, 'https://clark.aisc.org'), 'https://clark.aisc.org');
    assert.equal(await allowedOrigin(cors, 'https://foo.aisc.org'), 'https://foo.aisc.org');
    assert.equal(await allowedOrigin(cors, 'https://foo.bar.aisc.org'), 'https://foo.bar.aisc.org');
    assert.equal(await allowedOrigin(cors, 'http://clark.aisc.org'), 'http://clark.aisc.org');
  });

  test('rejects lookalike domains that are not subdomains of the apex', async () => {
    assert.equal(await allowedOrigin(cors, 'https://xaisc.org'), false);
    assert.equal(await allowedOrigin(cors, 'https://evilaisc.org'), false);
    assert.equal(await allowedOrigin(cors, 'https://example.com'), false);
    assert.equal(await allowedOrigin(cors, 'https://aisc.org.evil.com'), false);
    assert.equal(await allowedOrigin(cors, 'https://clark.aisc.org.evil.com'), false);
  });
});

describe('localhost in dev and QA', () => {
  const cors = loadCors({
    FRONTEND_URL: 'https://clark.aisc.org',
    SDK_CORS_ORIGINS: 'https://app.example.com',
  });

  async function withEnv(envName, origin) {
    const previousEnv = process.env.ENV;
    const previousNodeEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    if (envName === undefined) delete process.env.ENV;
    else process.env.ENV = envName;

    try {
      return await allowedOrigin(cors, origin);
    } finally {
      if (previousEnv === undefined) delete process.env.ENV;
      else process.env.ENV = previousEnv;
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  }

  test('allows an origin whose hostname is localhost, on any port', async () => {
    assert.equal(await withEnv('qa', 'http://localhost:3000'), 'http://localhost:3000');
    assert.equal(await withEnv('dev', 'https://localhost'), 'https://localhost');
    assert.equal(await withEnv('local', 'http://localhost'), 'http://localhost');
    assert.equal(await withEnv('qa', 'https://app.example.com'), 'https://app.example.com');
  });

  test('rejects hosts that only contain the word localhost', async () => {
    assert.equal(await withEnv('qa', 'https://localhost.attacker.example'), false);
    assert.equal(await withEnv('qa', 'https://evil-localhost.com'), false);
    assert.equal(await withEnv('dev', 'https://localhost.attacker.example'), false);
  });

  test('does not allow localhost outside local, dev, and qa', async () => {
    assert.equal(await withEnv('prod', 'http://localhost:3000'), false);
    assert.equal(await withEnv(undefined, 'http://localhost:3000'), false);
  });
});
