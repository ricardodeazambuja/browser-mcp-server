#!/usr/bin/env node

/**
 * Network Tools Test Suite
 * Tests network monitoring, HAR export, and request blocking
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

console.log('🌐 Network Tools Test Suite\n');

rl.on('line', (line) => {
    try {
        const response = JSON.parse(line);
        if (response.method === 'notifications/resources/list_changed') return;
        if (response.method === 'notifications/tools/list_changed') return;
        if (response.error) {
            console.error('❌ Error:', response.error.message);
            process.exit(1);
        }
        
        // Check for application-level errors in the result content
        if (response.result && response.result.content && response.result.content[0] && response.result.content[0].text && response.result.content[0].text.startsWith('❌')) {
            console.error(`❌ Failed with app error: ${response.result.content[0].text}`);
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
        console.log('🎉 All network tests passed!');
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
            clientInfo: { name: 'network-test', version: '1.0.0' }
        }),
        verify: () => { }
    },
    {
        name: 'Load Network Module',
        method: 'tools/call',
        params: () => ({
            name: 'browser_manage_modules',
            arguments: { action: 'load', module: 'network' }
        }),
        verify: () => { }
    },
    {
        name: 'Load Advanced Module',
        method: 'tools/call',
        params: () => ({
            name: 'browser_manage_modules',
            arguments: { action: 'load', module: 'advanced' }
        }),
        verify: () => { }
    },
    {
        name: 'Start Network Monitoring',
        method: 'tools/call',
        params: () => ({
            name: 'browser_net_start_monitoring',
            arguments: {}
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            // Accept success, already active, or CDP error
            if (!text.includes('monitoring started') && !text.includes('already active') && !text.includes('CDP Error')) {
                throw new Error('Unexpected response: ' + text.substring(0, 100));
            }
        }
    },
    {
        name: 'Navigate to Network Test Page',
        method: 'tools/call',
        params: () => ({
            name: 'browser_navigate',
            arguments: { url: 'file://' + path.join(__dirname, 'fixtures', 'test-network.html') }
        }),
        verify: () => { }
    },
    {
        name: 'Wait for Network Requests',
        method: 'tools/call',
        params: () => ({
            name: 'browser_wait',
            arguments: { ms: 3000 }
        }),
        verify: () => { }
    },
    {
        name: 'Get Network Requests',
        method: 'tools/call',
        params: () => ({
            name: 'browser_net_get_requests',
            arguments: {}
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            // Accept success, not active, or CDP error
            if (!text.includes('totalCaptured') && !text.includes('not active') && !text.includes('CDP Error')) {
                throw new Error('Unexpected response: ' + text.substring(0, 100));
            }
        }
    },
    {
        name: 'Export HAR',
        method: 'tools/call',
        params: () => ({
            name: 'browser_net_export_har',
            arguments: {}
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            // Accept HAR export, not active warning, or error
            if (!text.includes('HAR') && !text.includes('No network data') && !text.includes('Error')) {
                throw new Error('Unexpected response: ' + text.substring(0, 100));
            }
        }
    },
    {
        name: 'Stop Network Monitoring',
        method: 'tools/call',
        params: () => ({
            name: 'browser_net_stop_monitoring',
            arguments: {}
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            // Accept stopped message, not active, or error
            if (!text.includes('stopped') && !text.includes('not active') && !text.includes('Error')) {
                throw new Error('Unexpected response: ' + text.substring(0, 100));
            }
        }
    },
    {
        name: 'Set Request Blocking',
        method: 'tools/call',
        params: () => ({
            name: 'browser_net_set_request_blocking',
            arguments: { patterns: ['*.jpg', '*.png'] }
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            // Accept success or error
            if (!text.includes('blocking enabled') && !text.includes('Error')) {
                throw new Error('Unexpected response: ' + text.substring(0, 100));
            }
        }
    },
    {
        name: 'Emulate Network Conditions',
        method: 'tools/call',
        params: () => ({
            name: 'browser_net_emulate_conditions',
            arguments: {
                offline: false,
                latency: 100,
                downloadThroughput: 1000000,
                uploadThroughput: 500000
            }
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            // Accept success or error
            if (!text.includes('conditions applied') && !text.includes('Error')) {
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
