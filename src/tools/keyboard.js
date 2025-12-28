const { connectToBrowser } = require('../browser');

const definitions = [
    {
        name: 'browser_press_key',
        description: 'Send a keyboard event (press a key)',
        inputSchema: {
            type: 'object',
            properties: {
                key: { type: 'string', description: 'The key to press (e.g., "Enter", "Escape", "Control+A")' }
            },
            required: ['key'],
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    }
];

const handlers = {
    browser_press_key: async (args) => {
        const { page } = await connectToBrowser();
        await page.keyboard.press(args.key);
        return { content: [{ type: 'text', text: `Pressed key: ${args.key}` }] };
    }
};

module.exports = { definitions, handlers };
