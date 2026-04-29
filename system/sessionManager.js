// system/sessionManager.js
const fs = require('fs');
const path = require('path');
const { handleError, ErrorType } = require('./errorHandler');

const DATA_DIR = path.join(__dirname, '../data');
const SESSIONS = {
  INSTAGRAM: path.join(DATA_DIR, 'ig_session.json'),
  LINKEDIN: path.join(DATA_DIR, 'linkedin_session.json')
};

/**
 * Ensures the data directory exists
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Loads cookies from a session file
 */
function loadSession(platform) {
  const filePath = SESSIONS[platform.toUpperCase()];
  if (filePath && fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      console.error(`[SessionManager] Failed to parse ${platform} session:`, err.message);
    }
  }
  return null;
}

/**
 * Saves cookies to a session file
 */
function saveSession(platform, cookies) {
  ensureDataDir();
  const filePath = SESSIONS[platform.toUpperCase()];
  if (filePath) {
    fs.writeFileSync(filePath, JSON.stringify(cookies, null, 2));
    console.log(`[SessionManager] Saved ${platform} session.`);
  }
}

/**
 * Validates if the browser is logged into the platform
 */
async function validateSession(page, platform) {
  try {
    if (platform.toUpperCase() === 'INSTAGRAM') {
      await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2', timeout: 30000 });
      const isLoggedIn = await page.$('svg[aria-label="Home"]') || 
                         await page.$('svg[aria-label="New post"]') ||
                         await page.$('img[alt*="profile"]');
      return !!isLoggedIn;
    }
    
    if (platform.toUpperCase() === 'LINKEDIN') {
      await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle2', timeout: 30000 });
      const isLoggedIn = await page.$('div.feed-identity-module') || 
                         await page.$('div#global-nav') ||
                         await page.$('img.global-nav__me-photo');
      return !!isLoggedIn;
    }
  } catch (err) {
    console.warn(`[SessionManager] Validation error for ${platform}:`, err.message);
  }
  return false;
}

/**
 * Performs a fresh login and saves the session
 */
async function performLogin(page, platform) {
  console.log(`[SessionManager] Performing fresh login for ${platform}...`);
  try {
    if (platform.toUpperCase() === 'INSTAGRAM') {
      await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });
      await page.waitForSelector('input[name="username"]', { timeout: 10000 });
      await page.type('input[name="username"]', process.env.INSTAGRAM_USERNAME, { delay: 100 });
      await page.type('input[name="password"]', process.env.INSTAGRAM_PASSWORD, { delay: 100 });
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
    } else if (platform.toUpperCase() === 'LINKEDIN') {
      await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' });
      await page.waitForSelector('#username', { timeout: 10000 });
      await page.type('#username', process.env.LINKEDIN_EMAIL, { delay: 100 });
      await page.type('#password', process.env.LINKEDIN_PASSWORD, { delay: 100 });
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
    }

    const valid = await validateSession(page, platform);
    if (valid) {
      const cookies = await page.cookies();
      saveSession(platform, cookies);
      return true;
    }
  } catch (err) {
    await handleError(err, `Login for ${platform}`, ErrorType.AUTH);
  }
  return false;
}

/**
 * Ensures a valid session exists, logging in if necessary
 */
async function ensureAuthenticated(page, platform) {
  const cookies = loadSession(platform);
  if (cookies) {
    console.log(`[SessionManager] Loading saved cookies for ${platform}...`);
    await page.setCookie(...cookies);
    const isValid = await validateSession(page, platform);
    if (isValid) {
      console.log(`[SessionManager] ${platform} session is valid.`);
      return true;
    }
    console.log(`[SessionManager] ${platform} session expired.`);
  }

  return await performLogin(page, platform);
}

module.exports = {
  ensureAuthenticated,
  loadSession,
  saveSession,
  validateSession
};
