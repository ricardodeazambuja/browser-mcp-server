/**
 * Browser connection and state management
 */

const os = require('os');
const { debugLog, loadPlaywright, findChromeExecutable } = require('./utils');

// Browser state
let browser = null;
let context = null;
let page = null;
let activePageIndex = 0;

/**
 * Connect to existing Chrome or launch new instance (hybrid mode)
 * @returns {Object} { browser, context, page }
 */
async function connectToBrowser() {
    // Check if browser is disconnected or closed
    if (browser && (!browser.isConnected || !browser.isConnected())) {
        debugLog('Browser connection lost, resetting...');
        browser = null;
        context = null;
        page = null;
    }

    if (!browser) {
        try {
            const pw = loadPlaywright();

            // STRATEGY 1: Try to connect to existing Chrome (Antigravity mode)
            try {
                debugLog('Attempting to connect to Chrome on port 9222...');
                browser = await pw.chromium.connectOverCDP('http://localhost:9222');
                debugLog('✅ Connected to existing Chrome (Antigravity mode)');

                const contexts = browser.contexts();
                context = contexts.length > 0 ? contexts[0] : await browser.newContext();
            } catch (connectError) {
                debugLog(`Could not connect to existing Chrome: ${connectError.message}`);
            }

            // STRATEGY 2: Launch our own Chrome (Standalone mode)
            if (!browser) {
                debugLog('No existing Chrome found. Launching new instance...');

                const profileDir = process.env.MCP_BROWSER_PROFILE ||
                    `${os.tmpdir()}/chrome-mcp-profile`;

                debugLog(`Browser profile: ${profileDir}`);

                const chromeExecutable = findChromeExecutable();
                const launchOptions = {
                    headless: false,
                    args: [
                        '--remote-debugging-port=9222',
                        '--no-first-run',
                        '--no-default-browser-check',
                        '--disable-fre',
                        '--disable-features=TranslateUI,OptGuideOnDeviceModel',
                        '--disable-sync',
                        '--disable-component-update',
                        '--disable-background-networking',
                        '--disable-breakpad',
                        '--disable-background-timer-throttling',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-renderer-backgrounding'
                    ]
                };

                if (chromeExecutable) {
                    debugLog(`Using system Chrome/Chromium: ${chromeExecutable}`);
                    launchOptions.executablePath = chromeExecutable;
                } else {
                    debugLog('No system Chrome/Chromium found. Attempting to use Playwright Chromium...');
                }

                try {
                    context = await pw.chromium.launchPersistentContext(profileDir, launchOptions);
                    browser = context;
                } catch (launchError) {
                    if (!chromeExecutable && launchError.message.includes("Executable doesn't exist")) {
                        debugLog('Playwright Chromium not installed and no system Chrome found');
                        throw new Error(
                            '❌ No Chrome/Chromium browser found!\n\n' +
                            'This MCP server needs a Chrome or Chromium browser to work.\n\n' +
                            'Option 1 - Install Chrome/Chromium on your system\n' +
                            'Option 2 - Install Playwright\'s Chromium: npx playwright install chromium\n' +
                            'Option 3 - Use with Antigravity: Open browser via Chrome logo\n'
                        );
                    }
                    throw launchError;
                }
                debugLog('✅ Successfully launched new Chrome instance (Standalone mode)');
            }

        } catch (error) {
            debugLog(`Failed to connect/launch Chrome: ${error.message}`);
            throw error;
        }
    }

    // Ensure we have a context and page
    if (!context) {
        const contexts = browser.contexts();
        context = contexts.length > 0 ? contexts[0] : await browser.newContext();
    }

    const pages = context.pages();
    if (pages.length === 0) {
        page = await context.newPage();
        activePageIndex = 0;
    } else {
        if (activePageIndex >= pages.length) activePageIndex = pages.length - 1;
        page = pages[activePageIndex];
    }

    return { browser, context, page };
}

/**
 * Get browser state
 */
function getBrowserState() {
    return { browser, context, page, activePageIndex };
}

/**
 * Set active page index
 */
function setActivePageIndex(index) {
    activePageIndex = index;
}

/**
 * Reset browser state
 */
function resetBrowserState() {
    browser = null;
    context = null;
    page = null;
    activePageIndex = 0;
}

module.exports = {
    connectToBrowser,
    getBrowserState,
    setActivePageIndex,
    resetBrowserState
};
