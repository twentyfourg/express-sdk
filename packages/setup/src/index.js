#!/usr/bin/env node

const fs = require('fs');
const simpleGit = require('simple-git');
const yaml = require('js-yaml');
const replace = require('replace-in-file');
const { prompt, Toggle, MultiSelect } = require('enquirer');

module.exports.setup = async () => {
  const args = process.argv.slice(2);
  const project = process.cwd().split('\\').pop().split('/').pop();
  const WORKFLOW_DEV = '.github/workflows/dev.yml';
  const WORKFLOW_RELEASE = '.github/workflows/qa.yml';
  let promptCount = 0;
  let commitFiles = [];
  const prompts = {};
  const replacementOptions = {
    allowEmptyPaths: true,
    glob: { dot: true },
    files: ['README.md', '.develop/**', '.env.example', 'docker-compose.yml'],
    ignore: ['node_modules/**', '.git/**/*', '.develop/scripts/setup.js'],
    from: /CHANGE_ME/g,
    to: '',
  };

  if (project === 'express-template' && !args.includes('--force')) return;

  const foundFiles = (await replace({ dry: true, ...replacementOptions })).filter(
    (obj) => obj.hasChanged
  );

  if (foundFiles.length) {
    replacementOptions.to = await prompt({
      type: 'input',
      name: 'project',
      message: 'What is the project name?',
      initial: project,
    }).then((data) => data.project);
    promptCount += 1;
  }

  if (fs.existsSync(WORKFLOW_DEV)) {
    const devWorkflow = yaml.load(fs.readFileSync(WORKFLOW_DEV));
    const initial = devWorkflow?.on?.push.branches || [];
    const choices = [...new Set(['development', 'feature/**', 'bugfix/**', ...initial])];
    const devBranches = await new MultiSelect({
      message: 'Dev deployment branches',
      initial,
      choices,
    }).run();
    promptCount += 1;
    devWorkflow.on.push.branches = devBranches;
    if (JSON.stringify(initial) !== JSON.stringify(devBranches)) commitFiles.push(WORKFLOW_DEV);
    fs.writeFileSync(WORKFLOW_DEV, yaml.dump(devWorkflow, { lineWidth: -1, noCompatMode: true }));
  }

  if (fs.existsSync(WORKFLOW_RELEASE)) {
    const releaseWorkflow = yaml.load(fs.readFileSync(WORKFLOW_RELEASE));
    const initial = releaseWorkflow?.on?.push.branches || [];
    const choices = [...new Set(['release', 'release/**', ...initial])];
    const releaseBranches = await new MultiSelect({
      message: 'Release deployment branches',
      initial,
      choices,
    }).run();
    promptCount += 1;
    releaseWorkflow.on.push.branches = releaseBranches;
    if (JSON.stringify(initial) !== JSON.stringify(releaseBranches))
      commitFiles.push(WORKFLOW_RELEASE);
    fs.writeFileSync(
      WORKFLOW_RELEASE,
      yaml.dump(releaseWorkflow, { lineWidth: -1, noCompatMode: true })
    );
  }

  const replacements = (await replace({ dry: false, ...replacementOptions }))
    .filter((obj) => obj.hasChanged)
    .map((obj) => obj.file);

  if (replacements.length) {
    console.log(
      `Replacing CHANGE_ME with ${replacementOptions.to} in ${
        replacements.length
      } file(s): ${replacements.map((file) => `\n - ${file}`).join('')}`
    );
  }

  commitFiles = [...commitFiles, ...replacements];

  if (commitFiles.length) {
    prompts.commit = await new Toggle({
      message: 'Stage and commit setup changes?',
      enabled: 'Yes',
      disabled: 'No',
      initial: 'Yes',
    }).run();
    promptCount += 1;
  }

  if (commitFiles.length && prompts.commit) {
    const git = simpleGit();
    await git.commit('chore: setup', commitFiles);
  }

  if (promptCount === 0) console.log('Nothing to setup');
};

this.setup().catch((error) => {
  if (error) console.error(error.message);
});
