#!/usr/bin/env node

/**
 * Media Awareness Test Suite
 * Tests browser_get_media_summary, browser_control_media, browser_get_audio_analysis
 */

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

const serverPath = path.join(__dirname, '..', 'src', 'index.js');
const proc = spawn('node', [serverPath], { stdio: ['pipe', 'pipe', 'pipe'] });

proc.stderr.on('data', (data) => {
    console.error(data.toString().trim());
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

console.log('🌐 Media Awareness Test Suite\n');

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
        console.log('🎉 All media tests passed!');
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
            clientInfo: { name: 'test-suite', version: '1.0.0' }
        }),
        verify: () => { }
    },
    {
        name: 'Navigate to Local Media Test',
        method: 'tools/call',
        params: () => ({
            name: 'browser_navigate',
            arguments: { url: 'file://' + path.join(__dirname, 'fixtures', 'test-media.html') }
        }),
        verify: () => { }
    },
    {
        name: 'Wait for Audio Element',
        method: 'tools/call',
        params: () => ({
            name: 'browser_wait_for_selector',
            arguments: { selector: 'audio', timeout: 10000 }
        }),
        verify: () => { }
    },
    {
        name: 'Get Media Summary',
        method: 'tools/call',
        params: () => ({
            name: 'browser_get_media_summary',
            arguments: {}
        }),
        verify: (res) => {
            const summary = JSON.parse(res.result.content[0].text);
            console.log(`      Found ${summary.length} media element(s)`);
            if (!Array.isArray(summary)) throw new Error('Result is not an array');
        }
    },
    {
        name: 'Play Media',
        method: 'tools/call',
        params: () => ({
            name: 'browser_control_media',
            arguments: { selector: 'audio', action: 'play' }
        }),
        verify: (res) => {
            const result = JSON.parse(res.result.content[0].text);
            if (result.status !== 'playing') throw new Error('Failed to play');
        }
    },
    {
        name: 'Wait for Playback',
        method: 'tools/call',
        params: () => ({
            name: 'browser_wait',
            arguments: { ms: 1000 }
        }),
        verify: () => { }
    },
    {
        name: 'Analyze Audio',
        method: 'tools/call',
        params: () => ({
            name: 'browser_get_audio_analysis',
            arguments: { durationMs: 500 }
        }),
        verify: (res) => {
            const analysis = JSON.parse(res.result.content[0].text);
            if (typeof analysis.averageVolume !== 'number') throw new Error('Invalid analysis');
        }
    },
    {
        name: 'Pause Media',
        method: 'tools/call',
        params: () => ({
            name: 'browser_control_media',
            arguments: { selector: 'audio', action: 'pause' }
        }),
        verify: (res) => {
            const result = JSON.parse(res.result.content[0].text);
            if (result.status !== 'paused') throw new Error('Failed to pause');
        }
    }
];

// Start tests
setTimeout(() => sendRequest(steps[0].method, steps[0].params()), 500);
