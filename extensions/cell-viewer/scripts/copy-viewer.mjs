// ═══════════════════════════════════════════════════════════
//  Copy viewer-react/dist → extensions/cell-viewer/media/viewer
//  viewer-react 빌드 결과를 VS Code 확장 media에 복사
// ═══════════════════════════════════════════════════════════

import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const extRoot = join(__dirname, '..');
const src = join(extRoot, '../../viewer-react/dist');
const dest = join(extRoot, 'media/viewer');

if (!existsSync(src)) {
  console.error('viewer-react/dist not found — run: cd viewer-react && npm run build');
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`Copied ${src.replace(/\\/g, '/')} → ${dest.replace(/\\/g, '/')}`);
