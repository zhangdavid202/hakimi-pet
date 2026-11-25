import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distSharedPath = path.join(rootDir, 'dist', 'shared', 'index.js');

if (!fs.existsSync(distSharedPath)) {
  console.error('Missing build output. Run `npm run build` first.');
  process.exit(1);
}

const { DEFAULT_CONFIG, parseConfig, buildDshPetPackConfig } = await import(
  pathToFileUrlCompat(distSharedPath)
);

function pathToFileUrlCompat(p) {
  return new URL(`file:///${p.replace(/\\/g, '/')}`).href;
}

const configPath = path.join(rootDir, 'assets', 'config.jsonc');
const appConfig = fs.existsSync(configPath)
  ? parseConfig(fs.readFileSync(configPath, 'utf8'))
  : DEFAULT_CONFIG;

const packDir = path.join(rootDir, 'dsh-pet-pack');
const memesDir = path.join(packDir, 'hakimi-memes');
const webmDir = path.join(packDir, 'hakimi-animation', 'webm');

fs.mkdirSync(memesDir, { recursive: true });
fs.mkdirSync(webmDir, { recursive: true });

const speciesCfg = buildDshPetPackConfig(appConfig);
fs.writeFileSync(
  path.join(packDir, 'hakimi-config.json'),
  JSON.stringify(speciesCfg, null, 2) + '\n',
  'utf8',
);

const srcMemes = path.join(rootDir, 'assets', 'memes');
if (fs.existsSync(srcMemes)) {
  for (const file of fs.readdirSync(srcMemes)) {
    if (file.toLowerCase().endsWith('.png')) {
      fs.copyFileSync(path.join(srcMemes, file), path.join(memesDir, file));
    }
  }
}

const srcWebm = path.join(rootDir, 'assets', 'webm');
if (fs.existsSync(srcWebm)) {
  for (const file of fs.readdirSync(srcWebm)) {
    if (file.toLowerCase().endsWith('.webm')) {
      fs.copyFileSync(path.join(srcWebm, file), path.join(webmDir, file));
    }
  }
}

console.log(`Exported dsh-pet compatible pack to: ${packDir}`);
