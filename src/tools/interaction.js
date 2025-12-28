const { connectToBrowser } = require('../browser');

const definitions = [
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
    }
];

const handlers = {
    browser_click: async (args) => {
        const { page } = await connectToBrowser();
        await page.click(args.selector);
        return { content: [{ type: 'text', text: `Clicked ${args.selector}` }] };
    },
    browser_type: async (args) => {
        const { page } = await connectToBrowser();
        await page.fill(args.selector, args.text);
        return { content: [{ type: 'text', text: `Typed into ${args.selector}` }] };
    },
    browser_hover: async (args) => {
        const { page } = await connectToBrowser();
        await page.hover(args.selector);
        return { content: [{ type: 'text', text: `Hovered over ${args.selector}` }] };
    },
    browser_focus: async (args) => {
        const { page } = await connectToBrowser();
        await page.focus(args.selector);
        return { content: [{ type: 'text', text: `Focused ${args.selector}` }] };
    },
    browser_select: async (args) => {
        const { page } = await connectToBrowser();
        await page.selectOption(args.selector, args.values);
        return { content: [{ type: 'text', text: `Selected values in ${args.selector}` }] };
    },
    browser_scroll: async (args) => {
        const { page } = await connectToBrowser();
        await page.evaluate(({ x, y }) => {
            window.scrollTo(x || 0, y || 0);
        }, args);
        return {
            content: [{
                type: 'text',
                text: `Scrolled to (${args.x || 0}, ${args.y || 0})`
            }]
        };
    }
};

module.exports = { definitions, handlers };
