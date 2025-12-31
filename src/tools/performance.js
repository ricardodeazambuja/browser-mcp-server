/**
 * Performance Profiling Tools (CDP-based)
 * CPU profiling, heap snapshots, memory metrics, web vitals, code coverage
 */

const { connectToBrowser } = require('../browser');
const { getCDPSession } = require('../cdp');
const { debugLog } = require('../utils');

// Local state for performance tools
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
                        text: '⚠️ CPU profiling is already active.\n\nUse browser_perf_stop_profile to get results first.'
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
                    text: `✅ CPU profiling started with sample interval: ${interval}μs\n\nProfiling JavaScript execution...\nUse browser_perf_stop_profile to get results.`
                }]
            };
        } catch (error) {
            debugLog(`CDP error in browser_perf_start_profile: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ CDP Error: ${error.message}\n\nPossible causes:\n- Browser doesn't support CPU profiling\n- CDP session disconnected\n- Page not fully loaded`
                }],
                isError: true
            };
        }
    },

    browser_perf_stop_profile: async (args) => {
        try {
            if (!profilingActive) {
                return {
                    content: [{
                        type: 'text',
                        text: '⚠️ CPU profiling is not active.\n\nUse browser_perf_start_profile to start profiling first.'
                    }]
                };
            }

            const cdp = await getCDPSession();
            const { profile } = await cdp.send('Profiler.stop');
            await cdp.send('Profiler.disable');
            profilingActive = false;

            debugLog('Stopped CPU profiling');

            // Profile can be huge - provide summary instead of full data
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
                durationMicroseconds: totalTime,
                durationMs: (totalTime / 1000).toFixed(2),
                topFunctions: topFunctions
            };

            return {
                content: [{
                    type: 'text',
                    text: `✅ CPU Profile Results:\n\n${JSON.stringify(summary, null, 2)}\n\nNote: Full profile data (${profile.nodes.length} nodes) is too large to display.`
                }]
            };
        } catch (error) {
            profilingActive = false;
            debugLog(`CDP error in browser_perf_stop_profile: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ CDP Error: ${error.message}\n\nProfiling has been stopped.`
                }],
                isError: true
            };
        }
    },

    browser_perf_take_heap_snapshot: async (args) => {
        try {
            const cdp = await getCDPSession();
            const reportProgress = args.reportProgress || false;

            debugLog('Taking heap snapshot...');

            let chunks = [];
            let chunkCount = 0;

            // Listen for heap snapshot chunks
            cdp.on('HeapProfiler.addHeapSnapshotChunk', (params) => {
                chunks.push(params.chunk);
                chunkCount++;
            });

            if (reportProgress) {
                cdp.on('HeapProfiler.reportHeapSnapshotProgress', (params) => {
                    debugLog(`Heap snapshot progress: ${params.done}/${params.total}`);
                });
            }

            await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress });

            // Remove listeners
            cdp.removeAllListeners('HeapProfiler.addHeapSnapshotChunk');
            if (reportProgress) {
                cdp.removeAllListeners('HeapProfiler.reportHeapSnapshotProgress');
            }

            const fullSnapshot = chunks.join('');
            const snapshotSize = fullSnapshot.length;

            debugLog(`Heap snapshot complete: ${snapshotSize} bytes in ${chunkCount} chunks`);

            return {
                content: [{
                    type: 'text',
                    text: `✅ Heap Snapshot Captured\n\nSize: ${(snapshotSize / 1024).toFixed(2)} KB\nChunks: ${chunkCount}\n\nNote: Snapshot data is too large to display in full. Use Chrome DevTools to analyze heap snapshots in detail.`
                }]
            };
        } catch (error) {
            debugLog(`CDP error in browser_perf_take_heap_snapshot: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ CDP Error: ${error.message}\n\nPossible causes:\n- Browser doesn't support heap profiling\n- Not enough memory to capture snapshot`
                }],
                isError: true
            };
        }
    },

    browser_perf_get_heap_usage: async (args) => {
        try {
            const cdp = await getCDPSession();
            const result = await cdp.send('Runtime.getHeapUsage');

            const heapInfo = {
                usedSize: result.usedSize,
                usedSizeMB: (result.usedSize / 1024 / 1024).toFixed(2),
                totalSize: result.totalSize,
                totalSizeMB: (result.totalSize / 1024 / 1024).toFixed(2),
                limit: result.limit,
                limitMB: (result.limit / 1024 / 1024).toFixed(2),
                usagePercent: ((result.usedSize / result.totalSize) * 100).toFixed(2)
            };

            return {
                content: [{
                    type: 'text',
                    text: `📊 JavaScript Heap Usage:\n\n${JSON.stringify(heapInfo, null, 2)}`
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

    browser_perf_get_metrics: async (args) => {
        try {
            const cdp = await getCDPSession();
            await cdp.send('Performance.enable');
            const { metrics } = await cdp.send('Performance.getMetrics');
            await cdp.send('Performance.disable');

            const formattedMetrics = metrics.map(m => ({
                name: m.name,
                value: m.value
            }));

            return {
                content: [{
                    type: 'text',
                    text: `📊 Runtime Performance Metrics:\n\n${JSON.stringify(formattedMetrics, null, 2)}`
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

    browser_perf_get_performance_metrics: async (args) => {
        try {
            const { page } = await connectToBrowser();

            // Use Performance API to get web vitals and timing
            const metrics = await page.evaluate(() => {
                const result = {
                    navigation: {},
                    paint: {},
                    webVitals: {}
                };

                // Navigation Timing
                if (performance.timing) {
                    const t = performance.timing;
                    result.navigation = {
                        domContentLoaded: t.domContentLoadedEventEnd - t.navigationStart,
                        loadComplete: t.loadEventEnd - t.navigationStart,
                        domInteractive: t.domInteractive - t.navigationStart,
                        ttfb: t.responseStart - t.navigationStart
                    };
                }

                // Paint Timing
                if (performance.getEntriesByType) {
                    const paintEntries = performance.getEntriesByType('paint');
                    paintEntries.forEach(entry => {
                        result.paint[entry.name] = entry.startTime;
                    });
                }

                // Try to get LCP using PerformanceObserver (if available)
                const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
                if (lcpEntries && lcpEntries.length > 0) {
                    result.webVitals.lcp = lcpEntries[lcpEntries.length - 1].startTime;
                }

                // Get CLS (Cumulative Layout Shift)
                const clsEntries = performance.getEntriesByType('layout-shift');
                if (clsEntries) {
                    result.webVitals.cls = clsEntries
                        .filter(entry => !entry.hadRecentInput)
                        .reduce((sum, entry) => sum + entry.value, 0);
                }

                return result;
            });

            return {
                content: [{
                    type: 'text',
                    text: `📊 Web Performance Metrics:\n\n${JSON.stringify(metrics, null, 2)}\n\nNote: Some metrics may not be available depending on page state and browser support.`
                }]
            };
        } catch (error) {
            debugLog(`Error in browser_perf_get_performance_metrics: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ Error: ${error.message}`
                }],
                isError: true
            };
        }
    },

    browser_perf_start_coverage: async (args) => {
        try {
            if (coverageActive) {
                return {
                    content: [{
                        type: 'text',
                        text: '⚠️ Code coverage is already active.\n\nUse browser_perf_stop_coverage to get results first.'
                    }]
                };
            }

            const cdp = await getCDPSession();
            const resetOnNavigation = args.resetOnNavigation !== false;

            await cdp.send('Profiler.enable');
            await cdp.send('Profiler.startPreciseCoverage', {
                callCount: false,
                detailed: true
            });

            await cdp.send('DOM.enable');
            await cdp.send('CSS.enable');
            await cdp.send('CSS.startRuleUsageTracking');

            coverageActive = true;

            debugLog('Started code coverage tracking');

            return {
                content: [{
                    type: 'text',
                    text: `✅ Code coverage started for CSS and JavaScript\n\nResetOnNavigation: ${resetOnNavigation}\n\nUse browser_perf_stop_coverage to get results.`
                }]
            };
        } catch (error) {
            debugLog(`CDP error in browser_perf_start_coverage: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ CDP Error: ${error.message}\n\nPossible causes:\n- Browser doesn't support code coverage\n- CDP session disconnected`
                }],
                isError: true
            };
        }
    },

    browser_perf_stop_coverage: async (args) => {
        try {
            if (!coverageActive) {
                return {
                    content: [{
                        type: 'text',
                        text: '⚠️ Code coverage is not active.\n\nUse browser_perf_start_coverage to start tracking first.'
                    }]
                };
            }

            const cdp = await getCDPSession();

            // Get JavaScript coverage
            const { result: jsCoverage } = await cdp.send('Profiler.takePreciseCoverage');
            await cdp.send('Profiler.stopPreciseCoverage');
            await cdp.send('Profiler.disable');

            // Get CSS coverage
            const { ruleUsage: cssCoverage } = await cdp.send('CSS.stopRuleUsageTracking');
            await cdp.send('CSS.disable');
            await cdp.send('DOM.disable');

            coverageActive = false;

            debugLog('Stopped code coverage tracking');

            // Summarize coverage data
            const jsSummary = jsCoverage.slice(0, 10).map(entry => {
                const totalBytes = entry.functions.reduce((sum, fn) => {
                    return sum + fn.ranges.reduce((s, r) => s + (r.endOffset - r.startOffset), 0);
                }, 0);
                const usedBytes = entry.functions.reduce((sum, fn) => {
                    return sum + fn.ranges.filter(r => r.count > 0).reduce((s, r) => s + (r.endOffset - r.startOffset), 0);
                }, 0);

                return {
                    url: entry.url,
                    usedBytes,
                    totalBytes,
                    coverage: totalBytes > 0 ? ((usedBytes / totalBytes) * 100).toFixed(2) + '%' : 'N/A'
                };
            });

            const cssSummary = cssCoverage.slice(0, 10).map(rule => ({
                used: rule.used,
                styleSheetId: rule.styleSheetId,
                startOffset: rule.startOffset,
                endOffset: rule.endOffset
            }));

            const result = {
                javascript: {
                    filesAnalyzed: jsCoverage.length,
                    topFiles: jsSummary
                },
                css: {
                    rulesAnalyzed: cssCoverage.length,
                    topRules: cssSummary.slice(0, 5)
                }
            };

            return {
                content: [{
                    type: 'text',
                    text: `✅ Code Coverage Results:\n\n${JSON.stringify(result, null, 2)}\n\nNote: Showing top 10 files. Full coverage data available via CDP.`
                }]
            };
        } catch (error) {
            coverageActive = false;
            debugLog(`CDP error in browser_perf_stop_coverage: ${error.message}`);
            return {
                content: [{
                    type: 'text',
                    text: `❌ CDP Error: ${error.message}\n\nCoverage tracking has been stopped.`
                }],
                isError: true
            };
        }
    }
};

module.exports = { definitions, handlers };
