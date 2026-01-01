const { connectToBrowser, setActivePageIndex, getBrowserState, withPage } = require('../browser');

const definitions = [
    {
        name: 'browser_list_pages',
        description: 'List all open browser pages (tabs) (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_new_page',
        description: 'Open a new browser page (tab) (see browser_docs)',
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
        description: 'Switch to a different browser page (tab) (see browser_docs)',
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
        description: 'Close a browser page (tab) (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                index: { type: 'number', description: 'The index of the page to close. If not provided, closes current page.' }
            },
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    }
];

const handlers = {
    browser_list_pages: async () => {
        const { context } = await connectToBrowser();
        const pages = context.pages();
        const state = getBrowserState();

        const pageList = pages.map((p, i) => ({
            index: i,
            title: 'Unknown',
            url: p.url(),
            isActive: i === state.activePageIndex
        }));

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
    },

    browser_new_page: async (args) => {
        const { context } = await connectToBrowser();
        const newPage = await context.newPage();
        const pages = context.pages();
        const newIndex = pages.length - 1;
        setActivePageIndex(newIndex);

        if (args.url) {
            await newPage.goto(args.url, { waitUntil: 'domcontentloaded' });
        }
        return {
            content: [{
                type: 'text',
                text: `Opened new page at index ${newIndex}${args.url ? ` and navigated to ${args.url}` : ''}`
            }]
        };
    },

    browser_switch_page: async (args) => {
        const { context } = await connectToBrowser();
        const allPages = context.pages();
        if (args.index < 0 || args.index >= allPages.length) {
            throw new Error(`Invalid page index: ${args.index}. Total pages: ${allPages.length}`);
        }
        setActivePageIndex(args.index);

        try {
            await allPages[args.index].bringToFront();
        } catch (e) { }

        return {
            content: [{
                type: 'text',
                text: `Switched to page index ${args.index}`
            }]
        };
    },

    browser_close_page: async (args) => {
        const { context, activePageIndex } = await connectToBrowser();
        const targetPages = context.pages();
        const closeIdx = args.index !== undefined ? args.index : activePageIndex;

        if (closeIdx < 0 || closeIdx >= targetPages.length) {
            throw new Error(`Invalid page index: ${closeIdx}`);
        }

        await targetPages[closeIdx].close();

        if (activePageIndex >= context.pages().length) {
            setActivePageIndex(Math.max(0, context.pages().length - 1));
        }

        return {
            content: [{
                type: 'text',
                text: `Closed page ${closeIdx}. Active page is now ${getBrowserState().activePageIndex}.`
            }]
        };
    }
};

module.exports = { definitions, handlers };