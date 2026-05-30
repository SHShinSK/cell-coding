// ═══════════════════════════════════════════════════════════
//  Cell Coding — cell init CLI (Phase 3)
//  Usage · 사용법:
//    npm run cell:init -- [project-name]
// ═══════════════════════════════════════════════════════════

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_NAME = 'my-organism';

const MAIN_CELL = `signal Ping {
  tag: String;
}

signal Pong {
  tag: String;
}

cell EchoCell {
  role: "Echo demo · 에코 데모";

  membrane {
    accepts: Ping;
    emits: Pong;
  }

  on(Ping p) {
    emit Pong(tag: p.tag);
  }
}

tissue EchoTissue {
  flow linear {
    EchoCell
  }
}

organ EchoOrgan {
  tissues { EchoTissue }
  exports { Pong }
}

organism EchoOrganism {
  organs { EchoOrgan }
}
`;

const CELLTEST = `{
  "version": 1,
  "suites": [
    {
      "name": "EchoCell isolation · 에코 격리",
      "target": "EchoCell",
      "cases": [
        {
          "name": "ping to pong",
          "inject": { "type": "Ping", "data": { "tag": "hello" } },
          "expect": [
            { "kind": "trace", "from": "EchoCell", "signal": "Pong", "data": { "tag": "hello" } }
          ]
        }
      ]
    },
    {
      "name": "EchoTissue integration · 조직 연쇄",
      "target": "EchoTissue",
      "cases": [
        {
          "name": "tissue cascade",
          "inject": { "type": "Ping", "data": { "tag": "lab" } },
          "expect": [
            { "kind": "trace", "signal": "Pong" },
            { "kind": "count", "signal": "Pong", "count": 1 }
          ]
        }
      ]
    }
  ]
}
`;

const CONFIG = (name: string) => `{
  "version": 1,
  "name": "${name}",
  "entry": "cells/main.cell",
  "vendorDir": "vendor",
  "dependencies": {}
}
`;

const README = (name: string) => `# ${name}

Cell Coding starter project · Cell Coding 시작 프로젝트

\`\`\`bash
cd typescript
npm run cell:inspect -- ../${name}/cells/main.cell
npm run cell:build -- ../${name}/cells/main.cell
npm run cell:run -- ../${name}/cells/main.cell Ping '{"tag":"hello"}'
npm run cell:test -- ../${name}/cells/main.cell EchoTissue
npm run cell:install -- @community/auth-organ ../${name}
npm run cell:compose -- --organ @community/auth-organ --project ../${name}
npm run cell:deploy -- ../${name}/cells/main.composed.cell
\`\`\`
`;

function main(): void {
  const name = process.argv[2]?.trim() || DEFAULT_NAME;
  const root = resolve(process.cwd(), name);

  if (existsSync(root)) {
    console.error(`Directory already exists · 디렉터리가 이미 있습니다: ${root}`);
    process.exit(1);
  }

  const cellsDir = resolve(root, 'cells');
  mkdirSync(cellsDir, { recursive: true });

  writeFileSync(resolve(cellsDir, 'main.cell'), MAIN_CELL, 'utf-8');
  writeFileSync(resolve(cellsDir, 'main.celltest.json'), CELLTEST, 'utf-8');
  writeFileSync(resolve(root, 'cell.config.json'), CONFIG(name), 'utf-8');
  writeFileSync(resolve(root, 'README.md'), README(name), 'utf-8');

  console.log(`Created ${name}/`);
  console.log('  cells/main.cell');
  console.log('  cells/main.celltest.json');
  console.log('  cell.config.json');
  console.log('  README.md');
  console.log('');
  console.log('Next · 다음:');
  console.log(`  npm run cell:test -- ../${name}/cells/main.cell EchoTissue`);
}

main();
