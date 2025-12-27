/**
 * Utility functions for Browser MCP Server
 */

const fs = require('fs');
const os = require('os');

// Log file location
const logFile = `${os.tmpdir()}/mcp-browser-server.log`;

/**
 * Log debug messages to file
 * @param {string} msg - Message to log
 */
function debugLog(msg) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `${timestamp} - ${msg}\n`);
}

// Playwright loading state
let playwright = null;
let playwrightError = null;
let playwrightPath = null;

/**
 * Load Playwright from multiple possible sources
 * @returns {Object} Playwright module
 * @throws {Error} If Playwright cannot be loaded
 */
function loadPlaywright() {
    if (playwright) return playwright;
    if (playwrightError) throw playwrightError;

    const sources = [
        { path: 'playwright', name: 'npm Playwright (local)' },
        { path: `${process.env.HOME}/.cache/ms-playwright-go/1.50.1/package`, name: 'Antigravity Go Playwright' },
        { path: `${process.env.HOME}/.npm-global/lib/node_modules/playwright`, name: 'npm Playwright (global)' }
    ];

    for (const source of sources) {
        try {
            debugLog(`Trying to load Playwright from: ${source.path}`);
            playwright = require(source.path);
            playwrightPath = source.path;
            debugLog(`✅ Playwright loaded successfully: ${source.name}`);
            return playwright;
        } catch (error) {
            debugLog(`❌ Could not load from ${source.path}: ${error.message}`);
        }
    }

    playwrightError = new Error(
        '❌ Playwright is not installed.\n\n' +
        'To install Playwright:\n' +
        '1. In Antigravity: Click the Chrome logo (top right) to "Open Browser" - this installs Playwright automatically\n' +
        '2. Standalone mode: Run:\n' +
        '   npm install playwright\n' +
        '   npx playwright install chromium\n\n' +
        `Tried locations:\n${sources.map(s => `  - ${s.path}`).join('\n')}`
    );
    throw playwrightError;
}

/**
 * Get the path where Playwright was loaded from
 * @returns {string|null} Playwright path or null
 */
function getPlaywrightPath() {
    return playwrightPath;
}

/**
 * Find Chrome executable in common locations
 * @returns {string|null} Path to Chrome executable or null
 */
function findChromeExecutable() {
    const { execSync } = require('child_process');

    const commonPaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];

    for (const path of commonPaths) {
        if (fs.existsSync(path)) {
            debugLog(`Found Chrome at: ${path}`);
            return path;
        }
    }

    if (process.platform !== 'win32') {
        try {
            const result = execSync('which google-chrome || which chromium || which chromium-browser', { encoding: 'utf8' }).trim();
            if (result && fs.existsSync(result)) {
                debugLog(`Found Chrome via 'which': ${result}`);
                return result;
            }
        } catch (e) {
            debugLog(`'which' command failed: ${e.message}`);
        }
    }

    debugLog('No system Chrome found');
    return null;
}

module.exports = {
    debugLog,
    loadPlaywright,
    getPlaywrightPath,
    findChromeExecutable,
    logFile
};
