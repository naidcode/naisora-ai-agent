const puppeteer = require('puppeteer');

/**
 * Launches a Puppeteer browser with specific flags for Linux VPS compatibility.
 */
const os = require('os');
const fs = require('fs');

async function launchBrowser() {
  const options = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-extensions'
    ],
    protocolTimeout: 60000
  };

  // ── Robust executablePath for Ubuntu VPS ──
  if (os.platform() === 'linux') {
    const linuxPaths = [
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/snap/bin/chromium'
    ];
    
    for (const path of linuxPaths) {
      if (fs.existsSync(path)) {
        options.executablePath = path;
        break;
      }
    }
    
    if (!options.executablePath) {
      console.log('⚠️  Warning: No system Chromium found, relying on Puppeteer bundled version');
    }
  }

  return await puppeteer.launch(options);
}

module.exports = { launchBrowser };
