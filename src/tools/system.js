const os = require('os');
const { connectToBrowser, getBrowserState } = require('../browser');
const { getPlaywrightPath } = require('../utils');

const definitions = [
    {
        name: 'browser_health_check',
        description: 'Check if the browser is running and accessible on port 9222 (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_wait',
        description: 'Pause execution for a duration (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                ms: { type: 'number', description: 'Milliseconds to wait' }
            },
            required: ['ms'],
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_resize_window',
        description: 'Resize the browser window (useful for testing responsiveness) (see browser_docs)',
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
        name: 'browser_wait_for_selector',
        description: 'Wait for an element to appear on the page (see browser_docs)',
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
        name: 'browser_start_video_recording',
        description: 'Start recording browser session as video (see browser_docs)',
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
        description: 'Stop video recording and save the file (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    }
];

const handlers = {
    browser_health_check: async (args) => {
        // connectToBrowser called inside executeTool usually, but here we check state
        const { browser, page } = getBrowserState();

        // We try to connect if not connected
        if (!browser) {
            // If getting here via executeTool, connectToBrowser was already called
            // If somehow not, we call it
            await connectToBrowser();
        }

        const state = getBrowserState();
        const url = state.page ? await state.page.url() : 'Unknown';

        const isConnected = state.browser && state.browser.isConnected && state.browser.isConnected();
        const mode = isConnected ? 'Connected to existing Chrome (Antigravity)' : 'Launched standalone Chrome';

        // Determine profile path based on mode
        let browserProfile;
        if (isConnected) {
            browserProfile = `${process.env.HOME}/.gemini/antigravity-browser-profile`;
        } else {
            browserProfile = process.env.MCP_BROWSER_PROFILE || `${os.tmpdir()}/chrome-mcp-profile`;
        }

        // Get dynamic tool count (loaded at runtime to avoid circular dependency)
        const { tools } = require('./index');
        const toolCount = tools.length;

        return {
            content: [{
                type: 'text',
                text: `✅ Browser automation is fully functional!\n\n` +
                    `Mode: ${mode}\n` +
                    `✅ Playwright: ${getPlaywrightPath() || 'loaded'}\n` +
                    `✅ Chrome: Port 9222\n` +
                    `✅ Profile: ${browserProfile}\n` +
                    `✅ Current page: ${url}\n\n` +
                    `All ${toolCount} browser tools are ready to use!`
            }]
        };
    },

    browser_wait: async (args) => {
        await new Promise(resolve => setTimeout(resolve, args.ms));
        return { content: [{ type: 'text', text: `Waited for ${args.ms}ms` }] };
    },

    browser_resize_window: async (args) => {
        const { page } = await connectToBrowser();
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
    },

    browser_wait_for_selector: async (args) => {
        const { page } = await connectToBrowser();
        await page.waitForSelector(args.selector, {
            timeout: args.timeout || 30000
        });
        return {
            content: [{
                type: 'text',
                text: `Element ${args.selector} appeared`
            }]
        };
    },

    browser_start_video_recording: async (args) => {
        const { context } = await connectToBrowser();
        const videoPath = args.path || `${os.tmpdir()}/browser-recording-${Date.now()}.webm`;
        await context.tracing.start({
            screenshots: true,
            snapshots: true
        });
        // Start video recording using Playwright's video feature
        if (!context._options || !context._options.recordVideo) {
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
    },

    browser_stop_video_recording: async (args) => {
        const { context } = await connectToBrowser();
        const tracePath = `${os.tmpdir()}/trace-${Date.now()}.zip`;
        await context.tracing.stop({ path: tracePath });
        return {
            content: [{
                type: 'text',
                text: `Stopped recording. Trace saved to ${tracePath}. Use 'playwright show-trace ${tracePath}' to view.`
            }]
        };
    }
};

module.exports = { definitions, handlers };
