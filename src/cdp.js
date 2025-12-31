/**
 * CDP (Chrome DevTools Protocol) Session Manager
 * Manages CDP session lifecycle for advanced browser automation tools
 */

const { debugLog } = require('./utils');

// CDP session state
let cdpSession = null;
let currentPage = null;

/**
 * Get or create CDP session for current page
 * Sessions are cached per page instance for efficiency
 * @returns {CDPSession} Active CDP session
 */
async function getCDPSession() {
    // Lazy-load to avoid circular dependency with browser.js
    const { connectToBrowser } = require('./browser');
    const { page } = await connectToBrowser();

    // If page changed or session doesn't exist, create new session
    if (!cdpSession || currentPage !== page) {
        // Detach old session if it exists
        if (cdpSession) {
            try {
                await cdpSession.detach();
                debugLog('Detached old CDP session');
            } catch (e) {
                debugLog(`Failed to detach old CDP session: ${e.message}`);
            }
        }

        // Create new session for current page
        currentPage = page;
        cdpSession = await page.context().newCDPSession(page);
        debugLog('Created new CDP session');
    }

    return cdpSession;
}

/**
 * Reset CDP session state
 * Called when browser state is reset (connection lost, browser restart, etc.)
 */
function resetCDPSession() {
    if (cdpSession) {
        debugLog('Resetting CDP session state');
    }
    cdpSession = null;
    currentPage = null;
}

module.exports = {
    getCDPSession,
    resetCDPSession
};
