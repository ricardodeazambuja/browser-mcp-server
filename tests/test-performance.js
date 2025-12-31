#!/usr/bin/env node

/**
 * Performance Tools Test Suite
 * Tests CPU profiling, heap snapshots, metrics, and code coverage
 */

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

const serverPath = path.join(__dirname, '..', 'src', 'index.js');
const proc = spawn('node', [serverPath], { stdio: ['pipe', 'pipe', 'pipe'] });

proc.stderr.on('data', (data) => {
    // Suppress stderr for cleaner test output
});

proc.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
});

const rl = readline.createInterface({ input: proc.stdout, terminal: false });

let messageId = 1;
let testStep = 0;

function sendRequest(method, params) {
    const request = { jsonrpc: '2.0', id: messageId++, method, params };
    proc.stdin.write(JSON.stringify(request) + '\n');
}

console.log('🔬 Performance Tools Test Suite\n');

rl.on('line', (line) => {
    try {
        const response = JSON.parse(line);
        if (response.method === 'notifications/resources/list_changed') return;
        if (response.error) {
            console.error('❌ Error:', response.error.message);
            process.exit(1);
        }
        if (response.result && response.id) {
            handleResponse(response);
        }
    } catch (e) {
        // Ignore non-JSON lines
    }
});

function handleResponse(response) {
    const currentTest = steps[testStep];
    if (!currentTest) return;

    console.log(`➡️  ${currentTest.name}`);

    try {
        currentTest.verify(response);
        console.log(`   ✅ Passed\n`);
    } catch (err) {
        console.error(`   ❌ Failed: ${err.message}`);
        process.exit(1);
    }

    testStep++;
    if (testStep < steps.length) {
        setTimeout(() => {
            sendRequest(steps[testStep].method, steps[testStep].params());
        }, 500);
    } else {
        console.log('🎉 All performance tests passed!');
        proc.kill();
        process.exit(0);
    }
}

const steps = [
    {
        name: 'Initialize',
        method: 'initialize',
        params: () => ({
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'performance-test', version: '1.0.0' }
        }),
        verify: () => { }
    },
    {
        name: 'Navigate to Performance Test Page',
        method: 'tools/call',
        params: () => ({
            name: 'browser_navigate',
            arguments: { url: 'file://' + path.join(__dirname, 'fixtures', 'test-performance.html') }
        }),
        verify: () => { }
    },
    {
        name: 'Wait for Page Load',
        method: 'tools/call',
        params: () => ({
            name: 'browser_wait',
            arguments: { ms: 1000 }
        }),
        verify: () => { }
    },
    {
        name: 'Start CPU Profiling',
        method: 'tools/call',
        params: () => ({
            name: 'browser_perf_start_profile',
            arguments: {}
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            if (res.result.isError) {
                throw new Error('CPU profiling failed: ' + text);
            }
            if (!text.includes('profiling started') && !text.includes('already active')) {
                throw new Error('Unexpected response: ' + text.substring(0, 100));
            }
        }
    },
    {
        name: 'Wait for Execution',
        method: 'tools/call',
        params: () => ({
            name: 'browser_wait',
            arguments: { ms: 2000 }
        }),
        verify: () => { }
    },
    {
        name: 'Stop CPU Profiling',
        method: 'tools/call',
        params: () => ({
            name: 'browser_perf_stop_profile',
            arguments: {}
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            if (res.result.isError) {
                throw new Error('Stop CPU profiling failed: ' + text);
            }
            if (!text.includes('totalNodes') && !text.includes('not active')) {
                throw new Error('Unexpected response: ' + text.substring(0, 100));
            }
        }
    },
    {
        name: 'Get Heap Usage',
        method: 'tools/call',
        params: () => ({
            name: 'browser_perf_get_heap_usage',
            arguments: {}
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            if (res.result.isError) {
                throw new Error('Get heap usage failed: ' + text);
            }
            if (!text.includes('usedSize')) {
                throw new Error('Unexpected response: ' + text.substring(0, 100));
            }
        }
    },
    {
        name: 'Get Runtime Metrics',
        method: 'tools/call',
        params: () => ({
            name: 'browser_perf_get_metrics',
            arguments: {}
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            if (res.result.isError) {
                throw new Error('Get runtime metrics failed: ' + text);
            }
            if (!text.includes('Nodes') && !text.includes('JSHeap')) {
                throw new Error('Unexpected response: ' + text.substring(0, 100));
            }
        }
    },
    {
        name: 'Get Performance Metrics',
        method: 'tools/call',
        params: () => ({
            name: 'browser_perf_get_performance_metrics',
            arguments: {}
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            if (res.result.isError) {
                throw new Error('Get performance metrics failed: ' + text);
            }
            if (!text.includes('navigation')) {
                throw new Error('Unexpected response: ' + text.substring(0, 100));
            }
        }
    },
    {
        name: 'Start Code Coverage',
        method: 'tools/call',
        params: () => ({
            name: 'browser_perf_start_coverage',
            arguments: {}
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            if (res.result.isError) {
                throw new Error('Start code coverage failed: ' + text);
            }
            if (!text.includes('coverage started') && !text.includes('already active')) {
                throw new Error('Unexpected response: ' + text.substring(0, 100));
            }
        }
    },
    {
        name: 'Wait for Coverage Collection',
        method: 'tools/call',
        params: () => ({
            name: 'browser_wait',
            arguments: { ms: 1000 }
        }),
        verify: () => { }
    },
    {
        name: 'Stop Code Coverage',
        method: 'tools/call',
        params: () => ({
            name: 'browser_perf_stop_coverage',
            arguments: {}
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            if (res.result.isError) {
                throw new Error('Stop code coverage failed: ' + text);
            }
            if (!text.includes('javascript') && !text.includes('not active')) {
                throw new Error('Unexpected response: ' + text.substring(0, 100));
            }
        }
    }
];

// Start tests
setTimeout(() => sendRequest(steps[0].method, steps[0].params()), 500);

// Timeout after 60 seconds
setTimeout(() => {
    console.error('\n❌ Test timeout');
    proc.kill();
    process.exit(1);
}, 60000);
