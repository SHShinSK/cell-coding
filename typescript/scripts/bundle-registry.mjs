#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
//  npm publish 전 registry 번들 복사
//  monorepo ../registry → typescript/registry
// ═══════════════════════════════════════════════════════════

import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, '..');
const src = join(pkgRoot, '..', 'registry');
const dest = join(pkgRoot, 'registry');

if (!existsSync(src)) {
  console.error('Source registry not found · registry 소스 없음:', src);
  process.exit(1);
}

if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`Bundled registry → ${dest.replace(/\\/g, '/')}`);
