#!/usr/bin/env node

/* eslint-disable no-restricted-syntax */
require('dotenv').config();
const path = require('path');
const yaml = require('js-yaml');
const { Toggle, StringPrompt } = require('enquirer');
const listEndpoints = require('express-list-endpoints');

const fs = require('fs');

const getPaths = (docsPath) => {
  try {
    const allPaths = [];
    fs.readdirSync(docsPath)
      .filter((file) => file.indexOf('.') !== 0 && file.includes('.yml'))
      .forEach((file) => {
        const paths = yaml.load(fs.readFileSync(path.join(docsPath, file), 'utf8'));
        if (paths)
          for (const [route, methods] of Object.entries(paths)) {
            for (const [method, value] of Object.entries(methods)) {
              allPaths.push({
                path: route,
                method,
                value,
              });
            }
          }
      });
    return allPaths;
  } catch (error) {
    return [];
  }
};

const undocumented = (appPath, docsPath) => {
  // eslint-disable-next-line import/no-dynamic-require
  const endpoints = listEndpoints(require(path.resolve(process.cwd(), appPath)));
  const definedPaths = getPaths(docsPath);
  const paths = {};
  endpoints.forEach((endpoint) => {
    const methods = {};
    endpoint.path = endpoint.path
      .split('/')
      .map((part) => {
        if (part.includes(':')) part = `{${part.replace(':', '')}}`;
        return part;
      })
      .join('/');
    endpoint.methods.forEach((method) => {
      const doc = definedPaths.find(
        (obj) => obj.method === method.toLowerCase() && obj.path === endpoint.path
      );
      if (!doc) {
        const [tag] = endpoint.path.substring(1).split('/');
        methods[method.toLowerCase()] = {
          security: [
            {
              jwt: [],
            },
          ],
          tags: [tag],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  example: {},
                },
              },
            },
          },
        };
        paths[endpoint.path] = methods;
      }
    });
  });
  return paths;
};

const run = async () => {
  const appPath = await new StringPrompt({
    initial: process.env.SDK_EXPRESS_APP_PATH || './src/app.js',
    message: 'Please confirm the path to the express app:',
  }).run();

  if (!fs.existsSync(appPath) || !fs.statSync(appPath).isFile()) {
    if (!fs.existsSync(appPath)) console.log(`${appPath} is not a valid path`);
    else if (!fs.statSync(appPath).isFile()) console.log(`${appPath} is not a file`);
    process.exit();
  }

  const docsPath = await new StringPrompt({
    initial: process.env.SDK_EXPRESS_DOCS_PATH || './src/docs',
    message: 'Please confirm the path to the docs:',
  }).run();

  const documentation = undocumented(appPath, docsPath);

  if (!Object.keys(documentation).length) {
    console.log('No documentation to generate');
    process.exit();
  }

  const ordered = {};
  Object.keys(documentation)
    .sort()
    .forEach((key) => (ordered[key] = documentation[key]));

  const generate = Object.keys(ordered).map((route) => {
    return `${Object.keys(ordered[route])[0]}:${route}`;
  });

  const dryRun = await new Toggle({
    message: `Generate the following docs ${generate.join('\n')}?`,
    enabled: 'Yes',
    disabled: 'No',
    initial: 'Yes',
  }).run();

  if (!dryRun) {
    process.exit();
  }

  for (const [route, doc] of Object.entries(ordered)) {
    const filename = `${route.substring(1).split('/')[0]}.yml`;
    await fs.promises
      .mkdir(docsPath, { recursive: true })
      .catch((error) => console.error(error.message));

    const newYaml = yaml.dump({ [route]: doc });
    const currentYaml = await fs.promises
      .readFile(`${docsPath}/${filename}`)
      .catch(async (error) => {
        if (error.code === 'ENOENT') {
          await fs.promises.writeFile(`${docsPath}/${filename}`, '');
          console.log(`Created ${filename}`);
        }
      });

    await fs.promises.writeFile(`${docsPath}/${filename}`, `${currentYaml || ''} ${newYaml}\n`);
    console.log(`Generated ${Object.keys(doc)[0]}:${route}`);
  }
};

run()
  .then(() => process.exit())
  .catch((error) => {
    if (error) console.error(error);
  });
