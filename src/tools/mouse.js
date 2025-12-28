const { connectToBrowser } = require('../browser');

const definitions = [
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
    }
];

const handlers = {
    browser_mouse_move: async (args) => {
        const { page } = await connectToBrowser();
        await page.mouse.move(args.x, args.y);
        return { content: [{ type: 'text', text: `Moved mouse to ${args.x}, ${args.y}` }] };
    },
    browser_mouse_click: async (args) => {
        const { page } = await connectToBrowser();
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
    },
    browser_mouse_drag: async (args) => {
        const { page } = await connectToBrowser();
        await page.mouse.move(args.fromX, args.fromY);
        await page.mouse.down();
        await page.mouse.move(args.toX, args.toY);
        await page.mouse.up();
        return { content: [{ type: 'text', text: `Dragged from ${args.fromX},${args.fromY} to ${args.toX},${args.toY}` }] };
    },
    browser_mouse_wheel: async (args) => {
        const { page } = await connectToBrowser();
        await page.mouse.wheel(args.deltaX, args.deltaY);
        return { content: [{ type: 'text', text: `Scrolled wheel by ${args.deltaX}, ${args.deltaY}` }] };
    }
};

module.exports = { definitions, handlers };
