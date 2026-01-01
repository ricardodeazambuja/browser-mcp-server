const fs = require('fs');
const path = require('path');
const { MODULE_MAPPING, MODULE_DESCRIPTIONS } = require('../utils');

let tools = [];
const handlers = {};
const activeModules = new Set();
let notifyCallback = null;

function setNotificationCallback(callback) {
    notifyCallback = callback;
}

function updateRegistry() {
    tools.length = 0;
    for (const key in handlers) delete handlers[key];

    const coreModules = [
        { name: 'navigation', file: 'navigation.js' },
        { name: 'interaction', file: 'interaction.js' },
        { name: 'info', file: 'info.js' },
        { name: 'docs', file: 'docs.js' }
    ];

    coreModules.forEach(m => {
        const mod = require(`./${m.file}`);
        if (mod.coreDefinitions) tools.push(...mod.coreDefinitions);
        if (mod.coreHandlers) Object.assign(handlers, mod.coreHandlers);
    });

    tools.push({
        name: 'browser_manage_modules',
        description: 'List, load, or unload power-user modules (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                action: { 
                    type: 'string', 
                    enum: ['list', 'load', 'unload'],
                    description: 'The action to perform'
                },
                module: { 
                    type: 'string', 
                    enum: Object.keys(MODULE_MAPPING),
                    description: 'The module name (required for load/unload)'
                }
            },
            required: ['action'],
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    });

    handlers.browser_manage_modules = async (args) => {
        const { action, module: moduleName } = args;

        if (action === 'list') {
            const list = Object.keys(MODULE_MAPPING).map(m => {
                const status = activeModules.has(m) ? '✅ Loaded' : '💤 Unloaded';
                return `• ${m}: ${MODULE_DESCRIPTIONS[m]} [${status}]`;
            }).join('\n');
            return {
                content: [{
                    type: 'text',
                    text: `📦 Browser MCP Modules:\n\n${list}\n\nUse {action: 'load', module: '...'} to enable extra tools.`
                }]
            };
        }

        if (!moduleName) throw new Error('Module name is required');
        if (!MODULE_MAPPING[moduleName]) throw new Error(`Unknown module: ${moduleName}`);

        if (action === 'load') {
            if (activeModules.has(moduleName)) return { content: [{ type: 'text', text: `ℹ️ Module '${moduleName}' already loaded.` }] };
            activeModules.add(moduleName);
            updateRegistry();
            if (notifyCallback) notifyCallback();
            return { content: [{ type: 'text', text: `✅ Module '${moduleName}' loaded.` }] };
        }

        if (action === 'unload') {
            if (!activeModules.has(moduleName)) return { content: [{ type: 'text', text: `ℹ️ Module '${moduleName}' not loaded.` }] };
            activeModules.delete(moduleName);
            updateRegistry();
            if (notifyCallback) notifyCallback();
            return { content: [{ type: 'text', text: `✅ Module '${moduleName}' unloaded.` }] };
        }
    };

    // 3. Load Active Optional Modules
    activeModules.forEach(moduleName => {
        const fileNames = MODULE_MAPPING[moduleName];
        fileNames.forEach(f => {
            // Handle core-optional parts
            if (f.endsWith('_opt')) {
                const baseFile = f.replace('_opt', '.js');
                const mod = require(`./${baseFile}`);
                if (mod.optionalDefinitions) tools.push(...mod.optionalDefinitions);
                if (mod.optionalHandlers) Object.assign(handlers, mod.optionalHandlers);
                return;
            }

            // Handle standalone modules
            try {
                const mod = require(`./${f}.js`);
                if (mod.definitions) tools.push(...mod.definitions);
                if (mod.handlers) Object.assign(handlers, mod.handlers);
            } catch (err) {
                console.error(`Failed to load module file: ${f}`, err);
            }
        });
    });

    // 4. Auto-load plugins from ../../plugins/ if they exist
    const pluginsDir = path.join(__dirname, '..', '..', 'plugins');
    if (fs.existsSync(pluginsDir)) {
        fs.readdirSync(pluginsDir)
            .filter(f => f.endsWith('.js'))
            .forEach(f => {
                try {
                    const mod = require(path.join(pluginsDir, f));
                    if (mod.definitions) tools.push(...mod.definitions);
                    if (mod.handlers) Object.assign(handlers, mod.handlers);
                } catch (error) {
                    console.error(`Failed to load plugin: ${f}`, error);
                }
            });
    }
}

// Initial build
updateRegistry();

module.exports = { 
    get tools() { return tools; }, 
    handlers,
    setNotificationCallback 
};