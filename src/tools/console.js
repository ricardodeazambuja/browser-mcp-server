const { connectToBrowser } = require('../browser');
const { debugLog } = require('../utils');

// Local state for console tool
let consoleLogs = [];
let consoleListening = false;

const definitions = [
    {
        name: 'browser_console_start',
        description: 'Start capturing browser console logs (console.log, console.error, console.warn, etc.) (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                level: {
                    type: 'string',
                    description: 'Optional filter for log level: "log", "error", "warn", "info", "debug", or "all"',
                    enum: ['log', 'error', 'warn', 'info', 'debug', 'all']
                }
            },
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_console_get',
        description: 'Get all captured console logs since browser_console_start was called (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                filter: {
                    type: 'string',
                    description: 'Optional filter by log level: "log", "error", "warn", "info", "debug", or "all"',
                    enum: ['log', 'error', 'warn', 'info', 'debug', 'all']
                }
            },
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_console_clear',
        description: 'Clear all captured console logs and stop listening (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    }
];

const handlers = {
    browser_console_start: async (args) => {
        const { page } = await connectToBrowser();
        if (!consoleListening) {
            page.on('console', msg => {
                const logEntry = {
                    type: msg.type(),
                    text: msg.text(),
                    timestamp: new Date().toISOString(),
                    location: msg.location()
                };
                consoleLogs.push(logEntry);
                debugLog(`Console [${logEntry.type}]: ${logEntry.text}`);
            });
            consoleListening = true;
            debugLog('Console logging started');
        }
        return {
            content: [{
                type: 'text',
                text: `✅ Console logging started.\n\nCapturing: console.log, console.error, console.warn, console.info, console.debug\n\nUse browser_console_get to retrieve captured logs.`
            }]
        };
    },

    browser_console_get: async (args) => {
        const filter = args.filter;
        const filtered = filter && filter !== 'all'
            ? consoleLogs.filter(log => log.type === filter)
            : consoleLogs;

        if (filtered.length === 0) {
            return {
                content: [{
                    type: 'text',
                    text: consoleListening
                        ? `No console logs captured yet.\n\n${filter && filter !== 'all' ? `Filter: ${filter}\n` : ''}Console logging is active - logs will appear as the page executes JavaScript.`
                        : `Console logging is not active.\n\nUse browser_console_start to begin capturing logs.`
                }]
            };
        }

        const logSummary = `📋 Captured ${filtered.length} console log${filtered.length === 1 ? '' : 's'}${filter && filter !== 'all' ? ` (filtered by: ${filter})` : ''}:\n\n`;
        const formattedLogs = filtered.map((log, i) => {
            const icon = {
                'error': '❌',
                'warn': '⚠️',
                'log': '📝',
                'info': 'ℹ️',
                'debug': '🔍'
            }[log.type] || '📄';

            return `${i + 1}. ${icon} [${log.type.toUpperCase()}] ${log.timestamp}\n   ${log.text}${log.location.url ? `\n   Location: ${log.location.url}:${log.location.lineNumber}` : ''}`;
        }).join('\n\n');

        return {
            content: [{
                type: 'text',
                text: logSummary + formattedLogs
            }]
        };
    },

    browser_console_clear: async (args) => {
        const { page } = await connectToBrowser();
        const count = consoleLogs.length;
        consoleLogs = [];
        if (consoleListening) {
            // Removing listeners is tricky if we don't store the reference to the specific function we passed
            // But page.removeAllListeners('console') is cleaner if we are the only one using it.
            // In this server context, we likely are.
            if (page) {
                page.removeAllListeners('console');
            }
            consoleListening = false;
        }
        debugLog(`Cleared ${count} console logs and stopped listening`);
        return {
            content: [{
                type: 'text',
                text: `✅ Cleared ${count} console log${count === 1 ? '' : 's'} and stopped listening.\n\nUse browser_console_start to resume capturing.`
            }]
        };
    }
};

module.exports = { definitions, handlers };
