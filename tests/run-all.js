#!/usr/bin/env node

/**
 * Main Test Runner
 * Runs all test files in the tests directory
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const testsDir = __dirname;
const testFiles = fs.readdirSync(testsDir)
    .filter(f => f.startsWith('test-') && f.endsWith('.js'))
    .sort();

console.log('🚀 Running all Browser MCP Server tests...\n');

let passed = 0;
let failed = 0;

testFiles.forEach(file => {
    console.log(`\n------------------------------------------------------------`);
    console.log(`📄 Testing: ${file}`);
    console.log(`------------------------------------------------------------\n`);

    const result = spawnSync('node', [path.join(testsDir, file)], {
        stdio: 'inherit'
    });

    if (result.status === 0) {
        passed++;
    } else {
        failed++;
        console.error(`\n❌ ${file} failed with exit code ${result.status}`);
    }
});

console.log(`\n\n${'='.repeat(60)}`);
console.log(`📊 Final Test Summary:`);
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`${'='.repeat(60)}\n`);

if (failed > 0) {
    process.exit(1);
} else {
    console.log('🎉 All test suites passed successfully!\n');
    process.exit(0);
}
