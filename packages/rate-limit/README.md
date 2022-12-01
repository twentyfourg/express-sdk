# @twentyfourg-express-sdk/rate-limit

[![Version](https://flat.badgen.net/npm/v/@twentyfourg-express-sdk/rate-limit)](https://github.com/twentyfourg/express-sdk/releases) [![Installs](https://flat.badgen.net/npm/dt/@twentyfourg-express-sdk/rate-limit)](https://www.npmjs.com/package/@twentyfourg-express-sdk/rate-limit)

Rate limiting middleware.

```javascript
router.post(
  '/auth',
  rateLimit({ max: 10, minutes: 1, keys: ['ip', 'body.email'] }),
  validator.auth,
  userController.auth
);
```

| Options           | Description                                                                                   | Default                                                  |
| ----------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `minutes`         | Time frame in minutes for which requests are checked/remembered.                              | `1`                                                      |
| `max`             | The maximum number of connections to allow during the window before rate limiting the client. | `15`                                                     |
| `standardHeaders` | Whether to enable support for headers conforming to the ratelimit standardization draft.      | `true`                                                   |
| `message`         | `The response body to send back when a client is rate limited.`                               | `{ error: 'too many requests, please try again later' }` |
| `keys`            | Which properties from the Express Request object to use in the rate limit composite key       | `['ip', 'headers["user-agent"]']`                        |
| `whiteList`       | List of IP addresses to whitelist                                                             | `SDK_EXPRESS_WHITE_LIST` environment variable            |

## Environment Variables

| Variable                          | Description                                                                          | Default |
| --------------------------------- | ------------------------------------------------------------------------------------ | ------- |
| `SDK_EXPRESS_WHITE_LIST`          | String of IP addresses separated by commas to whitelist                              | `[]`    |
| `EXPRESS_SDK_RATE_LIMIT_DISABLED` | Whether to disable rate limiting all together. Helpful for testing/dev environments. | `false` |
