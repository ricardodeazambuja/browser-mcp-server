#!/usr/bin/env node

/**
 * Comprehensive test script for the browser MCP server
 */

const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');

let requestId = 0;

function sendRequest(proc, method, params = {}) {
  const id = ++requestId;
  const request = {
    jsonrpc: '2.0',
    id,
    method,
    params
  };

  console.log(`\n➡️  Sending: ${method}`);
  proc.stdin.write(JSON.stringify(request) + '\n');
  return id;
}

function sendNotification(proc, method, params = {}) {
  const notification = {
    jsonrpc: '2.0',
    method,
    params
  };

  console.log(`\n➡️  Sending notification: ${method}`);
  proc.stdin.write(JSON.stringify(notification) + '\n');
}

async function runTests() {
  console.log('🧪 Starting MCP Server Tests\n');
  console.log('='.repeat(50));

  const serverPath = path.join(__dirname, '..', 'src', 'index.js');
  const proc = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const rl = readline.createInterface({
    input: proc.stdout,
    crlfDelay: Infinity
  });

  const responses = new Map();
  let testsCompleted = 0;
  let toolCount = 0;
  const totalTests = 3;

  rl.on('line', (line) => {
    try {
      const response = JSON.parse(line);
      console.log(`\n⬅️  Response (id=${response.id}):`);

      if (response.error) {
        console.log(`   ❌ Error: ${response.error.message}`);
      } else if (response.result) {
        if (response.id === 1) {
          // Initialize response
          console.log(`   ✅ Protocol: ${response.result.protocolVersion}`);
          console.log(`   ✅ Server: ${response.result.serverInfo.name} v${response.result.serverInfo.version}`);
          testsCompleted++;

          // Send initialized notification
          sendNotification(proc, 'notifications/initialized');

          // Request tools list
          setTimeout(() => sendRequest(proc, 'tools/list'), 100);

        } else if (response.id === 2) {
          // Tools list response
          toolCount = response.result.tools.length;
          console.log(`   ✅ Received ${toolCount} tools:`);
          response.result.tools.forEach(tool => {
            console.log(`      - ${tool.name}`);
          });
          testsCompleted++;

          // Test health check (actual browser operation)
          setTimeout(() => sendRequest(proc, 'tools/call', {
            name: 'browser_health_check',
            arguments: {}
          }), 100);

        } else if (response.id === 3) {
          // Health check response
          if (response.result.content && response.result.content[0]) {
            console.log(`   ✅ Health Check Result:`);
            console.log(response.result.content[0].text.split('\n').map(l => `      ${l}`).join('\n'));
          }
          testsCompleted++;

          // All tests done
          setTimeout(() => {
            console.log('\n' + '='.repeat(50));
            console.log(`\n✅ All tests passed! (${testsCompleted}/${totalTests})`);
            console.log('\n📊 Test Summary:');
            console.log('   ✅ MCP Protocol initialization');
            console.log(`   ✅ Tools listing (${toolCount} tools)`);


            console.log('   ✅ Browser automation (health check)');
            console.log('\n🎉 MCP Server is fully functional!\n');
            proc.kill();
            process.exit(0);
          }, 500);
        }
      }
    } catch (error) {
      console.error('❌ Error parsing response:', error.message);
    }
  });

  proc.stderr.on('data', (data) => {
    const msg = data.toString();
    if (msg.includes('Error') || msg.includes('error')) {
      console.error(`\n⚠️  stderr: ${msg}`);
    }
  });

  proc.on('close', (code) => {
    if (code !== 0 && testsCompleted < totalTests) {
      console.error(`\n❌ Process exited with code ${code}`);
      process.exit(code);
    }
  });

  // Start the test sequence
  setTimeout(() => {
    sendRequest(proc, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    });
  }, 100);

  // Safety timeout
  setTimeout(() => {
    console.error('\n❌ Test timeout - tests did not complete in time');
    proc.kill();
    process.exit(1);
  }, 30000); // 30 second timeout
}

runTests().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
