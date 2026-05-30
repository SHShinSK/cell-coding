// ═══════════════════════════════════════════════════════════
//  Cell Coding — Remote registry fetch (Phase 4)
//  HTTP registry index · 패키지 캐시
// ═══════════════════════════════════════════════════════════

import { mkdirSync, readFileSync, writeFileSync, existsSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import type { CellPackageManifest, RegistryIndex, RegistryPackageMeta } from './cell-registry.js';

const DEFAULT_CACHE = join(homedir(), '.cell', 'registry-cache');

export function registryCacheDir(): string {
  return process.env.CELL_REGISTRY_CACHE ?? DEFAULT_CACHE;
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { Accept: 'application/json, text/plain' } });
  if (!res.ok) {
    throw new Error(`Registry fetch failed · registry fetch 실패: ${url} (${res.status})`);
  }
  return res.text();
}

/** Download registry index.json from remote base URL · 원격 index.json 다운로드 */
export async function fetchRemoteRegistryIndex(baseUrl: string): Promise<RegistryIndex> {
  const text = await fetchText(joinUrl(baseUrl, 'index.json'));
  return JSON.parse(text) as RegistryIndex;
}

/** Sync remote registry into local cache directory · 원격 registry를 로컬 캐시에 동기화 */
export async function syncRemoteRegistry(baseUrl: string, cacheDir = registryCacheDir()): Promise<string> {
  const index = await fetchRemoteRegistryIndex(baseUrl);
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(join(cacheDir, 'index.json'), JSON.stringify(index, null, 2), 'utf-8');

  for (const [name, meta] of Object.entries(index.packages)) {
    const pkgDir = join(cacheDir, meta.path);
    mkdirSync(pkgDir, { recursive: true });

    const manifestUrl = joinUrl(baseUrl, `${meta.path}/cell.pkg.json`);
    const manifestText = await fetchText(manifestUrl);
    writeFileSync(join(pkgDir, 'cell.pkg.json'), manifestText, 'utf-8');
    const manifest = JSON.parse(manifestText) as CellPackageManifest;

    for (const file of manifest.files) {
      const fileUrl = joinUrl(baseUrl, `${meta.path}/${file}`);
      const content = await fetchText(fileUrl);
      writeFileSync(join(pkgDir, file), content, 'utf-8');
    }

    void name;
  }

  writeFileSync(
    join(cacheDir, 'source.json'),
    JSON.stringify({ baseUrl, syncedAt: new Date().toISOString() }, null, 2),
    'utf-8',
  );

  return cacheDir;
}

/** Resolve registry root: local bundled, CELL_REGISTRY path, or remote cache. */
/** registry 루트: 로컬 / CELL_REGISTRY / 원격 캐시 */
export async function resolveRegistryRootAsync(localDefault: string): Promise<string> {
  if (process.env.CELL_REGISTRY) {
    return process.env.CELL_REGISTRY;
  }

  const remoteUrl = process.env.CELL_REGISTRY_URL;
  if (!remoteUrl) {
    return localDefault;
  }

  const cacheDir = registryCacheDir();
  const sourceMeta = join(cacheDir, 'source.json');
  const indexPath = join(cacheDir, 'index.json');

  if (existsSync(indexPath) && existsSync(sourceMeta)) {
    try {
      const source = JSON.parse(readFileSync(sourceMeta, 'utf-8')) as { baseUrl: string };
      if (source.baseUrl === remoteUrl) {
        return cacheDir;
      }
    } catch {
      /* re-sync below */
    }
  }

  return syncRemoteRegistry(remoteUrl, cacheDir);
}

/** Copy a cached package directory to vendor (used after remote sync). */
export function copyPackageFromCache(
  cacheRoot: string,
  meta: RegistryPackageMeta,
  vendorDir: string,
  manifest: CellPackageManifest,
): void {
  const srcDir = join(cacheRoot, meta.path);
  mkdirSync(vendorDir, { recursive: true });
  cpSync(join(srcDir, 'cell.pkg.json'), join(vendorDir, 'cell.pkg.json'));
  for (const file of manifest.files) {
    cpSync(join(srcDir, file), join(vendorDir, file));
  }
}
