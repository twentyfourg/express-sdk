#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Workspace = require('./Workspace');

(async () => {
  try {
    let workspace;
    // Check if workspace spec currently exists;
    if (fs.existsSync(path.resolve(process.env.INIT_CWD, './.develop/workspace.spec.json'))) {
      workspace = new Workspace(
        JSON.parse(
          fs
            .readFileSync(path.resolve(process.env.INIT_CWD, './.develop/workspace.spec.json'))
            .toString()
        )
      );
    } else {
      workspace = new Workspace();
    }

    // Ask about workspace information
    await workspace.init();
    workspace.printSpec();
    await workspace.printDotEnv();
    await workspace.printSQL();
    await workspace.printDockerComposev3();
  } catch (error) {
    console.error(error);
  }
})();
