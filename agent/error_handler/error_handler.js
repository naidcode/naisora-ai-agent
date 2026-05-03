const { db } = require('../database/database');

/**
 * Log error with persistent anti-spam protection
 */
async function logError(moduleName, error) {
  const message = error.message || 'Unknown Error';
  
  try {
    // Check frequency in the last 10 minutes from DB
    const occurrenceCount = await db.errors.getFrequency(moduleName, message, 10);

    if (occurrenceCount > 5) {
      console.log(`🔇 Error spam suppressed in DB for: ${moduleName} - "${message}" (${occurrenceCount} occurrences)`);
      return;
    }

    console.error(`🚨 Error in ${moduleName}:`, message);

    await db.errors.upsert({
      module: moduleName,
      errorType: error.name || 'Error',
      message: message,
      retryCount: 0,
      resolved: false
    });
  } catch (err) {
    console.error('CRITICAL: Failed to handle error log:', err.message);
  }
}

module.exports = {
  logError
};
