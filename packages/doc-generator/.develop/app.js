// eslint-disable-next-line import/no-extraneous-dependencies
const express = require('express');

const app = express();
app.get('/test', (req, res) => res.send('OK'));
app.patch('/test/:id', (req, res) => res.send('OK'));
module.exports = app;
