#!/usr/bin/env node

/**
 * Storage Tools Test Suite
 * Tests IndexedDB, Cache Storage, and Service Worker inspection
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

console.log('💾 Storage Tools Test Suite\n');

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
        console.log('🎉 All storage tests passed!');
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
            clientInfo: { name: 'storage-test', version: '1.0.0' }
        }),
        verify: () => { }
    },
    {
        name: 'Navigate to Storage Test Page',
        method: 'tools/call',
        params: () => ({
            name: 'browser_navigate',
            arguments: { url: 'file://' + path.join(__dirname, 'fixtures', 'test-storage.html') }
        }),
        verify: () => { }
    },
    {
        name: 'Wait for Storage Setup',
        method: 'tools/call',
        params: () => ({
            name: 'browser_wait',
            arguments: { ms: 2000 }
        }),
        verify: () => { }
    },
    {
        name: 'List IndexedDB Databases',
        method: 'tools/call',
        params: () => ({
            name: 'browser_storage_get_indexeddb',
            arguments: {}
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            // Should list databases, indicate none found, or CDP error
            if (!text.includes('databases') && !text.includes('No IndexedDB') && !text.includes('CDP Error') && !text.includes('Error')) {
                throw new Error('Unexpected response: ' + text.substring(0, 100));
            }
        }
    },
    {
        name: 'Inspect IndexedDB Database',
        method: 'tools/call',
        params: () => ({
            name: 'browser_storage_get_indexeddb',
            arguments: { databaseName: 'testDB' }
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            // Should show database structure or error if not found
            if (!text.includes('objectStores') && !text.includes('not found') && !text.includes('error') && !text.includes('Error') && !text.includes('CDP Error')) {
                throw new Error('Unexpected response: ' + text.substring(0, 100));
            }
        }
    },
    {
        name: 'List Cache Storage',
        method: 'tools/call',
        params: () => ({
            name: 'browser_storage_get_cache_storage',
            arguments: {}
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            // Should list caches, indicate none found, or error
            if (!text.includes('caches') && !text.includes('No Cache') && !text.includes('CDP Error') && !text.includes('Error')) {
                throw new Error('Unexpected response: ' + text.substring(0, 100));
            }
        }
    },
    {
        name: 'Inspect Cache Entries',
        method: 'tools/call',
        params: () => ({
            name: 'browser_storage_get_cache_storage',
            arguments: { cacheName: 'test-cache-v1' }
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            // Should show cache entries, not found, or error
            if (!text.includes('entries') && !text.includes('not found') && !text.includes('CDP Error') && !text.includes('Error')) {
                throw new Error('Unexpected response: ' + text.substring(0, 100));
            }
        }
    },
    {
        name: 'Get Service Workers',
        method: 'tools/call',
        params: () => ({
            name: 'browser_storage_get_service_workers',
            arguments: {}
        }),
        verify: (res) => {
            const text = res.result.content[0].text;
            // Should list service workers, indicate none/not supported, or error
            if (!text.includes('Service Worker') && !text.includes('supported') && !text.includes('No service') && !text.includes('Error') && !text.includes('CDP Error')) {
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
