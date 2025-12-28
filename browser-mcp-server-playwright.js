#!/usr/bin/env node

/**
 * Universal Browser Automation MCP Server (Playwright Edition)
 *
 * A Model Context Protocol server providing 36 browser automation tools
 * for AI agents. Works with Antigravity, Claude Desktop, and any MCP client.
 *
 * KEY FEATURES:
 * - Smart Chrome Detection: Automatically finds and uses system Chrome/Chromium
 * - Three-Tier Strategy: Antigravity Chrome > System Chrome > Playwright Chromium
 * - 36 Tools: Multi-tab, media control, mouse/keyboard, screenshots, and more
 * - Isolated Profile: Uses /tmp/chrome-mcp-profile (won't touch personal Chrome)
 * - Auto-Reconnect: Handles browser crashes and disconnections gracefully
 *
 * MODES:
 * 1. Antigravity Mode: Connects to existing Chrome on port 9222
 *    - Detects: Chrome with --remote-debugging-port=9222
 *    - Profile: ~/.gemini/antigravity-browser-profile
 *
 * 2. Standalone Mode: Launches own Chrome instance
 *    - Searches: /usr/bin/google-chrome, /usr/bin/chromium, etc.
 *    - Falls back to: Playwright's Chromium (if installed)
 *    - Profile: /tmp/chrome-mcp-profile (configurable via MCP_BROWSER_PROFILE)
 *
 * @version 1.2.0
 * @author Ricardo de Azambuja
 * @license MIT
 */

const fs = require('fs');
const os = require('os');
const readline = require('readline');

// Import utilities
const { debugLog, loadPlaywright, getPlaywrightPath, findChromeExecutable } = require('./src/utils');

// Import browser module
const { connectToBrowser, getBrowserState, setActivePageIndex } = require('./src/browser');

debugLog('Server starting...');
debugLog(`HOME: ${process.env.HOME}`);
debugLog(`CWD: ${process.cwd()}`);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Console log capture
let consoleLogs = [];
let consoleListening = false;


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
  },
  {
    name: 'browser_get_media_summary',
    description: 'Get a summary of all audio and video elements on the page',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_get_audio_analysis',
    description: 'Analyze audio output for a duration to detect sound vs silence and frequencies',
    inputSchema: {
      type: 'object',
      properties: {
        durationMs: { type: 'number', description: 'Duration to analyze in ms', default: 2000 },
        selector: { type: 'string', description: 'Optional selector to specific media element' }
      },
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_control_media',
    description: 'Control a media element (play, pause, seek, mute)',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Selector for the audio/video element' },
        action: { type: 'string', enum: ['play', 'pause', 'mute', 'unmute', 'seek'] },
        value: { type: 'number', description: 'Value for seek action (time in seconds)' }
      },
      required: ['selector', 'action'],
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  // Multi-page management tools
  {
    name: 'browser_list_pages',
    description: 'List all open browser pages (tabs)',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_new_page',
    description: 'Open a new browser page (tab)',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Optional URL to navigate to' }
      },
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_switch_page',
    description: 'Switch to a different browser page (tab)',
    inputSchema: {
      type: 'object',
      properties: {
        index: { type: 'number', description: 'The index of the page to switch to' }
      },
      required: ['index'],
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_close_page',
    description: 'Close a browser page (tab)',
    inputSchema: {
      type: 'object',
      properties: {
        index: { type: 'number', description: 'The index of the page to close. If not provided, closes current page.' }
      },
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_read_page',
    description: 'Read the content and metadata of the current page',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_press_key',
    description: 'Send a keyboard event (press a key)',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'The key to press (e.g., "Enter", "Escape", "Control+A")' }
      },
      required: ['key'],
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_mouse_move',
    description: 'Move the mouse to specific coordinates',
    inputSchema: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X coordinate' },
        y: { type: 'number', description: 'Y coordinate' }
      },
      required: ['x', 'y'],
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_mouse_click',
    description: 'Click the mouse at specific coordinates or on current position',
    inputSchema: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'Optional X coordinate' },
        y: { type: 'number', description: 'Optional Y coordinate' },
        button: { type: 'string', description: 'left, right, or middle', default: 'left' },
        clickCount: { type: 'number', description: '1 for single click, 2 for double click', default: 1 }
      },
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_mouse_drag',
    description: 'Drag from one position to another',
    inputSchema: {
      type: 'object',
      properties: {
        fromX: { type: 'number', description: 'Starting X coordinate' },
        fromY: { type: 'number', description: 'Starting Y coordinate' },
        toX: { type: 'number', description: 'Ending X coordinate' },
        toY: { type: 'number', description: 'Ending Y coordinate' }
      },
      required: ['fromX', 'fromY', 'toX', 'toY'],
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_mouse_wheel',
    description: 'Scroll the mouse wheel',
    inputSchema: {
      type: 'object',
      properties: {
        deltaX: { type: 'number', description: 'Horizontal scroll amount' },
        deltaY: { type: 'number', description: 'Vertical scroll amount' }
      },
      required: ['deltaX', 'deltaY'],
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_hover',
    description: 'Hover over an element',
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
    name: 'browser_focus',
    description: 'Focus an element',
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
    name: 'browser_select',
    description: 'Select options in a dropdown',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Playwright selector for the select element' },
        values: { type: 'array', items: { type: 'string' }, description: 'Values to select' }
      },
      required: ['selector', 'values'],
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_reload',
    description: 'Reload the current page',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_go_back',
    description: 'Navigate back in history',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_go_forward',
    description: 'Navigate forward in history',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
      $schema: 'http://json-schema.org/draft-07/schema#'
    }
  },
  {
    name: 'browser_wait',
    description: 'Pause execution for a duration',
    inputSchema: {
      type: 'object',
      properties: {
        ms: { type: 'number', description: 'Milliseconds to wait' }
      },
      required: ['ms'],
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
        const { browser } = getBrowserState();
        const isConnected = browser && browser.isConnected && browser.isConnected();
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
              `✅ Playwright: ${getPlaywrightPath() || 'loaded'}\n` +
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

      // Media awareness tools
      case 'browser_get_media_summary':
        const mediaState = await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('audio, video'));
          return elements.map((el, index) => {
            // Calculate buffered ranges
            const buffered = [];
            for (let i = 0; i < el.buffered.length; i++) {
              buffered.push([el.buffered.start(i), el.buffered.end(i)]);
            }

            return {
              index,
              tagName: el.tagName.toLowerCase(),
              id: el.id || null,
              src: el.currentSrc || el.src,
              state: {
                paused: el.paused,
                muted: el.muted,
                ended: el.ended,
                loop: el.loop,
                playbackRate: el.playbackRate,
                volume: el.volume
              },
              timing: {
                currentTime: el.currentTime,
                duration: el.duration
              },
              buffer: {
                readyState: el.readyState,
                buffered
              },
              videoSpecs: el.tagName === 'VIDEO' ? {
                videoWidth: el.videoWidth,
                videoHeight: el.videoHeight
              } : undefined
            };
          });
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(mediaState, null, 2)
          }]
        };

      case 'browser_get_audio_analysis':
        const duration = args.durationMs || 2000;
        const selector = args.selector;

        const analysis = await page.evaluate(async ({ duration, selector }) => {
          return new Promise(async (resolve) => {
            try {
              // 1. Find element
              let element;
              if (selector) {
                element = document.querySelector(selector);
              } else {
                // Pick the first one playing or just the first one
                const all = Array.from(document.querySelectorAll('audio, video'));
                element = all.find(e => !e.paused) || all[0];
              }

              if (!element) return resolve({ error: 'No media element found' });

              // 2. Setup AudioContext (handle browser policies)
              const CtxClass = window.AudioContext || window.webkitAudioContext;
              if (!CtxClass) return resolve({ error: 'Web Audio API not supported' });

              const ctx = new CtxClass();

              // Resume context if suspended (common in browsers)
              if (ctx.state === 'suspended') await ctx.resume();

              // 3. Create Source & Analyzer
              // Note: MediaElementSource requires the element to allow CORS if cross-origin
              let source;
              try {
                source = ctx.createMediaElementSource(element);
              } catch (e) {
                // If already connected or tainted, this might fail. 
                // We can try to reconnect or just capture current data if available.
                return resolve({ error: `Cannot connect to media source: ${e.message}. (Check CORS headers)` });
              }

              const analyzer = ctx.createAnalyser();
              analyzer.fftSize = 256;
              const bufferLength = analyzer.frequencyBinCount;
              const dataArray = new Uint8Array(bufferLength);

              source.connect(analyzer);
              analyzer.connect(ctx.destination);

              // 4. Collect samples over duration
              const samples = [];
              const startTime = Date.now();
              const interval = setInterval(() => {
                analyzer.getByteFrequencyData(dataArray);

                // Calculate instant stats
                let sum = 0;
                let max = 0;
                for (let i = 0; i < bufferLength; i++) {
                  const val = dataArray[i];
                  sum += val;
                  if (val > max) max = val;
                }
                const avg = sum / bufferLength;

                samples.push({ avg, max, data: Array.from(dataArray) });

                if (Date.now() - startTime >= duration) {
                  clearInterval(interval);
                  finalize();
                }
              }, 100); // 10 samples per second

              function finalize() {
                // Clean up
                try {
                  source.disconnect();
                  analyzer.disconnect();
                  ctx.close();
                } catch (e) { }

                // Aggregate
                if (samples.length === 0) return resolve({ status: 'No samples' });

                const totalAvg = samples.reduce((a, b) => a + b.avg, 0) / samples.length;
                const grandMax = Math.max(...samples.map(s => s.max));
                const isSilent = grandMax < 5; // Low threshold

                // Bucket frequencies (Simple approximation)
                // 128 bins over Nyquist (e.g. 24kHz). 
                // Bass (0-4), Mid (5-40), Treble (41-127) roughly
                const bassSum = samples.reduce((acc, s) => {
                  return acc + s.data.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
                }, 0) / samples.length;

                const midSum = samples.reduce((acc, s) => {
                  return acc + s.data.slice(5, 40).reduce((a, b) => a + b, 0) / 35;
                }, 0) / samples.length;

                const trebleSum = samples.reduce((acc, s) => {
                  return acc + s.data.slice(40).reduce((a, b) => a + b, 0) / 88;
                }, 0) / samples.length;

                const activeFrequencies = [];
                if (bassSum > 20) activeFrequencies.push('bass');
                if (midSum > 20) activeFrequencies.push('mid');
                if (trebleSum > 20) activeFrequencies.push('treble');

                resolve({
                  element: { tagName: element.tagName, id: element.id, src: element.currentSrc },
                  isSilent,
                  averageVolume: Math.round(totalAvg),
                  peakVolume: grandMax,
                  activeFrequencies
                });
              }

            } catch (e) {
              resolve({ error: e.message });
            }
          });
        }, { duration, selector });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(analysis, null, 2)
          }]
        };

      case 'browser_control_media':
        const controlResult = await page.evaluate(async ({ selector, action, value }) => {
          const el = document.querySelector(selector);
          if (!el) return { error: `Element not found: ${selector}` };
          if (!(el instanceof HTMLMediaElement)) return { error: 'Element is not audio/video' };

          try {
            switch (action) {
              case 'play':
                await el.play();
                return { status: 'playing' };
              case 'pause':
                el.pause();
                return { status: 'paused' };
              case 'mute':
                el.muted = true;
                return { status: 'muted' };
              case 'unmute':
                el.muted = false;
                return { status: 'unmuted' };
              case 'seek':
                if (typeof value !== 'number') return { error: 'Seek value required' };
                el.currentTime = value;
                return { status: 'seeked', newTime: el.currentTime };
              default:
                return { error: `Unknown media action: ${action}` };
            }
          } catch (e) {
            return { error: e.message };
          }
        }, args);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(controlResult, null, 2)
          }]
        };


      // --- NEW TOOL HANDLERS ---
      case 'browser_list_pages':
        const pages = context.pages();
        const pageList = pages.map((p, i) => ({
          index: i,
          title: 'Unknown', // Will update below
          url: p.url(),
          isActive: i === activePageIndex
        }));

        // Try to get titles (async)
        await Promise.all(pages.map(async (p, i) => {
          try {
            pageList[i].title = await p.title();
          } catch (e) { }
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(pageList, null, 2)
          }]
        };

      case 'browser_new_page':
        const newPage = await context.newPage();
        activePageIndex = context.pages().length - 1;
        if (args.url) {
          await newPage.goto(args.url, { waitUntil: 'domcontentloaded' });
        }
        return {
          content: [{
            type: 'text',
            text: `Opened new page at index ${activePageIndex}${args.url ? ` and navigated to ${args.url}` : ''}`
          }]
        };

      case 'browser_switch_page':
        const allPages = context.pages();
        if (args.index < 0 || args.index >= allPages.length) {
          throw new Error(`Invalid page index: ${args.index}. Total pages: ${allPages.length}`);
        }
        activePageIndex = args.index;
        return {
          content: [{
            type: 'text',
            text: `Switched to page index ${activePageIndex}`
          }]
        };

      case 'browser_close_page':
        const targetPages = context.pages();
        const closeIdx = args.index !== undefined ? args.index : activePageIndex;

        if (closeIdx < 0 || closeIdx >= targetPages.length) {
          throw new Error(`Invalid page index: ${closeIdx}`);
        }

        await targetPages[closeIdx].close();

        // Adjust active index if needed
        if (activePageIndex >= context.pages().length) {
          activePageIndex = Math.max(0, context.pages().length - 1);
        }

        return {
          content: [{
            type: 'text',
            text: `Closed page ${closeIdx}. Active page is now ${activePageIndex}.`
          }]
        };

      case 'browser_read_page':
        const metadata = {
          title: await page.title(),
          url: page.url(),
          viewport: page.viewportSize(),
          contentLength: (await page.content()).length
        };
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(metadata, null, 2)
          }]
        };

      case 'browser_press_key':
        await page.keyboard.press(args.key);
        return { content: [{ type: 'text', text: `Pressed key: ${args.key}` }] };

      case 'browser_mouse_move':
        await page.mouse.move(args.x, args.y);
        return { content: [{ type: 'text', text: `Moved mouse to ${args.x}, ${args.y}` }] };

      case 'browser_mouse_click':
        if (args.x !== undefined && args.y !== undefined) {
          await page.mouse.click(args.x, args.y, {
            button: args.button || 'left',
            clickCount: args.clickCount || 1
          });
          return { content: [{ type: 'text', text: `Clicked at ${args.x}, ${args.y}` }] };
        } else {
          // Click at current position
          // Note: page.mouse.click() without coords clicks at current position
          await page.mouse.click(undefined, undefined, {
            button: args.button || 'left',
            clickCount: args.clickCount || 1
          });
          return { content: [{ type: 'text', text: `Clicked at current mouse position` }] };
        }

      case 'browser_mouse_drag':
        await page.mouse.move(args.fromX, args.fromY);
        await page.mouse.down();
        await page.mouse.move(args.toX, args.toY);
        await page.mouse.up();
        return { content: [{ type: 'text', text: `Dragged from ${args.fromX},${args.fromY} to ${args.toX},${args.toY}` }] };

      case 'browser_mouse_wheel':
        await page.mouse.wheel(args.deltaX, args.deltaY);
        return { content: [{ type: 'text', text: `Scrolled wheel by ${args.deltaX}, ${args.deltaY}` }] };

      case 'browser_hover':
        await page.hover(args.selector);
        return { content: [{ type: 'text', text: `Hovered over ${args.selector}` }] };

      case 'browser_focus':
        await page.focus(args.selector);
        return { content: [{ type: 'text', text: `Focused ${args.selector}` }] };

      case 'browser_select':
        await page.selectOption(args.selector, args.values);
        return { content: [{ type: 'text', text: `Selected values in ${args.selector}` }] };

      case 'browser_reload':
        await page.reload({ waitUntil: 'domcontentloaded' });
        return { content: [{ type: 'text', text: `Reloaded page` }] };

      case 'browser_go_back':
        await page.goBack({ waitUntil: 'domcontentloaded' });
        return { content: [{ type: 'text', text: `Navigated back` }] };

      case 'browser_go_forward':
        await page.goForward({ waitUntil: 'domcontentloaded' });
        return { content: [{ type: 'text', text: `Navigated forward` }] };

      case 'browser_wait':
        await new Promise(resolve => setTimeout(resolve, args.ms));
        return { content: [{ type: 'text', text: `Waited for ${args.ms}ms` }] };

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
          version: '1.2.0'
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
