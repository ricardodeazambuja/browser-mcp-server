const { withPage } = require('../browser');

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
    browser_action: withPage(async (page, args) => {
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
    })
};

const optionalDefinitions = [
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
    }
];

const optionalHandlers = {
    browser_select: withPage(async (page, args) => {
        await page.selectOption(args.selector, args.values);
        return { content: [{ type: 'text', text: `Selected values in ${args.selector}` }] };
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
