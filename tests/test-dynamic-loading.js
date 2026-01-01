#!/usr/bin/env node

/**
 * Test for Dynamic Module Loading and Minimalist Core
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
  proc.stdin.write(JSON.stringify(request) + '\n');
  return id;
}

async function runTests() {
  console.log('🧪 Dynamic Module Loading Test\n');

  const serverPath = path.join(__dirname, '..', 'src', 'index.js');
  proc = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const rl = readline.createInterface({
    input: proc.stdout,
    crlfDelay: Infinity
  });

  let step = 0;

  rl.on('line', (line) => {
    try {
      const msg = JSON.parse(line);

      // Handle Notifications
      if (msg.method === 'notifications/tools/list_changed') {
        console.log('   🔔 Received: notifications/tools/list_changed');
        // Client should re-request tools list
        setTimeout(() => sendRequest('tools/list'), 100);
        return;
      }

      if (msg.id === undefined) return;

      console.log(`\n➡️  Step ${step}: Response for id=${msg.id}`);

      switch (step) {
        case 0: // Initialize
          console.log('   ✅ Server Initialized');
          step++;
          sendRequest('tools/list');
          break;

        case 1: // First tool list (Core)
          const tools = msg.result.tools;
          console.log(`   ✅ Received ${tools.length} tools (Expected: ~6)`);
          tools.forEach(t => console.log(`      • ${t.name}`));
          
          if (tools.length > 10) {
            console.error('   ❌ Error: Too many tools in core!');
            process.exit(1);
          }
          
          step++;
          console.log('\n🚀 Loading "network" module...');
          sendRequest('tools/call', {
            name: 'browser_manage_modules',
            arguments: { action: 'load', module: 'network' }
          });
          break;

        case 2: // Load response
          console.log(`   ✅ Load Result: ${msg.result.content[0].text}`);
          // Wait for the tools/list re-fetch triggered by notification (id 4)
          step++;
          break;

        case 3: // Tool list after load
          const newTools = msg.result.tools;
          console.log(`   ✅ Received ${newTools.length} tools after load`);
          const hasNet = newTools.some(t => t.name === 'browser_net_start_monitoring');
          if (hasNet) {
            console.log('   ✅ Network tools are now present!');
          } else {
            console.error('   ❌ Error: Network tools missing after load!');
            process.exit(1);
          }
          
          step++;
          console.log('\n🚀 Unloading "network" module...');
          sendRequest('tools/call', {
            name: 'browser_manage_modules',
            arguments: { action: 'unload', module: 'network' }
          });
          break;

        case 4: // Unload response
          console.log(`   ✅ Unload Result: ${msg.result.content[0].text}`);
          // Notification will trigger tools/list (id 7)
          step++;
          break;

        case 5: // Tool list after unload
          const finalTools = msg.result.tools;
          console.log(`   ✅ Received ${finalTools.length} tools after unload`);
          const hasNetFinal = finalTools.some(t => t.name === 'browser_net_start_monitoring');
          if (!hasNetFinal) {
            console.log('   ✅ Network tools successfully removed!');
          } else {
            console.error('   ❌ Error: Network tools still present after unload!');
            process.exit(1);
          }

          console.log('\n🎉 Dynamic loading tests passed!');
          proc.kill();
          process.exit(0);
          break;
      }
    } catch (err) {
      console.error('Error:', err);
    }
  });

  // Start sequence
  sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test', version: '1.0.0' }
  });

  setTimeout(() => {
    console.error('Timeout!');
    proc.kill();
    process.exit(1);
  }, 10000);
}

runTests();
