const RegexEscape = require('regex-escape');

const { FRONTEND_URL, SDK_CORS_ORIGINS } = process.env;
const env = (...args) =>
  [...args].includes(process.env.ENV) || [...args].includes(process.env.NODE_ENV);

const apexDomain =
  // eslint-disable-next-line no-nested-ternary
  (FRONTEND_URL?.match(/\./g) || []).length > 1
    ? FRONTEND_URL.split('.').slice(-2).join('.')
    : FRONTEND_URL
    ? FRONTEND_URL.replace(/(^\w+:|^)\/\//, '')
    : false;

const validOrigins = apexDomain
  ? [new RegExp(RegexEscape(`^${FRONTEND_URL}$`)), new RegExp(RegexEscape(`.${apexDomain}$`))]
  : [];

const sdkOrigins = SDK_CORS_ORIGINS
  ? SDK_CORS_ORIGINS.replace(/\s/g, '')
      .split(',')
      .map((origin) => new RegExp(RegexEscape(`^${origin}$`)))
  : [];

module.exports = (req, callback) => {
  if (!apexDomain) console.warn('CORS: process.env.FRONTEND_URL not found');
  const isLocal =
    env('local', 'dev', 'qa') && req.get('origin') && req.get('origin').includes('localhost');
  const origin =
    (sdkOrigins.length ? sdkOrigins : validOrigins).some((regex) =>
      regex.test(req.get('origin'))
    ) || isLocal
      ? req.get('origin')
      : false;
  callback(null, { origin, credentials: true });
};
