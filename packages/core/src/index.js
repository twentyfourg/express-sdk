require('dotenv').config();
const { dependencies } = require('../package.json');

const { SDK_CORE_LOCATION } = process.env;
const packages = {};

for (const [dependency] of Object.entries(dependencies)) {
  if (dependency.includes('@twentyfourg-express-sdk')) {
    const folder = dependency.replace(/@twentyfourg-express-sdk\//g, '');

    const name = folder
      .replace(/-./g, (x) => x[1].toUpperCase())
      .replace(/_./g, (x) => x[1].toUpperCase())
      .replace(/.\./g, (x) => x[1].toUpperCase());

    const path = SDK_CORE_LOCATION !== 'local' ? dependency : `../../${folder}`;
    // eslint-disable-next-line import/no-dynamic-require
    packages[name] = require(path);
  }
}

module.exports = packages;
