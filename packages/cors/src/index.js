const { FRONTEND_URL } = process.env;
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
  ? [new RegExp(`/${FRONTEND_URL}/g`), new RegExp(`.${apexDomain}$`)]
  : [];

if (!apexDomain) console.warn('CORS: process.env.FRONTEND_URL not found');

module.exports = (req, callback) => {
  const isLocal =
    env('local', 'dev', 'qa') && req.get('origin') && req.get('origin').includes('localhost');
  const origin =
    validOrigins.some((regex) => regex.test(req.get('origin'))) || isLocal
      ? req.get('origin')
      : false;
  callback(null, { origin, credentials: true });
};
