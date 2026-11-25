import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

function resolveElectronBinary() {
  try {
    const electronPath = require('electron');
    if (typeof electronPath === 'string' && fs.existsSync(electronPath)) {
      return electronPath;
    }
  } catch {
    // Fall through to cached/local Electron binaries (e.g. when npm install-scripts were skipped)
  }

  const candidates = [
    process.env.ELECTRON_PATH,
    process.env.DSH_PET_ELECTRON_PATH,
    path.join(os.homedir(), '.dsh', 'electron', process.platform === 'win32' ? 'electron.exe' : 'electron'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  console.error(
    'Electron binary not found. Run `npm install-scripts approve electron` or set ELECTRON_PATH.',
  );
  process.exit(1);
}

const binary = resolveElectronBinary();
const child = spawn(binary, ['.', ...process.argv.slice(2)], {
  cwd: rootDir,
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
