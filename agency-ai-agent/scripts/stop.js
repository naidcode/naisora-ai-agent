// scripts/stop.js
const { stopAgent } = require('../system/masterSwitch');
stopAgent();
console.log('Agent has been deactivated.');
