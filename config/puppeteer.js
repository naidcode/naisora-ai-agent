const puppeteer = require('puppeteer');

/**
 * Launches a Puppeteer browser with specific flags for Linux VPS compatibility.
 */
const os = require('os');
const fs = require('fs');

async function launchBrowser() {
  const options = {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
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

  // If path doesn't exist (e.g. on Windows local), delete it to use bundled chromium
  if (options.executablePath && !fs.existsSync(options.executablePath)) {
    delete options.executablePath;
  }

  // If not on linux and no executablePath, ensure it's deleted
  if (process.platform !== 'linux' && !options.executablePath) {
    delete options.executablePath;
  }

  return await puppeteer.launch(options);
}

module.exports = { launchBrowser };
