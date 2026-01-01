const { withPage } = require('../browser');

const coreDefinitions = [
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
    }
];

const coreHandlers = {
    browser_navigate: withPage(async (page, args) => {
        await page.goto(args.url, { waitUntil: 'domcontentloaded' });
        return { content: [{ type: 'text', text: `Navigated to ${args.url}` }] };
    })
};

const optionalDefinitions = [
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

const optionalHandlers = {
    browser_reload: withPage(async (page) => {
        await page.reload({ waitUntil: 'domcontentloaded' });
        return { content: [{ type: 'text', text: 'Reloaded page' }] };
    }),
    browser_go_back: withPage(async (page) => {
        await page.goBack({ waitUntil: 'domcontentloaded' });
        return { content: [{ type: 'text', text: 'Navigated back' }] };
    }),
    browser_go_forward: withPage(async (page) => {
        await page.goForward({ waitUntil: 'domcontentloaded' });
        return { content: [{ type: 'text', text: 'Navigated forward' }] };
    })
};

module.exports = {
    definitions: [...coreDefinitions, ...optionalDefinitions],
    handlers: { ...coreHandlers, ...optionalHandlers },
    coreDefinitions,
    coreHandlers,
    optionalDefinitions,
    optionalHandlers
};
