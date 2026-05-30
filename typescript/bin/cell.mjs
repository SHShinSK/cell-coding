#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
//  Cell Coding — unified `cell` CLI entry (@cell-coding/cli)
// ═══════════════════════════════════════════════════════════

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const require = createRequire(import.meta.url);
const tsxImport = require.resolve('tsx');

const scripts = {
  init: 'init.ts',
  build: 'build.ts',
  run: 'run.ts',
  inspect: 'inspect.ts',
  test: 'test.ts',
  install: 'install.ts',
  compose: 'compose.ts',
  deploy: 'deploy.ts',
  serve: 'serve.ts',
};

const [, , command, ...args] = process.argv;

if (!command || !scripts[command]) {
  console.error(`Usage · 사용법:
  cell init [project-name]
  cell install [--list] <package> [project-dir]
  cell compose --organ <package> [--project dir] [--route Source TargetOrgan]
  cell deploy [--out dir] <file.cell>
  cell serve  (CELL_PROGRAM, CELL_ORGAN, CELL_PORT env)
  cell build [--stdout] [--out dir] [--transpiled] <file.cell>
  cell run [--json] [--transpiled] [--functions path] [--jaeger url] [--watch] [--out path] <file.cell> <SignalType> '<json>'
  cell inspect [--json] <file.cell> [target]
  cell test [--json] [--coverage] <file.cell> [target]

Examples · 예:
  npx @cell-coding/cli run ../examples/motion-alarm/motion-alarm.cell MotionDetected '{"x":1,"y":2,"confidence":0.9}'
  npx @cell-coding/cli run --transpiled ../examples/validator.cell RawInput '{"payload":"hello"}'
  cell install @community/auth-organ ./my-bot`);
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ['--import', tsxImport, join(root, scripts[command]), ...args],
  { cwd: root, stdio: 'inherit', windowsHide: true },
);

process.exit(result.status ?? 1);
