// ═══════════════════════════════════════════════════════════
//  Cell Coding — Cell Registry (Phase 4 PoC)
//  로컬 registry · cell install · 막 호환성 검사
// ═══════════════════════════════════════════════════════════

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from './compile.js';
import { inspectProgram } from './cell-inspect.js';
import { resolveRegistryRootAsync } from './registry-remote.js';
import { satisfiesRange } from './cell-semver.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUNDLED_REGISTRY = join(__dirname, 'registry');
const MONOREPO_REGISTRY = join(__dirname, '..', 'registry');

function defaultRegistryPath(): string {
  if (existsSync(BUNDLED_REGISTRY)) return BUNDLED_REGISTRY;
  return MONOREPO_REGISTRY;
}

const DEFAULT_REGISTRY = defaultRegistryPath();

export interface RegistryPackageMeta {
  version: string;
  path: string;
  organ: string;
  exports: string[];
  description?: string;
}

export interface RegistryIndex {
  version: number;
  packages: Record<string, RegistryPackageMeta>;
}

export interface CellPackageManifest {
  name: string;
  version: string;
  organ: string;
  exports: string[];
  requires?: string[];
  files: string[];
  membrane?: {
    accepts?: string[];
    emits?: string[];
  };
}

export interface CellProjectConfig {
  version: number;
  name: string;
  entry: string;
  dependencies?: Record<string, string>;
  vendorDir?: string;
}

export interface InstallResult {
  ok: boolean;
  packageName: string;
  version: string;
  organ: string;
  vendorPath: string;
  errors: string[];
  warnings: string[];
}

export interface MembraneCompatResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function resolveRegistryRoot(): string {
  if (process.env.CELL_REGISTRY) {
    return resolve(process.env.CELL_REGISTRY);
  }
  return DEFAULT_REGISTRY;
}

/** Async registry root (supports CELL_REGISTRY_URL remote sync). */
/** registry 루트 (CELL_REGISTRY_URL 원격 동기화 지원) */
export async function resolveRegistryRootForInstall(): Promise<string> {
  if (process.env.CELL_REGISTRY) {
    return resolve(process.env.CELL_REGISTRY);
  }
  if (process.env.CELL_REGISTRY_URL) {
    return resolveRegistryRootAsync(DEFAULT_REGISTRY);
  }
  return DEFAULT_REGISTRY;
}

export function loadRegistryIndex(registryRoot = resolveRegistryRoot()): RegistryIndex {
  const indexPath = join(registryRoot, 'index.json');
  if (!existsSync(indexPath)) {
    throw new Error(`Registry index not found · registry index 없음: ${indexPath}`);
  }
  return JSON.parse(readFileSync(indexPath, 'utf-8')) as RegistryIndex;
}

export function normalizePackageRef(ref: string): string {
  if (ref.startsWith('@')) return ref;
  return `@community/${ref}`;
}

export function resolvePackageDir(
  packageName: string,
  registryRoot = resolveRegistryRoot(),
): { meta: RegistryPackageMeta; dir: string; manifest: CellPackageManifest } {
  const index = loadRegistryIndex(registryRoot);
  const key = normalizePackageRef(packageName);
  const meta = index.packages[key];
  if (!meta) {
    throw new Error(`Package not found in registry · registry에 패키지 없음: ${key}`);
  }
  const dir = join(registryRoot, meta.path);
  const manifestPath = join(dir, 'cell.pkg.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`Missing cell.pkg.json · cell.pkg.json 없음: ${manifestPath}`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as CellPackageManifest;
  return { meta, dir, manifest };
}

export function loadProjectConfig(projectDir: string): CellProjectConfig | null {
  const configPath = join(projectDir, 'cell.config.json');
  if (!existsSync(configPath)) return null;
  return JSON.parse(readFileSync(configPath, 'utf-8')) as CellProjectConfig;
}

export function saveProjectConfig(projectDir: string, config: CellProjectConfig): void {
  writeFileSync(
    join(projectDir, 'cell.config.json'),
    JSON.stringify(config, null, 2) + '\n',
    'utf-8',
  );
}

export function checkMembraneCompatibility(
  hostSource: string,
  manifest: CellPackageManifest,
): MembraneCompatResult {
  const { program, diagnostics } = compile(hostSource);
  const errors = diagnostics.filter(d => d.kind === 'error').map(d => d.message);
  const warnings = diagnostics.filter(d => d.kind === 'warning').map(d => d.message);

  if (errors.length) {
    return { ok: false, errors, warnings };
  }

  const inspect = inspectProgram(program, { diagnostics });
  const hostSignals = new Set(inspect.signals.map(s => s.name));
  const pkgAccepts = manifest.membrane?.accepts ?? [];

  for (const req of manifest.requires ?? []) {
    if (!hostSignals.has(req)) {
      warnings.push(
        `Host missing required signal '${req}' for ${manifest.name} · 호스트에 필요 신호 '${req}' 없음`,
      );
    }
  }

  for (const sig of pkgAccepts) {
    if (hostSignals.has(sig)) {
      warnings.push(
        `Signal '${sig}' already in host — merge may duplicate · '${sig}' 중복 가능`,
      );
    }
  }

  return { ok: true, errors, warnings };
}

export interface InstallPackageOptions {
  projectDir: string;
  packageRef: string;
  registryRoot?: string;
  checkHost?: boolean;
  /** semver range e.g. ^0.1.0 · semver 범위 */
  versionRange?: string;
}

export function installPackage(opts: InstallPackageOptions): InstallResult {
  const projectDir = resolve(opts.projectDir);
  const packageName = normalizePackageRef(opts.packageRef);
  const registryRoot = opts.registryRoot ?? resolveRegistryRoot();

  let meta: RegistryPackageMeta;
  let pkgDir: string;
  let manifest: CellPackageManifest;
  try {
    ({ meta, dir: pkgDir, manifest } = resolvePackageDir(packageName, registryRoot));
  } catch (e) {
    return {
      ok: false,
      packageName,
      version: '',
      organ: '',
      vendorPath: '',
      errors: [e instanceof Error ? e.message : String(e)],
      warnings: [],
    };
  }

  if (opts.versionRange && !satisfiesRange(meta.version, opts.versionRange)) {
    return {
      ok: false,
      packageName,
      version: meta.version,
      organ: manifest.organ,
      vendorPath: '',
      errors: [
        `Version ${meta.version} does not satisfy ${opts.versionRange} · 버전 ${meta.version}이 범위 ${opts.versionRange} 미충족`,
      ],
      warnings: [],
    };
  }

  const configBefore = loadProjectConfig(projectDir);
  const pinnedRange = configBefore?.dependencies?.[packageName];
  if (
    pinnedRange &&
    pinnedRange !== meta.version &&
    (pinnedRange.startsWith('^') || pinnedRange.startsWith('~') || pinnedRange.startsWith('>='))
  ) {
    if (!satisfiesRange(meta.version, pinnedRange)) {
      return {
        ok: false,
        packageName,
        version: meta.version,
        organ: manifest.organ,
        vendorPath: '',
        errors: [
          `Installed version ${meta.version} breaks pinned range ${pinnedRange} · 고정 범위 ${pinnedRange} 위반`,
        ],
        warnings: [],
      };
    }
  }

  const vendorDir = join(
    projectDir,
    loadProjectConfig(projectDir)?.vendorDir ?? 'vendor',
    packageName.replace('@', '').replace('/', '-'),
  );
  mkdirSync(vendorDir, { recursive: true });

  for (const file of manifest.files) {
    const src = join(pkgDir, file);
    if (!existsSync(src)) {
      return {
        ok: false,
        packageName,
        version: meta.version,
        organ: manifest.organ,
        vendorPath: vendorDir,
        errors: [`Package file missing · 패키지 파일 없음: ${file}`],
        warnings: [],
      };
    }
    copyFileSync(src, join(vendorDir, file));
  }
  copyFileSync(join(pkgDir, 'cell.pkg.json'), join(vendorDir, 'cell.pkg.json'));

  const config = loadProjectConfig(projectDir) ?? {
    version: 1,
    name: 'organism',
    entry: 'cells/main.cell',
    dependencies: {},
  };
  config.dependencies = config.dependencies ?? {};
  config.dependencies[packageName] = meta.version;
  saveProjectConfig(projectDir, config);

  const warnings: string[] = [];
  const errors: string[] = [];

  if (opts.checkHost !== false) {
    const entry = join(projectDir, config.entry);
    if (existsSync(entry)) {
      const hostSource = readFileSync(entry, 'utf-8');
      const compat = checkMembraneCompatibility(hostSource, manifest);
      warnings.push(...compat.warnings);
      if (!compat.ok) errors.push(...compat.errors);
    }
  }

  return {
    ok: errors.length === 0,
    packageName,
    version: meta.version,
    organ: manifest.organ,
    vendorPath: vendorDir,
    errors,
    warnings,
  };
}

export function formatInstallHuman(result: InstallResult): string {
  const lines = [
    '',
    '  Cell Registry install · 패키지 설치',
    `  package : ${result.packageName}@${result.version}`,
    `  organ   : ${result.organ}`,
    `  vendor  : ${result.vendorPath.replace(/\\/g, '/')}`,
  ];
  if (result.warnings.length) {
    lines.push('', '  Warnings · 경고:');
    for (const w of result.warnings) lines.push(`    ⚠ ${w}`);
  }
  if (result.errors.length) {
    lines.push('', '  Errors · 오류:');
    for (const e of result.errors) lines.push(`    ✗ ${e}`);
  }
  lines.push('', result.ok ? '  ✓ install OK' : '  ✗ install failed');
  lines.push('', '  Next · 다음:');
  lines.push(`    cell compose --organ ${result.packageName}`);
  return lines.join('\n');
}

export function listRegistryPackages(
  registryRoot = resolveRegistryRoot(),
): Array<RegistryPackageMeta & { name: string }> {
  const index = loadRegistryIndex(registryRoot);
  return Object.entries(index.packages).map(([name, meta]) => ({
    name,
    ...meta,
  }));
}
