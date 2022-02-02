const fs = require('fs');

module.exports = (password) => {
  const passwords = fs
    .readFileSync('./src/10-million-password-list-top-1000.txt', 'utf8')
    .split('\n');
  return passwords.includes(password);
};
