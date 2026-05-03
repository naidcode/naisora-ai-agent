let blockedUntil = null;
let alertSentOnce = false;

async function safeConnect(imapInstance, notifyFn) {
  if (blockedUntil && Date.now() < blockedUntil) {
    return null; // silently skip, no alert
  }

  return new Promise((resolve, reject) => {
    let resolved = false;

    const onReady = () => {
      if (resolved) return;
      resolved = true;
      blockedUntil = null;
      alertSentOnce = false;
      resolve(imapInstance);
    };

    const onError = async (err) => {
      if (resolved) return;
      
      const isAuthError = err.message.toLowerCase()
        .includes('invalid credentials');

      if (isAuthError) {
        resolved = true;
        blockedUntil = Date.now() + (2 * 60 * 60 * 1000); // block 2 hours

        if (!alertSentOnce) {
          alertSentOnce = true;
          if (notifyFn) {
            try {
              await notifyFn(
                '❌ IMAP AUTH FAILED\n' +
                'Email: hey@naisora.com\n' +
                'Host: imap.hostinger.com\n' +
                'Fix: Check .env IMAP_PASS value\n' +
                'Module disabled for 2 hours.'
              );
            } catch (e) {
              console.error('[IMAP GUARD] Failed to send Telegram alert:', e.message);
            }
          }
          console.error('[IMAP GUARD] Auth failed. Module disabled 2hrs.');
        }
        resolve(null);
      } else {
        // For other errors, we don't resolve here, 
        // we let the original listeners in emailReplyHandler handle it
        // or we could reject. But if we reject, the promise in emailReplyHandler will catch it.
        // Let's resolve with the instance anyway so the caller can handle the error event.
        // Actually, if it's not an auth error, we want the normal flow to continue.
        resolved = true;
        resolve(imapInstance); 
      }
    };

    imapInstance.once('ready', onReady);
    imapInstance.once('error', onError);

    imapInstance.connect();
  });
}

module.exports = { safeConnect };
