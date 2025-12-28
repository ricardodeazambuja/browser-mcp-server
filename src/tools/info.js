const { connectToBrowser } = require('../browser');

const definitions = [
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
        name: 'browser_read_page',
        description: 'Read the content and metadata of the current page',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    }
];

const handlers = {
    browser_screenshot: async (args) => {
        const { page } = await connectToBrowser();
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
    },

    browser_get_text: async (args) => {
        const { page } = await connectToBrowser();
        const text = await page.textContent(args.selector);
        return { content: [{ type: 'text', text }] };
    },

    browser_evaluate: async (args) => {
        const { page } = await connectToBrowser();
        const result = await page.evaluate(args.code);
        return {
            content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
            }]
        };
    },

    browser_get_dom: async (args) => {
        const { page } = await connectToBrowser();
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
    },

    browser_read_page: async (args) => {
        const { page } = await connectToBrowser();
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
    }
};

module.exports = { definitions, handlers };
