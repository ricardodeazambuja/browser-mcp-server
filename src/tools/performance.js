/**
 * Performance Profiling Tools (CDP-based)
 */

const { withPage } = require('../browser');
const { getCDPSession } = require('../cdp');
const { debugLog } = require('../utils');

let profilingActive = false;
let coverageActive = false;

const definitions = [
    {
        name: 'browser_perf_start_profile',
        description: 'Start CPU profiling to track JavaScript execution (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                sampleInterval: {
                    type: 'number',
                    description: 'Microseconds between samples (default: 100)'
                }
            },
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_perf_stop_profile',
        description: 'Stop CPU profiling and get profile data (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_perf_take_heap_snapshot',
        description: 'Capture heap snapshot for memory analysis (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                reportProgress: {
                    type: 'boolean',
                    description: 'Report progress events (default: false)'
                }
            },
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_perf_get_heap_usage',
        description: 'Get current JavaScript heap usage statistics (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_perf_get_metrics',
        description: 'Get runtime performance metrics (DOM nodes, event listeners, JS heap) (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_perf_get_performance_metrics',
        description: 'Get web vitals and navigation timing (FCP, LCP, CLS, TTFB) (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_perf_start_coverage',
        description: 'Start tracking CSS and JavaScript code coverage (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {
                resetOnNavigation: {
                    type: 'boolean',
                    description: 'Reset coverage on navigation (default: true)'
                }
            },
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    },
    {
        name: 'browser_perf_stop_coverage',
        description: 'Stop coverage and get results showing used vs unused code (see browser_docs)',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        }
    }
];

const handlers = {
    browser_perf_start_profile: async (args) => {
        try {
            if (profilingActive) {
                return {
                    content: [{
                        type: 'text',
                        text: '⚠️ CPU profiling is already active.'
                    }]
                };
            }

            const cdp = await getCDPSession();
            const interval = args.sampleInterval || 100;

            await cdp.send('Profiler.enable');
            await cdp.send('Profiler.start', { samplingInterval: interval });
            profilingActive = true;

            debugLog(`Started CPU profiling with ${interval}μs sample interval`);

            return {
                content: [{
                    type: 'text',
                    text: `✅ CPU profiling started (${interval}μs interval).`
                }]
            };
        } catch (error) {
            debugLog(`CDP error in browser_perf_start_profile: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ CDP Error: ${error.message}`
                }],
                isError: true
            };
        }
    },

    browser_perf_stop_profile: async () => {
        try {
            if (!profilingActive) {
                return {
                    content: [{
                        type: 'text',
                        text: '⚠️ CPU profiling is not active.'
                    }]
                };
            }

            const cdp = await getCDPSession();
            const { profile } = await cdp.send('Profiler.stop');
            await cdp.send('Profiler.disable');
            profilingActive = false;

            const totalTime = profile.timeDeltas ? profile.timeDeltas.reduce((a, b) => a + b, 0) : 0;
            const topFunctions = profile.nodes
                .filter(n => n.callFrame && n.callFrame.functionName)
                .slice(0, 15)
                .map(n => ({
                    function: n.callFrame.functionName || '(anonymous)',
                    url: n.callFrame.url || '(internal)',
                    line: n.callFrame.lineNumber
                }));

            const summary = {
                totalNodes: profile.nodes.length,
                totalSamples: profile.samples ? profile.samples.length : 0,
                durationMs: (totalTime / 1000).toFixed(2),
                topFunctions
            };

            return {
                content: [{
                    type: 'text',
                    text: `✅ CPU Profile Results:\n\n${JSON.stringify(summary, null, 2)}`
                }]
            };
        } catch (error) {
            profilingActive = false;
            debugLog(`CDP error in browser_perf_stop_profile: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ CDP Error: ${error.message}`
                }],
                isError: true
            };
        }
    },

    browser_perf_take_heap_snapshot: async (args) => {
        try {
            const cdp = await getCDPSession();
            const reportProgress = args.reportProgress || false;

            let chunks = [];
            cdp.on('HeapProfiler.addHeapSnapshotChunk', (params) => chunks.push(params.chunk));

            await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress });
            cdp.removeAllListeners('HeapProfiler.addHeapSnapshotChunk');

            const snapshotSize = chunks.join('').length;
            return {
                content: [{
                    type: 'text',
                    text: `✅ Heap Snapshot Captured: ${(snapshotSize / 1024).toFixed(2)} KB.`
                }]
            };
        } catch (error) {
            debugLog(`CDP error in browser_perf_take_heap_snapshot: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ CDP Error: ${error.message}`
                }],
                isError: true
            };
        }
    },

    browser_perf_get_heap_usage: async () => {
        try {
            const cdp = await getCDPSession();
            const result = await cdp.send('Runtime.getHeapUsage');

            const heapInfo = {
                usedSizeMB: (result.usedSize / 1024 / 1024).toFixed(2),
                totalSizeMB: (result.totalSize / 1024 / 1024).toFixed(2),
                limitMB: (result.limit / 1024 / 1024).toFixed(2),
                usagePercent: ((result.usedSize / result.totalSize) * 100).toFixed(2)
            };

            return {
                content: [{
                    type: 'text',
                    text: `📊 JS Heap Usage: ${JSON.stringify(heapInfo, null, 2)}`
                }]
            };
        } catch (error) {
            debugLog(`CDP error in browser_perf_get_heap_usage: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ CDP Error: ${error.message}`
                }],
                isError: true
            };
        }
    },

    browser_perf_get_metrics: async () => {
        try {
            const cdp = await getCDPSession();
            await cdp.send('Performance.enable');
            const { metrics } = await cdp.send('Performance.getMetrics');
            await cdp.send('Performance.disable');

            return {
                content: [{
                    type: 'text',
                    text: `📊 Performance Metrics: ${JSON.stringify(metrics, null, 2)}`
                }]
            };
        } catch (error) {
            debugLog(`CDP error in browser_perf_get_metrics: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ CDP Error: ${error.message}`
                }],
                isError: true
            };
        }
    },

    browser_perf_get_performance_metrics: withPage(async (page) => {
        try {
            const metrics = await page.evaluate(() => {
                const result = { navigation: {}, paint: {}, webVitals: {} };
                if (performance.timing) {
                    const t = performance.timing;
                    result.navigation = {
                        domContentLoaded: t.domContentLoadedEventEnd - t.navigationStart,
                        loadComplete: t.loadEventEnd - t.navigationStart,
                        ttfb: t.responseStart - t.navigationStart
                    };
                }
                const paintEntries = performance.getEntriesByType('paint');
                paintEntries.forEach(entry => result.paint[entry.name] = entry.startTime);
                return result;
            });

            return {
                content: [{
                    type: 'text',
                    text: `📊 Web Vitals: ${JSON.stringify(metrics, null, 2)}`
                }]
            };
        } catch (error) {
            return {
                content: [{ type: 'text', text: `❌ Error: ${error.message}` }],
                isError: true
            };
        }
    }),

    browser_perf_start_coverage: async (args) => {
        try {
            if (coverageActive) {
                return {
                    content: [{
                        type: 'text',
                        text: '⚠️ Code coverage is already active.'
                    }]
                };
            }

            const cdp = await getCDPSession();
            await cdp.send('Profiler.enable');
            await cdp.send('Profiler.startPreciseCoverage', { callCount: false, detailed: true });
            await cdp.send('DOM.enable');
            await cdp.send('CSS.enable');
            await cdp.send('CSS.startRuleUsageTracking');

            coverageActive = true;
            return {
                content: [{
                    type: 'text',
                    text: `✅ Code coverage started.`
                }]
            };
        } catch (error) {
            debugLog(`CDP error in browser_perf_start_coverage: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ CDP Error: ${error.message}`
                }],
                isError: true
            };
        }
    },

    browser_perf_stop_coverage: async () => {
        try {
            if (!coverageActive) {
                return {
                    content: [{
                        type: 'text',
                        text: '⚠️ Code coverage is not active.'
                    }]
                };
            }

            const cdp = await getCDPSession();
            const { result: jsCoverage } = await cdp.send('Profiler.takePreciseCoverage');
            await cdp.send('Profiler.stopPreciseCoverage');
            await cdp.send('Profiler.disable');
            const { ruleUsage: cssCoverage } = await cdp.send('CSS.stopRuleUsageTracking');
            await cdp.send('CSS.disable');
            await cdp.send('DOM.disable');

            coverageActive = false;

            const jsSummary = jsCoverage.slice(0, 10).map(entry => ({
                url: entry.url,
                filesAnalyzed: jsCoverage.length
            }));

            return {
                content: [{
                    type: 'text',
                    text: `✅ Code Coverage Results: ${JSON.stringify({ jsFiles: jsCoverage.length, cssRules: cssCoverage.length }, null, 2)}`
                }]
            };
        } catch (error) {
            coverageActive = false;
            debugLog(`CDP error in browser_perf_stop_coverage: ${error.message}`);
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