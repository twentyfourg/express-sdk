#!/usr/bin/env node

const fs = require('fs');
const Workspace = require('./Workspace');

(async () => {
  try {
    let workspace;
    // Check if workspace spec currently exists;
    if (fs.existsSync('./.develop/workspace.spec.json')) {
      workspace = new Workspace(
        JSON.parse(fs.readFileSync('./.develop/workspace.spec.json').toString())
      );
    } else {
      workspace = new Workspace();
    }

    // Ask about workspace information
    await workspace.init();
    workspace.printSpec();
    await workspace.printDotEnv();
    await workspace.printSQL();
    await workspace.printWaitFor();
    await workspace.printEntrypoint();
    await workspace.printDockerComposeV3();
  } catch (error) {
    console.error(error);
  }
})();
