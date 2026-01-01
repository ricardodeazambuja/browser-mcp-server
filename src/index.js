#!/usr/bin/env node

/**
 * Universal Browser Automation MCP Server (Playwright Edition)
 * Main Entry Point
 */

const readline = require('readline');
const { debugLog, version, MCP_PROTOCOL_VERSION } = require('./utils');
const { tools, handlers, setNotificationCallback } = require('./tools');
const { getBrowserState } = require('./browser');

class BrowserMCPServer {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        });

        setNotificationCallback(() => {
            this.notify('notifications/tools/list_changed');
        });

        this.init();
    }

    init() {
        this.rl.on('line', (line) => this.handleLine(line));
        process.on('SIGTERM', () => this.cleanup());
        process.on('SIGINT', () => this.cleanup());
    }

    async handleLine(line) {
        let request;
        try {
            debugLog(`Received: ${line.substring(0, 200)}`);
            request = JSON.parse(line);

            if (request.method === 'initialize') {
                this.handleInitialize(request);
            } else if (request.method === 'notifications/initialized') {
                debugLog('Received initialized notification');
            } else if (request.method === 'tools/list') {
                this.handleToolsList(request);
            } else if (request.method === 'tools/call') {
                await this.handleToolCall(request);
            } else {
                debugLog(`Unknown method: ${request.method}`);
                this.respond(request.id, null, { code: -32601, message: 'Method not found' });
            }
        } catch (error) {
            debugLog(`Error processing request: ${error.message}`);
            const id = request?.id || null;
            this.respond(id, null, { code: -32603, message: error.message });
        }
    }

    handleInitialize(request) {
        debugLog(`Initialize with protocol: ${request.params.protocolVersion}`);
        this.respond(request.id, {
            protocolVersion: request.params.protocolVersion || MCP_PROTOCOL_VERSION,
            capabilities: { tools: {} },
            serverInfo: {
                name: 'browser-automation-playwright',
                version: version
            }
        });
    }

    handleToolsList(request) {
        debugLog('Sending tools list');
        this.respond(request.id, { tools });
    }

    async handleToolCall(request) {
        debugLog(`Calling tool: ${request.params.name}`);
        const result = await this.executeTool(request.params.name, request.params.arguments || {});
        this.respond(request.id, result);
    }

    async executeTool(name, args) {
        try {
            const handler = handlers[name];
            if (!handler) {
                throw new Error(`Unknown tool: ${name}`);
            }
            return await handler(args);
        } catch (error) {
            debugLog(`Tool execution error (${name}): ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ Error executing ${name}: ${error.message}`
                }],
                isError: true
            };
        }
    }

    respond(id, result, error = null) {
        const response = { jsonrpc: '2.0', id };
        if (error) response.error = error;
        else response.result = result;
        console.log(JSON.stringify(response));
    }

    notify(method, params = null) {
        const notification = { jsonrpc: '2.0', method };
        if (params) notification.params = params;
        debugLog(`Sending notification: ${method}`);
        console.log(JSON.stringify(notification));
    }

    async cleanup() {
        const { browser } = getBrowserState();
        if (browser) {
            debugLog('Closing browser on exit...');
            await browser.close().catch(() => { });
        }
        process.exit(0);
    }
}

// Start the server if this file is run directly
if (require.main === module) {
    new BrowserMCPServer();
}

module.exports = { BrowserMCPServer };
