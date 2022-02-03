const sdk = require('@twentyfourg/cloud-sdk');
const { nanoid } = require('nanoid');

const calculateNextResetTime = (windowMs) => {
  const resetTime = new Date();
  resetTime.setMilliseconds(resetTime.getMilliseconds() + windowMs);
  return resetTime;
};

module.exports = class DynamoStore {
  constructor() {
    this.enabled = true;
    this.uuid = nanoid(5);
    this.dynamo = sdk.cache.dynamo({ tableName: 'rate-limit' });
  }

  // must be synchronous
  init(options) {
    this.windowMs = options.windowMs;
    this.resetTime = calculateNextResetTime(this.windowMs);

    (async () => this.resetAll())();

    const interval = setInterval(async () => {
      await this.resetAll();
    }, this.windowMs);
    if (interval.unref) {
      interval.unref();
    }
  }

  async increment(key) {
    const totalHits =
      ((await this.commit(this.dynamo.get.bind(this.dynamo, this.uuid + key))) ?? 0) + 1;
    await this.commit(this.dynamo.set.bind(this.dynamo, this.uuid + key, totalHits));

    return {
      totalHits,
      resetTime: this.resetTime,
    };
  }

  async decrement(key) {
    const current = await this.commit(this.dynamo.get.bind(this.dynamo, this.uuid + key));
    if (current)
      await this.commit(this.dynamo.set.bind(this.dynamo, (this.uuid + key, current - 1)));
  }

  async resetKey(key) {
    await this.commit(this.dynamo.delete.bind(this.dynamo, this.uuid + key));
  }

  async resetAll() {
    await this.commit(this.dynamo.deleteByPattern.bind(this.dynamo, '*'));
    this.resetTime = calculateNextResetTime(this.windowMs);
  }

  async commit(callback) {
    if (!this.enabled) return;
    return callback()
      .then((data) => data)
      .catch((error) => {
        this.enabled = false;
        console.error(error);
      });
  }
};
