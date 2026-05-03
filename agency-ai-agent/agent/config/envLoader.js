const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split('\n');

  for (const line of lines) {
    const clean = line.replace(/\r/g, '').trim();
    if (!clean || clean.startsWith('#')) continue;

    const eqIndex = clean.indexOf('=');
    if (eqIndex === -1) continue;

    const key = clean.substring(0, eqIndex).trim();
    const value = clean.substring(eqIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

module.exports = { loadEnv };
