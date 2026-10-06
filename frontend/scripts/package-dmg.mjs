// Create a plain drag-to-Applications DMG without Finder automation.
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(resolve(frontend, 'src-tauri/tauri.conf.json'), 'utf8'));
const triple = process.env.TAURI_ENV_TARGET_TRIPLE;
const bundle = resolve(frontend, 'src-tauri/target', triple || '', 'release/bundle');
const stage = mkdtempSync(resolve(tmpdir(), 'salubrity-dmg-'));
try {
  cpSync(resolve(bundle, 'macos/Salubrity.app'), resolve(stage, 'Salubrity.app'), { recursive: true });
  symlinkSync('/Applications', resolve(stage, 'Applications'));
  const output = resolve(bundle, 'dmg'); mkdirSync(output, { recursive: true });
  const file = resolve(output, `Salubrity_${config.version}_${triple?.startsWith('x86_64') ? 'x64' : process.arch}.dmg`);
  const result = spawnSync('/usr/bin/hdiutil', ['create', '-volname', 'Salubrity', '-srcfolder', stage, '-ov', '-format', 'UDZO', file], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status || 1;
  else {
    const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
    writeFileSync(file+'.sha256', `${hash}  ${file.split('/').pop()}\n`);
    console.log(`Created ${file}`);
  }
} finally { rmSync(stage, { recursive: true, force: true }); }
