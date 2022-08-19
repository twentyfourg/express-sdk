const sdk = require('@twentyfourg/cloud-sdk');

const { DYNAMO_RATE_LIMIT_TABLE } = process.env;

module.exports = class DynamoStore {
  constructor() {
    this.enabled = true;
    this.dynamo = sdk.cache.dynamo({ tableName: DYNAMO_RATE_LIMIT_TABLE || 'rate-limit' });
  }

  // must be synchronous
  init(options) {
    this.max = options.max;
    this.windowMs = options.windowMs;
    this.resetTime = this.calculateNextResetTime();
  }

  async increment(key) {
    const { count, resetTime } = await this.getKey(key);
    const totalHits = count + 1;
    await this.updateKey(key, { count: totalHits, resetTime });
    return { totalHits, resetTime };
  }

  async decrement(key) {
    const { count, resetTime } = await this.getKey(key);
    const totalHits = count - 1;
    await this.updateKey(key, { count: totalHits, resetTime });
  }

  async resetKey(key) {
    await this.commit(this.dynamo.delete.bind(this.dynamo, key));
  }

  async resetAll() {
    await this.commit(this.dynamo.deleteByPattern.bind(this.dynamo, '*'));
    this.resetTime = this.calculateNextResetTime();
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

  async getKey(key) {
    const data = await this.commit(this.dynamo.get.bind(this.dynamo, key));
    const output = data || {};
    if (!data?.count) output.count = 0;
    if (!data?.resetTime) output.resetTime = this.calculateNextResetTime();
    else output.resetTime = new Date(data.resetTime);
    return output;
  }

  async updateKey(key, data) {
    const ttl = (data.resetTime.getTime() - new Date().getTime()) / 1000;
    await this.commit(this.dynamo.set.bind(this.dynamo, key, data, { ttl }));
  }

  calculateNextResetTime() {
    const resetTime = new Date();
    resetTime.setMilliseconds(resetTime.getMilliseconds() + this.windowMs);
    return resetTime;
  }
};
