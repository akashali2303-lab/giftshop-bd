const fs = require('fs');
const { execSync } = require('child_process');

console.log('--- Adding Vite Client Type Definitions to client/ and admin/ ---');

// 1. Create client/src/vite-env.d.ts
fs.writeFileSync('client/src/vite-env.d.ts', '/// <reference types="vite/client" />\n', 'utf8');
console.log('[Created] client/src/vite-env.d.ts');

// 2. Create admin/src/vite-env.d.ts
fs.writeFileSync('admin/src/vite-env.d.ts', '/// <reference types="vite/client" />\n', 'utf8');
console.log('[Created] admin/src/vite-env.d.ts');

// 3. Update tsconfig files to explicitly load vite/client types
for (const dir of ['client', 'admin']) {
  const tsconfigPath = `${dir}/tsconfig.json`;
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  tsconfig.compilerOptions.types = ['vite/client'];
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2), 'utf8');
  console.log(`[Updated] ${tsconfigPath}`);
}

console.log('--- Compiling Client Production Build ---');
execSync('npm --prefix client run build', { stdio: 'inherit' });

console.log('--- Compiling Admin Production Build ---');
execSync('npm --prefix admin run build', { stdio: 'inherit' });

console.log('==========================================================');
console.log(' ALL BUILDS PASSED WITH ZERO ERRORS!                      ');
console.log(' You are now ready to commit and push to GitHub.          ');
console.log('==========================================================');
