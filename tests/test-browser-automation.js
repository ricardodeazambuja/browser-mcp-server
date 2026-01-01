#!/usr/bin/env node

/**
 * Comprehensive browser automation test
 */

const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');

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

  console.log(`\n➡️  Sending: ${method}${params.name ? ` (${params.name})` : ''}`);
  proc.stdin.write(JSON.stringify(request) + '\n');
  return id;
}

async function runTests() {
  console.log('🌐 Browser Automation Test Suite\n');
  console.log('='.repeat(60));

  const serverPath = path.join(__dirname, '..', 'src', 'index.js');
  proc = spawn('node', [serverPath], {
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
    'Load Modules',
    'Health Check',
    'Navigate to Local Page',
    'Evaluate JavaScript',
    'Take Screenshot',
    'Open New Page',
    'List Pages',
    'Wait',
    'Cleanup'
  ];

  rl.on('line', async (line) => {
    try {
      const response = JSON.parse(line);
      if (response.id === undefined) return;

      const currentTest = tests[testStep];

      if (response.error) {
        console.log(`   ❌ ${currentTest} failed: ${response.error.message}`);
        proc.kill();
        process.exit(1);
        return;
      }

      if (response.result && response.result.content && response.result.content[0] && response.result.content[0].text && response.result.content[0].text.startsWith('❌')) {
          console.log(`   ❌ ${currentTest} failed with app error: ${response.result.content[0].text}`);
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
            name: 'browser_manage_modules',
            arguments: { action: 'load', module: 'advanced' }
          }), 100);
          break;

        case 3: // Load advanced
          console.log('   ✅ Load Advanced module');
          setTimeout(() => sendRequest('tools/call', {
            name: 'browser_manage_modules',
            arguments: { action: 'load', module: 'tabs' }
          }), 100);
          break;

        case 4: // Load tabs
          console.log('   ✅ Load Tabs module');
          testStep++; // 'Load Modules' complete
          setTimeout(() => sendRequest('tools/call', {
            name: 'browser_health_check',
            arguments: {}
          }), 100);
          break;

        case 5: // Health check
          const healthText = response.result.content[0].text;
          const mode = healthText.includes('Standalone') ? 'Standalone Mode' : 'Antigravity Mode';
          console.log(`   ✅ ${tests[testStep]} (${mode})`);
          testStep++;

          const testPage = 'file://' + path.join(__dirname, 'fixtures', 'test-network.html');
          setTimeout(() => sendRequest('tools/call', {
            name: 'browser_navigate',
            arguments: { url: testPage }
          }), 100);
          break;

        case 6: // Navigate
          console.log(`   ✅ ${tests[testStep]}`);
          testStep++;
          setTimeout(() => sendRequest('tools/call', {
            name: 'browser_evaluate',
            arguments: { code: 'document.title' }
          }), 500);
          break;

        case 7: // Evaluate JS
          console.log(`   ✅ ${tests[testStep]}`);
          testStep++;
          setTimeout(() => sendRequest('tools/call', {
            name: 'browser_screenshot',
            arguments: { fullPage: false }
          }), 500);
          break;

        case 8: // Screenshot
          console.log(`   ✅ ${tests[testStep]}`);
          testStep++;
          setTimeout(() => sendRequest('tools/call', {
            name: 'browser_new_page',
            arguments: { url: 'about:blank' }
          }), 100);
          break;

        case 9: // New Page
          console.log(`   ✅ ${tests[testStep]}`);
          testStep++;
          setTimeout(() => sendRequest('tools/call', {
            name: 'browser_list_pages',
            arguments: {}
          }), 100);
          break;

        case 10: // List Pages
          console.log(`   ✅ ${tests[testStep]}`);
          testStep++;
          setTimeout(() => sendRequest('tools/call', {
            name: 'browser_wait',
            arguments: { ms: 500 }
          }), 100);
          break;

        case 11: // Wait
          console.log(`   ✅ ${tests[testStep]}`);
          testStep++;
          setTimeout(() => {
            console.log('\n' + '='.repeat(60));
            console.log('\n🎉 All browser automation tests passed!\n');
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

  // Start test sequence
  setTimeout(() => {
    sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'automation-test', version: '1.0.0' }
    });
  }, 100);

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