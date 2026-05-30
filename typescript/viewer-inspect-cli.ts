// ═══════════════════════════════════════════════════════════
//  Cell Coding — inspect viewer JSON CLI (VS Code / tooling)
//  Usage · 사용법: tsx viewer-inspect-cli.ts <file.cell>
// ═══════════════════════════════════════════════════════════

import { resolve } from 'node:path';
import { buildInspectViewerPayload } from './viewer-inspect-payload.js';

const file = process.argv[2];
if (!file) {
  console.error('Usage · 사용법: viewer-inspect-cli.ts <file.cell>');
  process.exit(1);
}

try {
  const payload = buildInspectViewerPayload({ file: resolve(process.cwd(), file) });
  console.log(JSON.stringify(payload));
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}
