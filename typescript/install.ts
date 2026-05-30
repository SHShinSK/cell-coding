// ═══════════════════════════════════════════════════════════
//  Cell Coding — cell install CLI (Phase 4)
//  Supports CELL_REGISTRY_URL remote sync · 원격 registry 동기화
// ═══════════════════════════════════════════════════════════

import { resolve } from 'node:path';
import {
  installPackage,
  formatInstallHuman,
  listRegistryPackages,
  resolveRegistryRoot,
  resolveRegistryRootForInstall,
} from './cell-registry.js';

function restArg(all: string[], idx: number): string | undefined {
  const token = all[idx];
  return token && !token.startsWith('--') ? token : undefined;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const list = args.includes('--list');
  const syncRemote = args.includes('--sync-remote');
  const rangeIdx = args.indexOf('--range');
  const versionRange = rangeIdx >= 0 ? restArg(args, rangeIdx + 1) : undefined;
  const rest = args.filter((a, i) => !a.startsWith('--') && i !== rangeIdx + 1 && a !== '--range');

  const registryRoot = syncRemote || process.env.CELL_REGISTRY_URL
    ? await resolveRegistryRootForInstall()
    : resolveRegistryRoot();

  if (list) {
    const packages = listRegistryPackages(registryRoot);
    if (json) {
      console.log(JSON.stringify({ registry: registryRoot, packages }, null, 2));
    } else {
      console.log('\n  Cell Registry packages · 패키지 목록\n');
      for (const pkg of packages) {
        console.log(`    ${pkg.name}@${pkg.version}  ${pkg.organ}  — ${pkg.description ?? ''}`);
      }
      console.log('');
    }
    return;
  }

  const packageRef = rest[0];
  const projectDir = resolve(process.cwd(), rest[1] ?? '.');

  if (!packageRef) {
    console.error(`Usage · 사용법:
  npm run cell:install -- [--list] [--sync-remote] [--range ^0.1.0] [--json] <package> [project-dir]

Examples · 예:
  npm run cell:install -- --list
  npm run cell:install -- @community/auth-organ ./my-organism
  npm run cell:install -- --range ^0.1.0 @community/auth-organ .
  CELL_REGISTRY_URL=https://host/cell-registry/v1 npm run cell:install -- --sync-remote @community/auth-organ .`);
    process.exit(1);
  }

  const result = installPackage({ projectDir, packageRef, registryRoot, versionRange });
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatInstallHuman(result));
  }
  process.exit(result.ok ? 0 : 1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
