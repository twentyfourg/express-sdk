const _ = require('lodash');
const rateLimit = require('express-rate-limit');
const DynamoStore = require('./dynamo.store');

module.exports = (opts) => {
  const defaults = {
    minutes: 1,
    max: 15,
    standardHeaders: true,
    message: { error: 'too many requests, please try again later' },
    keys: ['ip', 'headers["user-agent"]'],
  };
  const { minutes, name, ...options } = { ...defaults, ...opts };
  return rateLimit({
    windowMs: minutes * 60 * 1000,
    ...options,
    store: new DynamoStore(),
    keyGenerator: (req /* , res */) => {
      const keys = name ? [name] : [req.method, req.originalUrl];
      options.keys?.forEach((key) => {
        if (_.get(req, key)) keys.push(_.get(req, key));
      });
      return keys.join(':');
    },
  });
};
