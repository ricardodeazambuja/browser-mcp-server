/**
 * Utility functions for Browser MCP Server
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

// Version and Protocol
const MCP_PROTOCOL_VERSION = '2024-11-05';
let version = 'unknown';
try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    version = pkg.version;
} catch (error) { }

// Module Configuration
const MODULE_MAPPING = {
    'network': ['network'],
    'performance': ['performance'],
    'security': ['security'],
    'storage': ['storage'],
    'media': ['media'],
    'tabs': ['pages'],
    'extraction': ['info_opt'],
    'advanced': [
        'mouse', 'keyboard', 'console', 'system',
        'navigation_opt', 'interaction_opt'
    ]
};

const MODULE_DESCRIPTIONS = {
    'network': 'Network monitoring, HAR export, WebSocket inspection, throttling',
    'performance': 'CPU profiling, memory snapshots, runtime metrics, web vitals',
    'security': 'Security headers, TLS/SSL info, CSP monitoring, mixed content detection',
    'storage': 'IndexedDB, Cache Storage, Service Workers management',
    'media': 'Audio/Video element inspection, spectral analysis, playback control',
    'tabs': 'Multi-tab management (new, switch, close, list)',
    'extraction': 'Advanced data extraction (DOM, text content, page metadata)',
    'advanced': 'Low-level mouse/keyboard events, console logs, system info'
};

const logFile = `${os.tmpdir()}/mcp-browser-server.log`;

function debugLog(msg) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `${timestamp} - ${msg}\n`);
}

let playwright = null;
let playwrightError = null;
let playwrightPath = null;

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

function getPlaywrightPath() {
    return playwrightPath;
}

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

    return null;
}

module.exports = {
    debugLog,
    loadPlaywright,
    getPlaywrightPath,
    findChromeExecutable,
    logFile,
    version,
    MCP_PROTOCOL_VERSION,
    MODULE_MAPPING,
    MODULE_DESCRIPTIONS
};
