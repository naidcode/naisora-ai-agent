const puppeteer = require('puppeteer');

/**
 * Launches a Puppeteer browser with specific flags for Linux VPS compatibility.
 */
const os = require('os');
const fs = require('fs');

async function launchBrowser() {
  const options = {
    headless: true,
    executablePath: '/usr/bin/chromium-browser',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--disable-background-networking',
      '--memory-pressure-off'
    ]
  };

  // If not on linux, remove executablePath so it uses bundled chromium
  if (process.platform !== 'linux' || !fs.existsSync(options.executablePath)) {
    delete options.executablePath;
  }

  return await puppeteer.launch(options);
}

module.exports = { launchBrowser };
