const os = require('os');
const { connectToBrowser, getBrowserState, withPage } = require('../browser');
const { getPlaywrightPath } = require('../utils');

const definitions = [
    {
        name: 'browser_health_check',
        description: 'Check browser accessibility on port 9222 (see browser_docs)',
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
        description: 'Resize browser window (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                width: { type: 'number', description: 'Width in pixels' },
                height: { type: 'number', description: 'Height in pixels' }
            },
            required: ['width', 'height'],
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_wait_for_selector',
        description: 'Wait for an element to appear (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                selector: { type: 'string', description: 'Selector to wait for' },
                timeout: { type: 'number', description: 'Timeout in ms', default: 30000 }
            },
            required: ['selector'],
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_start_video_recording',
        description: 'Start recording session trace (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Optional save path' }
            },
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_stop_video_recording',
        description: 'Stop recording and save trace (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    }
];

const handlers = {
    browser_health_check: async () => {
        const { browser } = await connectToBrowser();
        const state = getBrowserState();
        const url = state.page ? await state.page.url() : 'Unknown';
        const isConnected = browser && browser.isConnected && browser.isConnected();
        const mode = isConnected ? 'Antigravity Mode' : 'Standalone Mode';
        
        const { tools } = require('./index');
        return {
            content: [{
                type: 'text',
                text: `✅ Browser automation functional (${mode})\n✅ Port: 9222\n✅ Page: ${url}\n✅ Tools: ${tools.length} available`
            }]
        };
    },

    browser_wait: async (args) => {
        await new Promise(resolve => setTimeout(resolve, args.ms));
        return { content: [{ type: 'text', text: `Waited for ${args.ms}ms` }] };
    },

    browser_resize_window: withPage(async (page, args) => {
        await page.setViewportSize({ width: args.width, height: args.height });
        return { content: [{ type: 'text', text: `Resized to ${args.width}x${args.height}` }] };
    }),

    browser_wait_for_selector: withPage(async (page, args) => {
        await page.waitForSelector(args.selector, { timeout: args.timeout || 30000 });
        return { content: [{ type: 'text', text: `Element ${args.selector} appeared` }] };
    }),

    browser_start_video_recording: async () => {
        const { context } = await connectToBrowser();
        await context.tracing.start({ screenshots: true, snapshots: true });
        return { content: [{ type: 'text', text: 'Started session tracing (screenshots).' }] };
    },

    browser_stop_video_recording: async () => {
        const { context } = await connectToBrowser();
        const tracePath = `${os.tmpdir()}/trace-${Date.now()}.zip`;
        await context.tracing.stop({ path: tracePath });
        return { content: [{ type: 'text', text: `Trace saved to ${tracePath}` }] };
    }
};

module.exports = { definitions, handlers };