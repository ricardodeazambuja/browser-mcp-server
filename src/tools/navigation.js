const { connectToBrowser } = require('../browser');

const definitions = [
    {
        name: 'browser_navigate',
        description: 'Navigate to a URL in the browser (see browser_docs)',
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
        name: 'browser_reload',
        description: 'Reload the current page (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_go_back',
        description: 'Navigate back in history (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_go_forward',
        description: 'Navigate forward in history (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    }
];

const handlers = {
    browser_navigate: async (args) => {
        const { page } = await connectToBrowser();
        await page.goto(args.url, { waitUntil: 'domcontentloaded' });
        return { content: [{ type: 'text', text: `Navigated to ${args.url}` }] };
    },
    browser_reload: async (args) => {
        const { page } = await connectToBrowser();
        await page.reload({ waitUntil: 'domcontentloaded' });
        return { content: [{ type: 'text', text: `Reloaded page` }] };
    },
    browser_go_back: async (args) => {
        const { page } = await connectToBrowser();
        await page.goBack({ waitUntil: 'domcontentloaded' });
        return { content: [{ type: 'text', text: `Navigated back` }] };
    },
    browser_go_forward: async (args) => {
        const { page } = await connectToBrowser();
        await page.goForward({ waitUntil: 'domcontentloaded' });
        return { content: [{ type: 'text', text: `Navigated forward` }] };
    }
};

module.exports = { definitions, handlers };
