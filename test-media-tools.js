const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

// Start the server
const serverPath = path.join(__dirname, 'browser-mcp-server-playwright.js');
console.log(`Launching server: ${serverPath}`);

const proc = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
});

proc.stderr.on('data', (data) => {
    console.log(`[SERVER STDERR] ${data.toString()}`);
});

proc.on('error', (err) => {
    console.error('[SERVER ERROR]', err);
});

proc.on('close', (code) => {
    console.log(`[SERVER EXITED] code ${code}`);
});

const rl = readline.createInterface({
    input: proc.stdout,
    terminal: false
});

let messageId = 1;
let testStep = 0;

function sendRequest(method, params) {
    const request = {
        jsonrpc: '2.0',
        id: messageId++,
        method,
        params
    };
    const str = JSON.stringify(request) + '\n';
    console.log(`[SENDING] ${method}`); // Debug log
    proc.stdin.write(str);
}

console.log('🌐 Media Awareness Test Suite');
console.log('============================================================\n');

rl.on('line', (line) => {
    // console.log(`[RECEIVED] ${line}`); // Verbose debug
    try {
        const response = JSON.parse(line);

        // Log helpful messages
        if (response.method === 'notifications/resources/list_changed') return;
        if (response.error) {
            console.error('❌ Error response:', JSON.stringify(response.error, null, 2));
            process.exit(1);
        }

        if (response.result && response.id) {
            handleResponse(response);
        }
    } catch (e) {
        if (!line.startsWith('{')) console.log(`[SERVER LOG] ${line}`);
    }
});

function handleResponse(response) {
    const currentTest = steps[testStep];

    if (currentTest) {
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
            const nextTest = steps[testStep];
            setTimeout(() => {
                sendRequest(nextTest.method, nextTest.params());
            }, 500);
        } else {
            console.log('🎉 All media tests passed!');
            proc.kill();
            process.exit(0);
        }
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
        name: 'Start Console Capture',
        method: 'tools/call',
        params: () => ({
            name: 'browser_console_start',
            arguments: {}
        }),
        verify: () => { }
    },
    {
        name: 'Navigate to Local Media Test',
        method: 'tools/call',

        params: () => ({
            name: 'browser_navigate',
            arguments: { url: 'file://' + path.join(__dirname, 'test-media.html') }
        }),
        verify: () => { }
    },
    {
        name: 'Wait for Audio Element',
        method: 'tools/call',
        params: () => ({
            name: 'browser_wait_for_selector',
            arguments: { selector: 'audio', timeout: 30000 }
        }),
        verify: () => { }
    },
    {
        name: 'Get Initial Media Summary',
        method: 'tools/call',
        params: () => ({
            name: 'browser_get_media_summary',
            arguments: {}
        }),
        verify: (res) => {
            const summary = JSON.parse(res.result.content[0].text);
            console.log('      Found media elements:', summary.length);
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
        name: 'Wait for Audio',
        method: 'tools/call',
        params: () => ({
            name: 'browser_wait',
            arguments: { ms: 2000 }
        }),
        verify: () => { }
    },
    {
        name: 'Analyze Audio',
        method: 'tools/call',
        params: () => ({
            name: 'browser_get_audio_analysis',
            arguments: { durationMs: 1000 }
        }),
        verify: (res) => {
            const analysis = JSON.parse(res.result.content[0].text);
            console.log('      Analysis:', analysis);
            if (typeof analysis.averageVolume !== 'number') throw new Error('Invalid analysis format');
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

// Start first test
console.log('Starting tests...');
setTimeout(() => {
    sendRequest(steps[0].method, steps[0].params());
}, 1000);
