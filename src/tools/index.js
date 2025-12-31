const fs = require('fs');
const path = require('path');

const tools = [];
const handlers = {};

// Default tool modules to load
const coreModules = [
    'navigation',
    'interaction',
    'mouse',
    'keyboard',
    'pages',
    'media',
    'console',
    'info',
    'system',
    'docs',
    'performance',
    'network',
    'security',
    'storage'
];

// Load core tools
coreModules.forEach(name => {
    try {
        const mod = require(`./${name}.js`);
        if (mod.definitions) {
            tools.push(...mod.definitions);
        }
        if (mod.handlers) {
            Object.assign(handlers, mod.handlers);
        }
    } catch (error) {
        console.error(`Failed to load core tool module: ${name}`, error);
    }
});

// Auto-load plugins from ../../plugins/ if they exist
const pluginsDir = path.join(__dirname, '..', '..', 'plugins');
if (fs.existsSync(pluginsDir)) {
    fs.readdirSync(pluginsDir)
        .filter(f => f.endsWith('.js'))
        .forEach(f => {
            try {
                const mod = require(path.join(pluginsDir, f));
                if (mod.definitions) {
                    tools.push(...mod.definitions);
                }
                if (mod.handlers) {
                    Object.assign(handlers, mod.handlers);
                }
            } catch (error) {
                console.error(`Failed to load plugin: ${f}`, error);
            }
        });
}

module.exports = { tools, handlers };
