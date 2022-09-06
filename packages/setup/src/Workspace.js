#!/usr/bin/env node

const prompts = require('prompts');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { default: axios } = require('axios');

const promptCancelled = () => process.exit();

class Workspace {
  constructor(spec = {}) {
    this.name = spec.name;
    this.developerEmail = spec.developerEmail;
    this.jobName = spec.jobName;
    this.jobNumber = spec.jobNumber;
    this.services = spec.services || [];
    this.secretPath = spec.secretPath;
  }

  async init() {
    try {
      const { data: vaultLookup } = await axios({
        method: 'get',
        url: 'https://vault.24g.dev/v1/auth/token/lookup-self',
        headers: { 'X-Vault-Token': fs.readFileSync(`${os.homedir()}/.vault-token`, 'utf-8') },
        validateStatus: () => true,
      });
      this.developerEmail = vaultLookup?.data?.meta?.email || null;
      // eslint-disable-next-line no-empty
    } catch (error) {}

    this.name = (
      await prompts(
        {
          type: 'text',
          name: 'name',
          message: 'Name of the project?',
          initial: this.name || path.basename(process.env.INIT_CWD),
        },
        { onCancel: promptCancelled }
      )
    ).name;

    const { developerEmail, jobNumber, jobName, services } = await prompts(
      [
        {
          type: 'text',
          name: 'developerEmail',
          message: "What's your 24G email?",
          initial: this.developerEmail,
        },
        {
          type: 'text',
          name: 'jobNumber',
          message: '24G job number of the project?',
          initial: this.jobNumber || Workspace.regex(this.name, /\d+-\d/g),
        },
        {
          type: 'text',
          name: 'jobName',
          message: '24G job name of the project?',
          initial: this.jobName || Workspace.regex(this.name, /(?:\d+-\d-)(.+)/, 1),
        },
        {
          type: 'multiselect',
          name: 'services',
          message: 'Pick what services you would like to run locally with Docker Compose.',
          choices: [
            // TODO
            { title: 'MySQL', value: 'mysql', selected: this.services?.includes('mysql') },
            {
              title: 'DynamoDB (Cache/Rate Limit Table)',
              value: 'dynamo',
              selected: this.services?.includes('dynamo'),
            },
            { title: 'API', value: 'api', selected: this.services?.includes('api') },
            { title: 'SQS', value: 'sqs', selected: this.services?.includes('sqs') },
            { title: 'EZQ', value: 'ezq', selected: this.services?.includes('ezq') },
          ],
        },
      ],
      { onCancel: promptCancelled }
    );
    this.developerEmail = developerEmail;
    this.jobNumber = jobNumber;
    this.jobName = jobName;
    this.services = services;

    this.secretPath = (
      await prompts(
        [
          {
            type: 'text',
            name: 'secretPath',
            message: 'Vault path of the project?',
            initial:
              this.secretPath || this.name === 'express-template'
                ? '/kv/express-template/dev/backend-secrets,/kv/express-template/dev/backend-infrastructure-secrets'
                : `/kv/${this.jobNumber}/dev/backend-infrastructure-secrets,/kv/${this.jobNumber}/dev/backend-secrets,/kv/${this.jobNumber}/dev/cloudfront-keys,/kv/${this.jobNumber}/dev/mysql/${this.developerEmail}`,
          },
        ],
        { onCancel: promptCancelled }
      )
    ).secretPath;
  }

  printSpec() {
    fs.mkdirSync('./.develop', { recursive: true });
    fs.writeFileSync('./.develop/workspace.spec.json', JSON.stringify(this));
  }

  async printDotEnv() {
    const dotEnv = { SECRET_PATH: this.secretPath, ENV: 'local', NODE_ENV: 'local' };

    // Set all MySQL env vars if MySQL is a service in the workspace
    if (this.services?.includes('mysql')) {
      if (this.services?.includes('api')) {
        dotEnv.READER_SQL_HOST = `${this.name}-mysql`;
      } else {
        dotEnv.READER_SQL_HOST = 'localhost';
      }
      dotEnv.WRITER_SQL_HOST = dotEnv.READER_SQL_HOST;
      dotEnv.SQL_DATABASE = this.name.replace(/-/g, '_');
      dotEnv.SQL_USER = 'root';
      dotEnv.SQL_PASSWORD = '';
    }

    if (this.services?.includes('dynamo')) {
      if (this.services?.includes('api')) {
        dotEnv.DYNAMO_ENDPOINT = `http://${this.name}-dynamo:8000`;
      } else {
        dotEnv.DYNAMO_ENDPOINT = 'http://localhost:8000';
      }
    }

    if (this.services?.includes('sqs') || this.services?.includes('ezq')) {
      if (this.services?.includes('api')) {
        dotEnv.SQS_EZQ_URL = 'http://sqs:9324/queue/ezq.fifo';
        dotEnv.SQS_MAIN_URL = 'http://sqs:9324/queue/main';
      } else {
        dotEnv.SQS_EZQ_URL = 'http://localhost:9324/queue/ezq.fifo';
        dotEnv.SQS_MAIN_URL = 'http://localhost:9324/queue/main';
      }
    }

    await Workspace.safePrint('./.env', Workspace.objectToEnv(dotEnv));
  }

  async printDockerComposeV3() {
    const composeV3 = {
      version: '3',
      services: {},
    };

    const apiService = {
      container_name: `${this.name}-api`,
      build: {
        context: '.',
        dockerfile: 'Dockerfile',
      },
      entrypoint: '.develop/dev.entrypoint.sh',
      // TODO
      depends_on: Workspace.removeFromArray(this.services, 'api'),
      volumes: ['.:/app', '/app/node_modules', '~/.vault-token:/root/.vault-token'],
      ports: ['3000:3000', '9228:9228', '9229:9229'],
      environment: {
        VAULT_ADDR: 'https://vault.24g.dev',
      },
    };

    const mySQLService = {
      container_name: `${this.name}-mysql`,
      image: 'mysql/mysql-server',
      command: '--default-authentication-plugin=mysql_native_password --sql-mode=""',
      volumes: ['.develop/mysql:/docker-entrypoint-initdb.d:cached'],
      ports: ['3306:3306'],
      environment: {
        MYSQL_ALLOW_EMPTY_PASSWORD: 'true',
      },
    };

    const dynamoService = {
      container_name: `${this.name}-dynamo`,
      image: 'twentyfourg/dynamodb-local',
      ports: ['8000:8000', '8001:8001'],
    };

    const ezqService = {
      container_name: `${this.name}-ezq`,
      image: 'twentyfourg/ezq',
      environment: {
        SQS_EZQ_URL: 'http://sqs:9324/queue/ezq.fifo',
        SECRET_PATH: this.secretPath,
        VAULT_ADDR: 'https://vault.24g.dev',
        AWS_ACCESS_KEY_ID: 'local',
        AWS_SECRET_ACCESS_KEY: 'local',
        READER_SQL_HOST: 'mysql',
        WRITER_SQL_HOST: 'mysql',
        SQL_DATABASE: this.name.replace('-', '_'),
        SQL_USER: 'root',
        SQL_PASSWORD: '',
      },
      depends_on: {
        sqs: {
          condition: 'service_healthy',
        },
      },
      volumes: ['~/.vault-token:/root/.vault-token'],
    };

    const sqsService = {
      container_name: `${this.name}-sqs`,
      image: 'roribio16/alpine-sqs',
      volumes: ['./.develop/sqs/sqs.conf:/opt/config/elasticmq.conf'],
      ports: ['9324:9324', '9325:9325'],
      healthcheck: {
        test: 'CMD netstat -tulpn | grep 9324 || true',
        interval: '2s',
        timeout: '1s',
        retries: 3,
        start_period: '3s',
      },
    };

    if (this.services?.includes('api')) composeV3.services.api = apiService;
    if (this.services?.includes('mysql')) composeV3.services.mysql = mySQLService;
    if (this.services?.includes('dynamo')) composeV3.services.dynamo = dynamoService;
    if (this.services?.includes('ezq')) composeV3.services.ezq = ezqService;
    if (this.services?.includes('sqs')) composeV3.services.sqs = sqsService;

    await Workspace.safePrint('./docker-compose.yml', yaml.dump(composeV3));
  }

  async printSQL() {
    if (!this.services?.includes('mysql')) return;

    const sqlStatement = `CREATE DATABASE IF NOT EXISTS \`${this.name.replace(
      '-',
      '_'
    )}\`;\n\nCREATE USER 'root'@'%' IDENTIFIED BY '';\nGRANT ALL PRIVILEGES ON *.* TO 'root'@'%';`;

    fs.mkdirSync('./.develop/mysql', { recursive: true });
    await Workspace.safePrint('./.develop/mysql/1-setup.sql', sqlStatement);
  }

  async printWaitFor() {
    if (this.services?.includes('mysql'))
      await Workspace.safePrint(
        './.develop/mysql/wait-for-mysql.sh',
        `echo "Wait for SQL server (${this.name}-mysql:3306) to actually be available...";\nwhile ! echo exit | nc $containerName"-mysql" 3306 &>/dev/null; do echo "..."; sleep 5; done\necho "SQL server responded to ping!"`
      );
  }

  async printEntrypoint() {
    if (!this.services?.includes('api')) return;
    let waitFor = '';
    if (this.services?.includes('api')) waitFor += 'sh .develop/docker/wait-for-mysql.sh\n';
    await Workspace.safePrint(
      './.develop/dev.entrypoint.sh',
      `#!/bin/sh\n${waitFor}npm install --ignore-scripts --silent\nnpm run migrations\nnpm run seeds\nnpm run local`
    );
  }

  static objectToEnv(envContent) {
    let objectToString = '';

    Object.keys(envContent).forEach((key) => {
      const value = envContent[key];
      objectToString += `${key}=${value}\n`;
    });

    return objectToString;
  }

  static regex(string, regex, group = 0) {
    try {
      return string.match(regex)[group];
    } catch (e) {
      return null;
    }
  }

  static removeFromArray(array, remove) {
    if (!array) return array;
    array = array.slice(0); // copy the array so method is non-destructive
    const index = array.indexOf(remove);
    if (index !== -1) {
      array.splice(index, 1);
    }
    return array;
  }

  static async safePrint(file, content) {
    try {
      if (fs.existsSync(file)) {
        if (content === fs.readFileSync(file).toString()) return;
        const { doNext } = await prompts(
          {
            type: 'select',
            name: 'doNext',
            message: `There is already a file at ${file}, how would you like to proceed?`,
            choices: [
              { title: 'Truncate file', value: 'truncate' },
              { title: 'Append to the file the updated version', value: 'append' },
              { title: 'Keep current version as is', value: 'keep' },
            ],
          },
          { onCancel: promptCancelled }
        );

        if (doNext === 'keep') return;

        if (doNext === 'truncate') {
          return fs.writeFileSync(file, content, 'utf8');
        }

        if (doNext === 'append') {
          fs.appendFileSync(file, '\n====== NEW =====\n', 'utf8');
          return fs.appendFileSync(file, content, 'utf8');
        }
      } else {
        fs.writeFileSync(file, content, 'utf8');
      }
    } catch (err) {
      return fs.writeFileSync(file, content, 'utf8');
    }
  }
}

module.exports = Workspace;
