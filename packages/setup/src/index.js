#!/usr/bin/env node

const fs = require('fs');
const Workspace = require('./Workspace');

(async () => {
  try {
    let workspace;
    // Check if workspace spec currently exists;
    if (fs.existsSync('./.develop/workspace.spec.json')) {
      workspace = new Workspace(fs.readFileSync('./.develop/workspace.spec.json'));
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
