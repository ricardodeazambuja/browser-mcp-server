const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

// Start the server
const serverPath = path.join(__dirname, 'browser-mcp-server-playwright.js');
const proc = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
});

proc.stderr.on('data', d => console.log('STDERR:', d.toString()));

const rl = readline.createInterface({
    input: proc.stdout,
    terminal: false
});

let messageId = 1;

function sendRequest(method, params) {
    const request = {
        jsonrpc: '2.0',
        id: messageId++,
        method,
        params
    };
    proc.stdin.write(JSON.stringify(request) + '\n');
}

rl.on('line', (line) => {
    try {
        const res = JSON.parse(line);
        if (res.result) {
            console.log('Response:', JSON.stringify(res, null, 2));
            if (res.id === 2) { // Navigate
                console.log('Navigation successful, closing...');
                process.exit(0);
            }
        }
        if (res.error) {
            console.error('Error:', res.error);
            process.exit(1);
        }
    } catch (e) { }
});

// Init
sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test', version: '1.0' }
});

// Navigate after init
setTimeout(() => {
    console.log('Navigating...');
    sendRequest('tools/call', {
        name: 'browser_navigate',
        arguments: { url: 'https://example.com' } // Simple test first
    });
}, 1000);
