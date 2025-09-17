#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 LottoDrop TypeScript Fix Script');
console.log('=====================================\n');

// 1. Clean TypeScript build cache
console.log('1. Cleaning TypeScript build cache...');
try {
  const tsBuilds = [
    'node_modules/.tmp',
    'tsconfig.tsbuildinfo',
    'tsconfig.app.tsbuildinfo'
  ];
  
  tsBuilds.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`   ✓ Removed ${file}`);
    }
  });
} catch (error) {
  console.log(`   ⚠ Warning: ${error.message}`);
}

// 2. Clear npm cache
console.log('\n2. Clearing npm cache...');
try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('   ✓ npm cache cleared');
} catch (error) {
  console.log('   ⚠ npm cache clean failed, continuing...');
}

// 3. Reinstall node_modules to ensure type consistency
console.log('\n3. Ensuring consistent dependencies...');
try {
  execSync('npm ci', { stdio: 'inherit' });
  console.log('   ✓ Dependencies reinstalled');
} catch (error) {
  console.log('   ⚠ npm ci failed, trying npm install...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('   ✓ Dependencies installed');
  } catch (installError) {
    console.log('   ❌ Dependency installation failed');
  }
}

// 4. Run TypeScript check
console.log('\n4. Running TypeScript validation...');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('   ✓ TypeScript validation passed');
} catch (error) {
  console.log('   ❌ TypeScript validation failed - check output above');
}

// 5. Generate VS Code restart instructions
console.log('\n5. Final Steps:');
console.log('   📝 Please follow these steps in VS Code:');
console.log('   1. Press Cmd/Ctrl + Shift + P');
console.log('   2. Type "TypeScript: Restart TS Server"');
console.log('   3. Press Enter');
console.log('   4. Wait for the TypeScript service to restart');
console.log('   5. Check that all errors are resolved');

console.log('\n✅ TypeScript fix script completed!');
console.log('🎯 Your development environment should now be error-free.');