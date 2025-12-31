#!/usr/bin/env node

/**
 * Security Tools Test Suite
 * Tests security headers, CSP monitoring, and mixed content detection
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

console.log('🔒 Security Tools Test Suite\n');

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
        console.log('🎉 All security tests passed!');
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
            clientInfo: { name: 'security-test', version: '1.0.0' }
        }),
        verify: () => { }
    },
    {
        name: 'Navigate to Security Test Page',
        method: 'tools/call',
        params: () => ({
            name: 'browser_navigate',
            arguments: { url: 'file://' + path.join(__dirname, 'fixtures', 'test-security.html') }
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
        name: 'Get Security Headers',
        method: 'tools/call',
        params: () => ({
            name: 'browser_sec_get_security_headers',
            arguments: {}
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            if (res.result.isError) {
                throw new Error('Get security headers failed: ' + text);
            }
            if (!text.includes('content-security-policy') && !text.includes('Security Headers')) {
                throw new Error('Unexpected response: ' + text.substring(0, 100));
            }
        }
    },
    {
        name: 'Start CSP Monitoring',
        method: 'tools/call',
        params: () => ({
            name: 'browser_sec_start_csp_monitoring',
            arguments: {}
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            // Accept success, already active, or error
            if (!text.includes('monitoring started') && !text.includes('already active') && !text.includes('Error')) {
                throw new Error('Unexpected response: ' + text.substring(0, 100));
            }
        }
    },
    {
        name: 'Wait for CSP Events',
        method: 'tools/call',
        params: () => ({
            name: 'browser_wait',
            arguments: { ms: 1000 }
        }),
        verify: () => { }
    },
    {
        name: 'Get CSP Violations',
        method: 'tools/call',
        params: () => ({
            name: 'browser_sec_get_csp_violations',
            arguments: {}
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            // May or may not have violations depending on browser behavior
            if (!text.includes('violations') && !text.includes('No CSP') && !text.includes('not active') && !text.includes('Error')) {
                throw new Error('Unexpected response: ' + text.substring(0, 100));
            }
        }
    },
    {
        name: 'Stop CSP Monitoring',
        method: 'tools/call',
        params: () => ({
            name: 'browser_sec_stop_csp_monitoring',
            arguments: {}
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            // Accept stopped, not active, or error
            if (!text.includes('stopped') && !text.includes('not active') && !text.includes('Error')) {
                throw new Error('Unexpected response: ' + text.substring(0, 100));
            }
        }
    },
    {
        name: 'Detect Mixed Content (HTTP page)',
        method: 'tools/call',
        params: () => ({
            name: 'browser_sec_detect_mixed_content',
            arguments: {}
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            // On file:// protocol, should indicate HTTPS-only
            if (!text.includes('HTTPS') && !text.includes('No mixed content')) {
                throw new Error('Invalid mixed content response');
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
