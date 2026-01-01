const { connectToBrowser } = require('../browser');

const coreDefinitions = [
    {
        name: 'browser_action',
        description: 'Perform interaction actions (click, type, hover, scroll, focus) (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                action: { 
                    type: 'string', 
                    enum: ['click', 'type', 'hover', 'scroll', 'focus'],
                    description: 'The action to perform'
                },
                selector: { type: 'string', description: 'Selector for the element (required for most actions)' },
                text: { type: 'string', description: 'Text to type (required for type action)' },
                x: { type: 'number', description: 'Horizontal scroll position (for scroll action)' },
                y: { type: 'number', description: 'Vertical scroll position (for scroll action)' }
            },
            required: ['action'],
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    }
];

const coreHandlers = {
    browser_action: async (args) => {
        const { page } = await connectToBrowser();
        const { action, selector, text, x, y } = args;

        switch (action) {
            case 'click':
                if (!selector) throw new Error('Selector is required for click action');
                await page.click(selector);
                return { content: [{ type: 'text', text: `Clicked ${selector}` }] };
            case 'type':
                if (!selector) throw new Error('Selector is required for type action');
                if (text === undefined) throw new Error('Text is required for type action');
                await page.fill(selector, text);
                return { content: [{ type: 'text', text: `Typed into ${selector}` }] };
            case 'hover':
                if (!selector) throw new Error('Selector is required for hover action');
                await page.hover(selector);
                return { content: [{ type: 'text', text: `Hovered over ${selector}` }] };
            case 'focus':
                if (!selector) throw new Error('Selector is required for focus action');
                await page.focus(selector);
                return { content: [{ type: 'text', text: `Focused ${selector}` }] };
            case 'scroll':
                await page.evaluate(({ x, y }) => {
                    window.scrollTo(x || 0, y || 0);
                }, { x, y });
                return { content: [{ type: 'text', text: `Scrolled to (${x || 0}, ${y || 0})` }] };
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }
};

const optionalDefinitions = [
    {
        name: 'browser_click',
        description: 'DEPRECATED: Use browser_action instead. Click an element (see browser_docs)',
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
        description: 'DEPRECATED: Use browser_action instead. Type text into an input field (see browser_docs)',
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
        description: 'DEPRECATED: Use browser_action instead. Hover over an element (see browser_docs)',
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
        description: 'DEPRECATED: Use browser_action instead. Focus an element (see browser_docs)',
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
        description: 'Select options in a dropdown (see browser_docs)',
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
        description: 'DEPRECATED: Use browser_action instead. Scroll the page (see browser_docs)',
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

const optionalHandlers = {
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

module.exports = {
    definitions: [...coreDefinitions, ...optionalDefinitions],
    handlers: { ...coreHandlers, ...optionalHandlers },
    coreDefinitions,
    coreHandlers,
    optionalDefinitions,
    optionalHandlers
};