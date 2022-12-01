const _ = require('lodash');
const rateLimit = require('express-rate-limit');
const DynamoStore = require('./dynamo.store');

/**
 *
 * @param {String} string String of to be to convert of a list
 * @returns {Array<string>}
 * @description Safely converts a string to a list. Useful for environment variables
 */
function stringToList(string) {
  try {
    return string.split(',');
  } catch (error) {
    return [];
  }
}

/**
 *
 * @param {Object} opts Object for configuration
 * @param {Number} [opts.minutes=1] Time frame in minutes for which requests are checked/remembered.
 * @param {Number} [opts.max=15] The maximum number of connections to allow during the window before rate limiting the client.
 * @param {Boolean} [opts.standardHeaders=true] Whether to enable support for headers conforming to the ratelimit standardization draft.
 * @param {String || Object} [opts.message] The response body to send back when a client is rate limited.
 * @param {Array<String>} [keys] Which properties from the Express Request object to use in the rate limit composite key
 * @param {String} [whitelist=process.env.SDK_EXPRESS_WHITE_LIST] List of IP addresses to whitelist. Defaults to SDK_EXPRESS_WHITE_LIST or []
 * @return {Function} Express middleware function
 * @description Creates a rate limit Express Middleware function
 */
module.exports = (opts) => {
  const defaults = {
    minutes: 1,
    max: 15,
    standardHeaders: true,
    message: { error: 'too many requests, please try again later' },
    keys: ['ip', 'headers["user-agent"]'],
    whiteList: stringToList(process.env.SDK_EXPRESS_WHITE_LIST),
  };
  const { minutes, name, ...options } = { ...defaults, ...opts };

  if (process.env.EXPRESS_SDK_RATE_LIMIT_DISABLED === 'true') {
    return (req, res, next) => {
      next();
    };
  }
  return rateLimit({
    windowMs: minutes * 60 * 1000,
    ...options,
    store: new DynamoStore(),
    keyGenerator: (req) => {
      const keys = name ? [name] : [req.method, req.originalUrl];
      options.keys?.forEach((key) => {
        if (_.get(req, key)) keys.push(_.get(req, key));
      });
      return keys.join(':');
    },
    skip: (req) => {
      return options.whiteList.includes(req.ip);
    },
  });
};
