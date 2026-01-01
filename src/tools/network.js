/**
 * Network Analysis Tools (CDP-based)
 * Request monitoring, HAR export, WebSocket inspection, throttling
 */

const { connectToBrowser } = require('../browser');
const { getCDPSession } = require('../cdp');
const { debugLog, version } = require('../utils');

// Local state for network tools
let networkRequests = [];
let monitoringActive = false;
let webSocketFrames = new Map();
const MAX_REQUESTS = 500; // Limit to prevent memory issues

const definitions = [
    {
        name: 'browser_net_start_monitoring',
        description: 'Start monitoring network requests with detailed timing (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                patterns: {
                    type: 'array',
                    description: 'URL patterns to monitor (default: all)',
                    items: { type: 'string' }
                }
            },
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_net_get_requests',
        description: 'Get captured network requests with timing breakdown (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                filter: {
                    type: 'string',
                    description: 'Filter by URL substring'
                }
            },
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_net_stop_monitoring',
        description: 'Stop network monitoring and clear request log (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_net_export_har',
        description: 'Export full network activity log in HAR format (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                includeContent: {
                    type: 'boolean',
                    description: 'Include response bodies (default: false)'
                }
            },
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_net_get_websocket_frames',
        description: 'Get WebSocket frames for inspecting real-time communication (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                requestId: {
                    type: 'string',
                    description: 'Request ID from network monitoring'
                }
            },
            required: ['requestId'],
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_net_set_request_blocking',
        description: 'Block requests matching URL patterns (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                patterns: {
                    type: 'array',
                    description: 'URL patterns to block (e.g., ["*.jpg", "*analytics*"])',
                    items: { type: 'string' }
                }
            },
            required: ['patterns'],
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_net_emulate_conditions',
        description: 'Emulate network conditions (throttling) (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                offline: {
                    type: 'boolean',
                    description: 'Emulate offline mode'
                },
                latency: {
                    type: 'number',
                    description: 'Round-trip latency in ms'
                },
                downloadThroughput: {
                    type: 'number',
                    description: 'Download speed in bytes/second (-1 for unlimited)'
                },
                uploadThroughput: {
                    type: 'number',
                    description: 'Upload speed in bytes/second (-1 for unlimited)'
                }
            },
            required: ['offline', 'latency', 'downloadThroughput', 'uploadThroughput'],
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    }
];

const handlers = {
    browser_net_start_monitoring: async (args) => {
        try {
            if (monitoringActive) {
                return {
                    content: [{
                        type: 'text',
                        text: '⚠️ Network monitoring is already active.\n\nUse browser_net_stop_monitoring to stop first, or browser_net_get_requests to view captured data.'
                    }]
                };
            }

            const cdp = await getCDPSession();
            const patterns = args.patterns || [];

            // Clear previous requests
            networkRequests = [];
            webSocketFrames.clear();

            // Enable network tracking
            await cdp.send('Network.enable');

            // Set up event listeners
            cdp.on('Network.requestWillBeSent', (params) => {
                if (networkRequests.length >= MAX_REQUESTS) {
                    networkRequests.shift(); // Remove oldest to maintain limit
                }

                networkRequests.push({
                    requestId: params.requestId,
                    url: params.request.url,
                    method: params.request.method,
                    headers: params.request.headers,
                    timestamp: params.timestamp,
                    initiator: params.initiator.type,
                    type: params.type
                });
            });

            cdp.on('Network.responseReceived', (params) => {
                const req = networkRequests.find(r => r.requestId === params.requestId);
                if (req) {
                    req.status = params.response.status;
                    req.statusText = params.response.statusText;
                    req.mimeType = params.response.mimeType;
                    req.responseHeaders = params.response.headers;
                    req.timing = params.response.timing;
                    req.fromCache = params.response.fromDiskCache || params.response.fromServiceWorker;
                }
            });

            cdp.on('Network.loadingFinished', (params) => {
                const req = networkRequests.find(r => r.requestId === params.requestId);
                if (req) {
                    req.encodedDataLength = params.encodedDataLength;
                    req.finished = true;
                }
            });

            cdp.on('Network.loadingFailed', (params) => {
                const req = networkRequests.find(r => r.requestId === params.requestId);
                if (req) {
                    req.failed = true;
                    req.errorText = params.errorText;
                    req.canceled = params.canceled;
                }
            });

            // WebSocket frame tracking
            cdp.on('Network.webSocketFrameSent', (params) => {
                if (!webSocketFrames.has(params.requestId)) {
                    webSocketFrames.set(params.requestId, []);
                }
                webSocketFrames.get(params.requestId).push({
                    direction: 'sent',
                    opcode: params.response.opcode,
                    mask: params.response.mask,
                    payloadData: params.response.payloadData,
                    timestamp: params.timestamp
                });
            });

            cdp.on('Network.webSocketFrameReceived', (params) => {
                if (!webSocketFrames.has(params.requestId)) {
                    webSocketFrames.set(params.requestId, []);
                }
                webSocketFrames.get(params.requestId).push({
                    direction: 'received',
                    opcode: params.response.opcode,
                    mask: params.response.mask,
                    payloadData: params.response.payloadData,
                    timestamp: params.timestamp
                });
            });

            monitoringActive = true;

            debugLog(`Started network monitoring${patterns.length > 0 ? ' with filters' : ''}`);

            return {
                content: [{
                    type: 'text',
                    text: `✅ Network monitoring started\n\n${patterns.length > 0 ? `Patterns: ${patterns.join(', ')}\n` : ''}Capturing all network requests...\n\nUse browser_net_get_requests to view captured requests.\nLimit: ${MAX_REQUESTS} requests max`
                }]
            };
        } catch (error) {
            debugLog(`CDP error in browser_net_start_monitoring: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ CDP Error: ${error.message}\n\nPossible causes:\n- Browser doesn't support network monitoring\n- CDP session disconnected`
                }],
                isError: true
            };
        }
    },

    browser_net_get_requests: async (args) => {
        try {
            if (!monitoringActive) {
                return {
                    content: [{
                        type: 'text',
                        text: '⚠️ Network monitoring is not active.\n\nUse browser_net_start_monitoring to start capturing requests first.'
                    }]
                };
            }

            const filter = args.filter || '';
            const filtered = filter
                ? networkRequests.filter(r => r.url.includes(filter))
                : networkRequests;

            if (filtered.length === 0) {
                return {
                    content: [{
                        type: 'text',
                        text: `No network requests captured yet.\n\n${filter ? `Filter: "${filter}"\n` : ''}Monitoring is active - requests will appear as they occur.`
                    }]
                };
            }

            // Summarize requests
            const summary = {
                totalCaptured: networkRequests.length,
                filtered: filtered.length,
                requests: filtered.slice(0, 50).map(r => ({
                    method: r.method,
                    url: r.url.length > 100 ? r.url.substring(0, 97) + '...' : r.url,
                    status: r.status || 'pending',
                    type: r.type,
                    size: r.encodedDataLength ? `${(r.encodedDataLength / 1024).toFixed(2)}KB` : 'unknown',
                    timing: r.timing ? `${(r.timing.receiveHeadersEnd - r.timing.sendStart).toFixed(2)}ms` : 'N/A',
                    failed: r.failed || false,
                    fromCache: r.fromCache || false
                }))
            };

            return {
                content: [{
                    type: 'text',
                    text: `📊 Network Requests (showing ${Math.min(50, filtered.length)} of ${filtered.length}):\n\n${JSON.stringify(summary, null, 2)}\n\nNote: Limited to 50 requests for readability. Use filter parameter to narrow results.`
                }]
            };
        } catch (error) {
            debugLog(`Error in browser_net_get_requests: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ Error: ${error.message}`
                }],
                isError: true
            };
        }
    },

    browser_net_stop_monitoring: async (args) => {
        try {
            if (!monitoringActive) {
                return {
                    content: [{
                        type: 'text',
                        text: '⚠️ Network monitoring is not active.'
                    }]
                };
            }

            const cdp = await getCDPSession();
            await cdp.send('Network.disable');

            // Remove all listeners
            cdp.removeAllListeners('Network.requestWillBeSent');
            cdp.removeAllListeners('Network.responseReceived');
            cdp.removeAllListeners('Network.loadingFinished');
            cdp.removeAllListeners('Network.loadingFailed');
            cdp.removeAllListeners('Network.webSocketFrameSent');
            cdp.removeAllListeners('Network.webSocketFrameReceived');

            const count = networkRequests.length;
            const wsCount = webSocketFrames.size;

            networkRequests = [];
            webSocketFrames.clear();
            monitoringActive = false;

            debugLog('Stopped network monitoring');

            return {
                content: [{
                    type: 'text',
                    text: `✅ Network monitoring stopped\n\nCaptured ${count} requests and ${wsCount} WebSocket connections.\nData has been cleared.`
                }]
            };
        } catch (error) {
            monitoringActive = false;
            debugLog(`CDP error in browser_net_stop_monitoring: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ CDP Error: ${error.message}\n\nMonitoring has been stopped.`
                }],
                isError: true
            };
        }
    },

    browser_net_export_har: async (args) => {
        try {
            if (!monitoringActive || networkRequests.length === 0) {
                return {
                    content: [{
                        type: 'text',
                        text: '⚠️ No network data to export.\n\nStart monitoring with browser_net_start_monitoring and navigate to capture requests first.'
                    }]
                };
            }

            const includeContent = args.includeContent || false;

            // Build HAR format
            const har = {
                log: {
                    version: '1.2',
                    creator: {
                        name: 'Browser MCP Server',
                        version: version
                    },
                    pages: [],
                    entries: networkRequests.map(r => ({
                        startedDateTime: new Date(r.timestamp * 1000).toISOString(),
                        time: r.timing ? (r.timing.receiveHeadersEnd - r.timing.sendStart) : 0,
                        request: {
                            method: r.method,
                            url: r.url,
                            httpVersion: 'HTTP/1.1',
                            headers: Object.entries(r.headers || {}).map(([name, value]) => ({ name, value })),
                            queryString: [],
                            headersSize: -1,
                            bodySize: -1
                        },
                        response: {
                            status: r.status || 0,
                            statusText: r.statusText || '',
                            httpVersion: 'HTTP/1.1',
                            headers: Object.entries(r.responseHeaders || {}).map(([name, value]) => ({ name, value })),
                            content: {
                                size: r.encodedDataLength || 0,
                                mimeType: r.mimeType || 'application/octet-stream'
                            },
                            redirectURL: '',
                            headersSize: -1,
                            bodySize: r.encodedDataLength || 0
                        },
                        cache: {
                            beforeRequest: null,
                            afterRequest: r.fromCache ? {} : null
                        },
                        timings: r.timing ? {
                            send: r.timing.sendEnd - r.timing.sendStart,
                            wait: r.timing.receiveHeadersEnd - r.timing.sendEnd,
                            receive: 0
                        } : {
                            send: 0,
                            wait: 0,
                            receive: 0
                        }
                    }))
                }
            };

            debugLog(`Exported HAR with ${har.log.entries.length} entries`);

            return {
                content: [{
                    type: 'text',
                    text: `✅ HAR Export:\n\n${JSON.stringify(har, null, 2).substring(0, 10000)}...\n\nNote: Truncated for display. Full HAR contains ${har.log.entries.length} entries.`
                }]
            };
        } catch (error) {
            debugLog(`Error in browser_net_export_har: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ Error: ${error.message}`
                }],
                isError: true
            };
        }
    },

    browser_net_get_websocket_frames: async (args) => {
        try {
            const requestId = args.requestId;

            if (!webSocketFrames.has(requestId)) {
                return {
                    content: [{
                        type: 'text',
                        text: `⚠️ No WebSocket frames found for request ID: ${requestId}\n\nMake sure:\n1. Network monitoring is active\n2. The request ID is correct\n3. WebSocket connection has exchanged frames`
                    }]
                };
            }

            const frames = webSocketFrames.get(requestId);
            const summary = frames.slice(0, 20).map(f => ({
                direction: f.direction,
                opcode: f.opcode,
                payloadLength: f.payloadData ? f.payloadData.length : 0,
                payload: f.payloadData ? f.payloadData.substring(0, 100) : '',
                timestamp: new Date(f.timestamp * 1000).toISOString()
            }));

            return {
                content: [{
                    type: 'text',
                    text: `📊 WebSocket Frames (showing ${Math.min(20, frames.length)} of ${frames.length}):\n\n${JSON.stringify(summary, null, 2)}`
                }]
            };
        } catch (error) {
            debugLog(`Error in browser_net_get_websocket_frames: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ Error: ${error.message}`
                }],
                isError: true
            };
        }
    },

    browser_net_set_request_blocking: async (args) => {
        try {
            const cdp = await getCDPSession();
            const patterns = args.patterns || [];

            await cdp.send('Network.setBlockedURLs', { urls: patterns });

            debugLog(`Set request blocking for ${patterns.length} patterns`);

            return {
                content: [{
                    type: 'text',
                    text: `✅ Request blocking enabled\n\nBlocked patterns:\n${patterns.map(p => `  • ${p}`).join('\n')}\n\nRequests matching these patterns will be blocked.`
                }]
            };
        } catch (error) {
            debugLog(`CDP error in browser_net_set_request_blocking: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ CDP Error: ${error.message}`
                }],
                isError: true
            };
        }
    },

    browser_net_emulate_conditions: async (args) => {
        try {
            const cdp = await getCDPSession();

            await cdp.send('Network.emulateNetworkConditions', {
                offline: args.offline,
                latency: args.latency,
                downloadThroughput: args.downloadThroughput,
                uploadThroughput: args.uploadThroughput
            });

            debugLog(`Network conditions set: offline=${args.offline}, latency=${args.latency}ms`);

            const conditions = {
                offline: args.offline,
                latency: `${args.latency}ms`,
                download: args.downloadThroughput === -1 ? 'unlimited' : `${(args.downloadThroughput / 1024).toFixed(2)} KB/s`,
                upload: args.uploadThroughput === -1 ? 'unlimited' : `${(args.uploadThroughput / 1024).toFixed(2)} KB/s`
            };

            return {
                content: [{
                    type: 'text',
                    text: `✅ Network conditions applied:\n\n${JSON.stringify(conditions, null, 2)}`
                }]
            };
        } catch (error) {
            debugLog(`CDP error in browser_net_emulate_conditions: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ CDP Error: ${error.message}`
                }],
                isError: true
            };
        }
    }
};

module.exports = { definitions, handlers };
