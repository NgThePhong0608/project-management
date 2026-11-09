/**
 * Node.js script to package each Lambda function with shared modules into deployable zip archives.
 *
 * Usage:
 *   node lambda/scripts/package.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LAMBDA_ROOT = path.resolve(__dirname, '..');
const FUNCTIONS_DIR = path.join(LAMBDA_ROOT, 'functions');
const SHARED_DIR = path.join(LAMBDA_ROOT, 'shared');
const DIST_DIR = path.join(LAMBDA_ROOT, 'dist');

function packageFunctions() {
  console.log('==> Preparing dist directory:', DIST_DIR);
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  const functions = fs.readdirSync(FUNCTIONS_DIR).filter((file) => {
    return fs.statSync(path.join(FUNCTIONS_DIR, file)).isDirectory();
  });

  console.log(`==> Found ${functions.length} functions: ${functions.join(', ')}`);

  for (const funcName of functions) {
    const funcDir = path.join(FUNCTIONS_DIR, funcName);
    const zipPath = path.join(DIST_DIR, `${funcName}.zip`);

    console.log(`\n==> Packaging [${funcName}]...`);

    const tempDir = fs.mkdtempSync(path.join(DIST_DIR, `temp-${funcName}-`));

    try {
      // 1. Copy function files and align shared import paths for ZIP root layout
      copyDirRecursive(funcDir, tempDir);
      const rootIndex = path.join(tempDir, 'index.js');
      if (fs.existsSync(rootIndex)) {
        const content = fs.readFileSync(rootIndex, 'utf8').replace(/\.\.\/\.\.\/shared\//g, './shared/');
        fs.writeFileSync(rootIndex, content, 'utf8');
      }

      // 2. Copy shared utilities to tempDir/shared
      const destSharedDir = path.join(tempDir, 'shared');
      if (fs.existsSync(SHARED_DIR)) {
        copyDirRecursive(SHARED_DIR, destSharedDir);
      }

      // 3. Install production dependencies targeting Linux Lambda runtime
      const pkgPath = path.join(tempDir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const targetCpu = process.env.LAMBDA_ARCH || 'x64';
        console.log(`    Installing production dependencies for ${funcName} (linux/${targetCpu})...`);
        execSync(`npm install --omit=dev --os=linux --cpu=${targetCpu} --silent`, {
          cwd: tempDir,
          stdio: 'ignore',
        });
      }

      // 4. Create ZIP archive
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }

      execSync(`zip -q -r "${zipPath}" .`, {
        cwd: tempDir,
        stdio: 'inherit',
      });

      const stats = fs.statSync(zipPath);
      const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`    Successfully packaged: ${zipPath} (${sizeMb} MB)`);
    } catch (err) {
      console.error(`    [Error] Failed packaging ${funcName}:`, err.message);
    } finally {
      // Cleanup temp folder
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  console.log('\n==> Packaging complete! Artifacts located in:', DIST_DIR);
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') {
        copyDirRecursive(srcPath, destPath);
      }
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (require.main === module) {
  packageFunctions();
}

module.exports = {
  packageFunctions,
};

