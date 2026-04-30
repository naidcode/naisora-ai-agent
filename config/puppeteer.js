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

  // If not on linux and no env path, delete executablePath to use bundled chromium
  if (process.platform !== 'linux' && !process.env.PUPPETEER_EXECUTABLE_PATH) {
    delete options.executablePath;
  } else if (process.platform === 'linux' && !fs.existsSync(options.executablePath)) {
     // Fallback for some linux distros
     const fallbackPath = '/usr/bin/google-chrome';
     if (fs.existsSync(fallbackPath)) options.executablePath = fallbackPath;
  }

  return await puppeteer.launch(options);
}

module.exports = { launchBrowser };
