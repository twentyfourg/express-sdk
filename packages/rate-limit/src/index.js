const rateLimit = require('express-rate-limit');
const DynamoStore = require('./dynamo.store');

module.exports = (opts = {}) => {
  const defaults = {
    minutes: 1,
    max: 15,
    standardHeaders: true,
    path: null,
    message: { error: 'too many requests, please try again later' },
  };
  const { minutes, path, ...options } = { ...defaults, ...opts };

  return rateLimit({
    windowMs: minutes * 60 * 1000,
    ...options,
    store: new DynamoStore({ path }),
  });
};
