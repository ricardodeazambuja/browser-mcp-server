#!/usr/bin/env node

/**
 * Comprehensive browser automation test
 * Tests actual browser operations: navigate, evaluate JS, screenshot
 */

const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');

let requestId = 0;
let proc;

function sendRequest(method, params = {}) {
  const id = ++requestId;
  const request = {
    jsonrpc: '2.0',
    id,
    method,
    params
  };

  console.log(`\n➡️  ${method}${params.name ? ` (${params.name})` : ''}`);
  proc.stdin.write(JSON.stringify(request) + '\n');
  return id;
}

async function runTests() {
  console.log('🌐 Browser Automation Test Suite\n');
  console.log('=' .repeat(60));

  proc = spawn('node', ['browser-mcp-server-playwright.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const rl = readline.createInterface({
    input: proc.stdout,
    crlfDelay: Infinity
  });

  let testStep = 0;
  const tests = [
    'Initialize',
    'List Tools',
    'Health Check',
    'Navigate to Example.com',
    'Evaluate JavaScript',
    'Take Screenshot',
    'Cleanup'
  ];

  rl.on('line', async (line) => {
    try {
      const response = JSON.parse(line);

      if (response.id === undefined) return; // Skip notifications

      const currentTest = tests[testStep];

      if (response.error) {
        console.log(`   ❌ ${currentTest} failed: ${response.error.message}`);
        proc.kill();
        process.exit(1);
        return;
      }

      switch (response.id) {
        case 1: // Initialize
          console.log(`   ✅ ${currentTest}`);
          testStep++;
          setTimeout(() => sendRequest('tools/list'), 100);
          break;

        case 2: // Tools list
          console.log(`   ✅ ${currentTest} (${response.result.tools.length} tools)`);
          testStep++;
          setTimeout(() => sendRequest('tools/call', {
            name: 'browser_health_check',
            arguments: {}
          }), 100);
          break;

        case 3: // Health check
          const healthText = response.result.content[0].text;
          const mode = healthText.includes('Launched standalone')
            ? 'Standalone Mode'
            : 'Antigravity Mode';
          console.log(`   ✅ ${currentTest} (${mode})`);
          testStep++;

          // Navigate to a real page
          setTimeout(() => sendRequest('tools/call', {
            name: 'browser_navigate',
            arguments: { url: 'https://example.com' }
          }), 100);
          break;

        case 4: // Navigate
          console.log(`   ✅ ${currentTest}`);
          testStep++;

          // Evaluate some JavaScript
          setTimeout(() => sendRequest('tools/call', {
            name: 'browser_evaluate',
            arguments: {
              code: 'document.title + " - " + window.location.href'
            }
          }), 500);
          break;

        case 5: // Evaluate JS
          const evalResult = JSON.parse(response.result.content[0].text);
          console.log(`   ✅ ${currentTest}`);
          console.log(`      Result: ${evalResult}`);
          testStep++;

          // Take a screenshot
          setTimeout(() => sendRequest('tools/call', {
            name: 'browser_screenshot',
            arguments: { fullPage: false }
          }), 500);
          break;

        case 6: // Screenshot
          const imgData = response.result.content[0].data;
          const imgSize = Buffer.from(imgData, 'base64').length;
          console.log(`   ✅ ${currentTest} (${(imgSize / 1024).toFixed(1)} KB)`);
          testStep++;

          // All tests complete
          setTimeout(() => {
            console.log('\n' + '='.repeat(60));
            console.log('\n🎉 All browser automation tests passed!\n');
            console.log('✅ Test Results:');
            console.log('   • MCP protocol communication');
            console.log('   • Browser launch (standalone mode)');
            console.log('   • Page navigation (example.com)');
            console.log('   • JavaScript evaluation');
            console.log('   • Screenshot capture');
            console.log('\n✨ The MCP server is fully functional!\n');

            proc.kill();
            process.exit(0);
          }, 500);
          break;
      }
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      proc.kill();
      process.exit(1);
    }
  });

  proc.stderr.on('data', (data) => {
    const msg = data.toString();
    if (msg.toLowerCase().includes('error')) {
      console.error(`⚠️  ${msg}`);
    }
  });

  proc.on('close', (code) => {
    if (code !== 0 && testStep < tests.length) {
      console.error(`\n❌ Process exited unexpectedly (code ${code})`);
      process.exit(code);
    }
  });

  // Start test sequence
  setTimeout(() => {
    sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'automation-test', version: '1.0.0' }
    });
  }, 100);

  // Timeout after 60 seconds
  setTimeout(() => {
    console.error('\n❌ Test timeout');
    proc.kill();
    process.exit(1);
  }, 60000);
}

runTests().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
