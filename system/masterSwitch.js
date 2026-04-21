// system/masterSwitch.js
const fs = require('fs');
const path = require('path');

const STOP_FILE = path.join(__dirname, '../STOP_AGENT.lock');

/**
 * Checks if the agent should be stopped.
 * Returns true if the STOP_AGENT.lock file exists.
 */
function isStopped() {
  return fs.existsSync(STOP_FILE);
}

/**
 * Stops the agent by creating the lock file.
 */
function stopAgent() {
  fs.writeFileSync(STOP_FILE, `Stopped at: ${new Date().toISOString()}`);
  console.log('\n🛑 Agent KILL SWITCH activated. All automated cycles will pause.');
}

/**
 * Starts the agent by removing the lock file.
 */
function startAgent() {
  if (fs.existsSync(STOP_FILE)) {
    fs.unlinkSync(STOP_FILE);
    console.log('\n✅ Agent START command received. Resuming automated cycles.');
  } else {
    console.log('\nℹ️ Agent was already active.');
  }
}

module.exports = {
  isStopped,
  stopAgent,
  startAgent
};
