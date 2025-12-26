#!/usr/bin/env node

/**
 * Browser Automation MCP Server for Antigravity (Playwright Edition)
 *
 * This MCP server provides 13 browser automation tools by connecting to
 * Antigravity's Chrome instance that runs with remote debugging on port 9222.
 *
 * Antigravity launches Chrome with:
 *   --remote-debugging-port=9222
 *   --user-data-dir=~/.gemini/antigravity-browser-profile
 *
 * This server uses the same Playwright installation as browser_subagent,
 * allowing seamless integration with Antigravity's browser ecosystem.
 */

const fs = require('fs');
const os = require('os');
const logFile = `${os.tmpdir()}/mcp-browser-server.log`;

// Helper to log debug info
function debugLog(msg) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `${timestamp} - ${msg}\n`);
}

debugLog('Server starting...');
debugLog(`HOME: ${process.env.HOME}`);
debugLog(`CWD: ${process.cwd()}`);

let playwright = null;
let playwrightError = null;
let playwrightPath = null;

// Try to load Playwright from multiple sources
function loadPlaywright() {
  if (playwright) return playwright;
  if (playwrightError) throw playwrightError;

  const sources = [
    // 1. Antigravity's Go-based Playwright
    { path: `${process.env.HOME}/.cache/ms-playwright-go/1.50.1/package`, name: 'Antigravity Go Playwright' },
    // 2. Standard npm Playwright (local)
    { path: 'playwright', name: 'npm Playwright (local)' },
    // 3. Global npm Playwright
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

  // None worked
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

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

let browser = null;
let context = null;
let page = null;

// Console log capture
let consoleLogs = [];
let consoleListening = false;

// Connect to existing Chrome OR launch new instance (hybrid mode)
async function connectToBrowser() {
  if (!browser) {
    try {
      // Load Playwright (will throw if not installed)
      const pw = loadPlaywright();

      // STRATEGY 1: Try to connect to existing Chrome (Antigravity mode)
      try {
        debugLog('Attempting to connect to Chrome on port 9222...');
        browser = await pw.chromium.connectOverCDP('http://localhost:9222');
        debugLog('✅ Connected to existing Chrome (Antigravity mode)');

        const contexts = browser.contexts();
        context = contexts.length > 0 ? contexts[0] : await browser.newContext();
        const pages = context.pages();
        page = pages.length > 0 ? pages[0] : await context.newPage();

        debugLog('Successfully connected to Chrome');
        return { browser, context, page };
      } catch (connectError) {
        debugLog(`Could not connect to existing Chrome: ${connectError.message}`);
      }

      // STRATEGY 2: Launch our own Chrome (Standalone mode)
      debugLog('No existing Chrome found. Launching new instance...');

      const profileDir = process.env.MCP_BROWSER_PROFILE ||
                        `${os.tmpdir()}/chrome-mcp-profile`;

      debugLog(`Browser profile: ${profileDir}`);

      browser = await pw.chromium.launch({
        headless: false,
        args: [
          // CRITICAL: Remote debugging
          '--remote-debugging-port=9222',

          // CRITICAL: Isolated profile (don't touch user's personal Chrome!)
          `--user-data-dir=${profileDir}`,

          // IMPORTANT: Skip first-run experience
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-fre',

          // STABILITY: Reduce popups and background activity
          '--disable-features=TranslateUI,OptGuideOnDeviceModel',
          '--disable-sync',
          '--disable-component-update',
          '--disable-background-networking',
          '--disable-breakpad',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      });

      context = await browser.newContext();
      page = await context.newPage();

      debugLog('✅ Successfully launched new Chrome instance (Standalone mode)');

    } catch (error) {
      debugLog(`Failed to connect/launch Chrome: ${error.message}`);
      const errorMsg =
        '❌ Cannot start browser.\n\n' +
        'To fix this:\n' +
        '1. In Antigravity: Click the Chrome logo (top right) to "Open Browser"\n' +
        '2. Standalone mode: Ensure Playwright is installed:\n' +
        '   npm install playwright\n' +
        '   npx playwright install chromium\n\n' +
        `Error: ${error.message}`;
      throw new Error(errorMsg);
    }
  }
  return { browser, context, page };
}

// MCP Tool definitions
const tools = [
  {
    name: 'browser_navigate',
    description: 'Navigate to a URL in the browser',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to navigate to' }
      },
      required: ['url'],
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_click',
    description: 'Click an element on the page using Playwright selector',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Playwright selector for the element' }
      },
      required: ['selector'],
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_screenshot',
    description: 'Take a screenshot of the current page',
    inputSchema: {
      type: 'object',
      properties: {
        fullPage: { type: 'boolean', description: 'Capture full page', default: false }
      },
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_get_text',
    description: 'Get text content from an element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Playwright selector for the element' }
      },
      required: ['selector'],
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_type',
    description: 'Type text into an input field',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Playwright selector for the input' },
        text: { type: 'string', description: 'Text to type' }
      },
      required: ['selector', 'text'],
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_evaluate',
    description: 'Execute JavaScript in the browser context',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'JavaScript code to execute' }
      },
      required: ['code'],
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_wait_for_selector',
    description: 'Wait for an element to appear on the page',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Playwright selector to wait for' },
        timeout: { type: 'number', description: 'Timeout in milliseconds', default: 30000 }
      },
      required: ['selector'],
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_scroll',
    description: 'Scroll the page',
    inputSchema: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'Horizontal scroll position' },
        y: { type: 'number', description: 'Vertical scroll position' }
      },
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_resize_window',
    description: 'Resize the browser window (useful for testing responsiveness)',
    inputSchema: {
      type: 'object',
      properties: {
        width: { type: 'number', description: 'Window width in pixels' },
        height: { type: 'number', description: 'Window height in pixels' }
      },
      required: ['width', 'height'],
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_get_dom',
    description: 'Get the full DOM structure or specific element data',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Optional selector to get DOM of specific element' }
      },
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_start_video_recording',
    description: 'Start recording browser session as video',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to save the video file' }
      },
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_stop_video_recording',
    description: 'Stop video recording and save the file',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_health_check',
    description: 'Check if the browser is running and accessible on port 9222',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_console_start',
    description: 'Start capturing browser console logs (console.log, console.error, console.warn, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        level: {
          type: 'string',
          description: 'Optional filter for log level: "log", "error", "warn", "info", "debug", or "all"',
          enum: ['log', 'error', 'warn', 'info', 'debug', 'all']
        }
      },
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_console_get',
    description: 'Get all captured console logs since browser_console_start was called',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'Optional filter by log level: "log", "error", "warn", "info", "debug", or "all"',
          enum: ['log', 'error', 'warn', 'info', 'debug', 'all']
        }
      },
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_console_clear',
    description: 'Clear all captured console logs and stop listening',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  }
];

// Tool execution handlers
async function executeTool(name, args) {
  try {
    const { page } = await connectToBrowser();

    switch (name) {
      case 'browser_navigate':
        await page.goto(args.url, { waitUntil: 'domcontentloaded' });
        return { content: [{ type: 'text', text: `Navigated to ${args.url}` }] };

      case 'browser_click':
        await page.click(args.selector);
        return { content: [{ type: 'text', text: `Clicked ${args.selector}` }] };

      case 'browser_screenshot':
        const screenshot = await page.screenshot({
          fullPage: args.fullPage || false,
          type: 'png'
        });
        return {
          content: [{
            type: 'image',
            data: screenshot.toString('base64'),
            mimeType: 'image/png'
          }]
        };

      case 'browser_get_text':
        const text = await page.textContent(args.selector);
        return { content: [{ type: 'text', text }] };

      case 'browser_type':
        await page.fill(args.selector, args.text);
        return { content: [{ type: 'text', text: `Typed into ${args.selector}` }] };

      case 'browser_evaluate':
        const result = await page.evaluate(args.code);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };

      case 'browser_wait_for_selector':
        await page.waitForSelector(args.selector, {
          timeout: args.timeout || 30000
        });
        return {
          content: [{
            type: 'text',
            text: `Element ${args.selector} appeared`
          }]
        };

      case 'browser_scroll':
        await page.evaluate(({ x, y }) => {
          window.scrollTo(x || 0, y || 0);
        }, args);
        return {
          content: [{
            type: 'text',
            text: `Scrolled to (${args.x || 0}, ${args.y || 0})`
          }]
        };

      case 'browser_resize_window':
        await page.setViewportSize({
          width: args.width,
          height: args.height
        });
        return {
          content: [{
            type: 'text',
            text: `Resized window to ${args.width}x${args.height}`
          }]
        };

      case 'browser_get_dom':
        const domContent = await page.evaluate((sel) => {
          const element = sel ? document.querySelector(sel) : document.documentElement;
          if (!element) return null;
          return {
            outerHTML: element.outerHTML,
            textContent: element.textContent,
            attributes: Array.from(element.attributes || []).map(attr => ({
              name: attr.name,
              value: attr.value
            })),
            children: element.children.length
          };
        }, args.selector);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(domContent, null, 2)
          }]
        };

      case 'browser_start_video_recording':
        const videoPath = args.path || `${os.tmpdir()}/browser-recording-${Date.now()}.webm`;
        await context.tracing.start({
          screenshots: true,
          snapshots: true
        });
        // Start video recording using Playwright's video feature
        if (!context._options.recordVideo) {
          // Note: Video recording needs to be set when creating context
          // For existing context, we'll use screenshots as fallback
          return {
            content: [{
              type: 'text',
              text: 'Started session tracing (screenshots). For full video, context needs recordVideo option at creation.'
            }]
          };
        }
        return {
          content: [{
            type: 'text',
            text: `Started video recording to ${videoPath}`
          }]
        };

      case 'browser_stop_video_recording':
        const tracePath = `${os.tmpdir()}/trace-${Date.now()}.zip`;
        await context.tracing.stop({ path: tracePath });
        return {
          content: [{
            type: 'text',
            text: `Stopped recording. Trace saved to ${tracePath}. Use 'playwright show-trace ${tracePath}' to view.`
          }]
        };

      case 'browser_health_check':
        // Connection already succeeded if we got here
        const url = await page.url();

        // Detect mode: connected to existing Chrome or launched our own
        const isConnected = browser.isConnected && browser.isConnected();
        const mode = isConnected ? 'Connected to existing Chrome (Antigravity)' : 'Launched standalone Chrome';

        // Determine profile path based on mode
        let browserProfile;
        if (isConnected) {
          browserProfile = `${process.env.HOME}/.gemini/antigravity-browser-profile`;
        } else {
          browserProfile = process.env.MCP_BROWSER_PROFILE || `${os.tmpdir()}/chrome-mcp-profile`;
        }

        return {
          content: [{
            type: 'text',
            text: `✅ Browser automation is fully functional!\n\n` +
                  `Mode: ${mode}\n` +
                  `✅ Playwright: ${playwrightPath || 'loaded'}\n` +
                  `✅ Chrome: Port 9222\n` +
                  `✅ Profile: ${browserProfile}\n` +
                  `✅ Current page: ${url}\n\n` +
                  `All 16 browser tools are ready to use!`
          }]
        };

      case 'browser_console_start':
        if (!consoleListening) {
          page.on('console', msg => {
            const logEntry = {
              type: msg.type(),
              text: msg.text(),
              timestamp: new Date().toISOString(),
              location: msg.location()
            };
            consoleLogs.push(logEntry);
            debugLog(`Console [${logEntry.type}]: ${logEntry.text}`);
          });
          consoleListening = true;
          debugLog('Console logging started');
        }
        return {
          content: [{
            type: 'text',
            text: `✅ Console logging started.\n\nCapturing: console.log, console.error, console.warn, console.info, console.debug\n\nUse browser_console_get to retrieve captured logs.`
          }]
        };

      case 'browser_console_get':
        const filter = args.filter;
        const filtered = filter && filter !== 'all'
          ? consoleLogs.filter(log => log.type === filter)
          : consoleLogs;

        if (filtered.length === 0) {
          return {
            content: [{
              type: 'text',
              text: consoleListening
                ? `No console logs captured yet.\n\n${filter && filter !== 'all' ? `Filter: ${filter}\n` : ''}Console logging is active - logs will appear as the page executes JavaScript.`
                : `Console logging is not active.\n\nUse browser_console_start to begin capturing logs.`
            }]
          };
        }

        const logSummary = `📋 Captured ${filtered.length} console log${filtered.length === 1 ? '' : 's'}${filter && filter !== 'all' ? ` (filtered by: ${filter})` : ''}:\n\n`;
        const formattedLogs = filtered.map((log, i) => {
          const icon = {
            'error': '❌',
            'warn': '⚠️',
            'log': '📝',
            'info': 'ℹ️',
            'debug': '🔍'
          }[log.type] || '📄';

          return `${i + 1}. ${icon} [${log.type.toUpperCase()}] ${log.timestamp}\n   ${log.text}${log.location.url ? `\n   Location: ${log.location.url}:${log.location.lineNumber}` : ''}`;
        }).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: logSummary + formattedLogs
          }]
        };

      case 'browser_console_clear':
        const count = consoleLogs.length;
        consoleLogs = [];
        if (consoleListening) {
          page.removeAllListeners('console');
          consoleListening = false;
        }
        debugLog(`Cleared ${count} console logs and stopped listening`);
        return {
          content: [{
            type: 'text',
            text: `✅ Cleared ${count} console log${count === 1 ? '' : 's'} and stopped listening.\n\nUse browser_console_start to resume capturing.`
          }]
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    debugLog(`Tool execution error (${name}): ${error.message}`);
    return {
      content: [{
        type: 'text',
        text: `❌ Error executing ${name}: ${error.message}`
      }],
      isError: true
    };
  }
}

// MCP Protocol handler
rl.on('line', async (line) => {
  let request;
  try {
    debugLog(`Received: ${line.substring(0, 200)}`);
    request = JSON.parse(line);

    if (request.method === 'initialize') {
      debugLog(`Initialize with protocol: ${request.params.protocolVersion}`);
      respond(request.id, {
        protocolVersion: request.params.protocolVersion || '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: 'browser-automation-playwright',
          version: '1.0.0'
        }
      });
    } else if (request.method === 'notifications/initialized') {
      // This is a notification - no response needed
      debugLog('Received initialized notification');
    } else if (request.method === 'tools/list') {
      debugLog('Sending tools list');
      respond(request.id, { tools });
    } else if (request.method === 'tools/call') {
      debugLog(`Calling tool: ${request.params.name}`);
      const result = await executeTool(request.params.name, request.params.arguments || {});
      respond(request.id, result);
    } else {
      debugLog(`Unknown method: ${request.method}`);
      respond(request.id, null, { code: -32601, message: 'Method not found' });
    }
  } catch (error) {
    debugLog(`Error processing request: ${error.message}`);
    console.error('Error processing request:', error.message, 'Request:', line);
    const id = request?.id || null;
    respond(id, null, { code: -32603, message: error.message });
  }
});

function respond(id, result, error = null) {
  const response = { jsonrpc: '2.0', id };
  if (error) response.error = error;
  else response.result = result;
  console.log(JSON.stringify(response));
}

// Cleanup on exit
process.on('SIGTERM', async () => {
  if (browser) await browser.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  if (browser) await browser.close();
  process.exit(0);
});
