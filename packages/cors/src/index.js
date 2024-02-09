const RegexEscape = require('regex-escape');

const { FRONTEND_URL, SDK_CORS_ORIGINS } = process.env;
const env = (...args) =>
  [...args].includes(process.env.ENV) || [...args].includes(process.env.NODE_ENV);

let hasWarnedFrontendUrl = false;

// Determine the apex domain from the FRONTEND_URL, handling multiple subdomains or just the domain
const apexDomain =
  // Use regex to count dots in the URL to decide if there's more than one subdomain
  (FRONTEND_URL?.match(/\./g) || []).length > 1
    ? FRONTEND_URL.split('.').slice(-2).join('.') // Extract the last two segments if multiple subdomains exist
    : FRONTEND_URL // Use the FRONTEND_URL directly if it's a simple domain or a single subdomain
    ? FRONTEND_URL.replace(/(^\w+:|^)\/\//, '') // Remove protocol from FRONTEND_URL
    : false; // Fallback to false if FRONTEND_URL is not defined

// Construct the list of valid origins based on the apex domain
const validOrigins = apexDomain
  ? [
      new RegExp(`^${RegexEscape(FRONTEND_URL)}$`), // Exact match for FRONTEND_URL
      /* eslint-disable no-useless-escape */
      new RegExp(`.*\.${RegexEscape(apexDomain)}$`), // Match any subdomain of the apex domain
    ]
  : [];

// Process SDK_CORS_ORIGINS to allow specific origins and their 'www' subdomains
const sdkOrigins = SDK_CORS_ORIGINS
  ? SDK_CORS_ORIGINS.replace(/\s/g, '') // Remove any whitespace
      .split(',') // Split into individual origins
      .reduce((acc, origin) => {
        // Extract the protocol (http or https) and the domain
        const match = origin.match(/^(https?:\/\/)?(.+)/);
        if (!match) return acc; // Skip if the origin format is incorrect

        const protocol = match[1] || 'https://'; // Default to https if the protocol is missing
        const protocolAndDomain = match[2];

        // Add the original domain as a valid origin, including the protocol
        acc.push(new RegExp(`^${RegexEscape(protocol + protocolAndDomain)}$`));

        // Add 'www' subdomain version if not already specified and include the protocol
        if (!protocolAndDomain.startsWith('www.')) {
          acc.push(new RegExp(`^${RegexEscape(`${protocol}www.${protocolAndDomain}`)}$`));
        }

        return acc;
      }, [])
  : [];

// Middleware function to handle CORS requests
module.exports = (req, callback) => {
  // Check if FRONTEND_URL is not set and warning has not been logged yet
  if (!apexDomain && !hasWarnedFrontendUrl) {
    console.warn('CORS: process.env.FRONTEND_URL not found');
    hasWarnedFrontendUrl = true;
  }

  // Determine if the request is from a local environment
  const isLocal =
    env('local', 'dev', 'qa') && req.get('origin') && req.get('origin').includes('localhost');

  // Check if the request's origin matches any of the valid or SDK origins, or is local
  const origin =
    (sdkOrigins.length ? sdkOrigins : validOrigins).some((regex) =>
      regex.test(req.get('origin'))
    ) || isLocal
      ? req.get('origin') // Allow the origin if it matches
      : false; // Disallow the origin if no match is found

  // Complete the callback with the decision on the origin and credentials flag
  callback(null, { origin, credentials: true });
};
