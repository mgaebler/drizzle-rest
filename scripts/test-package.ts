#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

const testDir = '/tmp/drizzle-rest-package-test';
const packageFile = execSync('ls drizzle-rest-adapter-*.tgz', { encoding: 'utf8' }).trim();

try {
    console.log('🧪 Testing package installation...');

    // Clean up previous test
    try { rmSync(testDir, { recursive: true }); } catch {
        // Ignore if directory doesn't exist
    }
    mkdirSync(testDir, { recursive: true });

    // Create test package.json
    const testPackageJson = {
        name: 'package-test',
        version: '1.0.0',
        type: 'module',
        main: 'test.js'
    };

    writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify(testPackageJson, null, 2)
    );

    // Create test file
    const testContent = `
import { createExpressDrizzleRestAdapter } from 'drizzle-rest-adapter';

console.log('✅ Import successful');
console.log('✅ Function type:', typeof createExpressDrizzleRestAdapter);

// Test that function exists and throws without proper options
try {
    createExpressDrizzleRestAdapter();
} catch (error) {
    console.log('✅ Function validates parameters correctly');
}

console.log('🎉 Package test passed!');
`;

    writeFileSync(join(testDir, 'test.js'), testContent);

    // Install dependencies and test
    execSync('npm install tsx', { cwd: testDir, stdio: 'inherit' });
    execSync(`npm install ${process.cwd()}/${packageFile}`, { cwd: testDir, stdio: 'inherit' });
    execSync('npx tsx test.js', { cwd: testDir, stdio: 'inherit' });

    console.log('✅ Package test completed successfully!');

    // Cleanup
    rmSync(testDir, { recursive: true });
    rmSync(packageFile);

} catch (error) {
    console.error('❌ Package test failed:', error.message);
    process.exit(1);
}