// ═══════════════════════════════════════════════════════════
//  Cell Coding — Organ compose (Phase 4)
//  vendor organ → host organism 병합
// ═══════════════════════════════════════════════════════════

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { compile } from './compile.js';
import type * as AST from './ast.js';
import {
  loadProjectConfig,
  normalizePackageRef,
  resolvePackageDir,
} from './cell-registry.js';

export interface ComposeOptions {
  projectDir: string;
  packageRef: string;
  hostFile?: string;
  outFile?: string;
  nervousRoute?: { source: string; targetOrgan: string };
}

export interface ComposeResult {
  ok: boolean;
  outFile: string;
  organ: string;
  errors: string[];
  warnings: string[];
  source: string;
}

function vendorDirFor(projectDir: string, packageName: string): string {
  const slug = packageName.replace('@', '').replace('/', '-');
  return join(projectDir, loadProjectConfig(projectDir)?.vendorDir ?? 'vendor', slug);
}

export function composeOrgan(opts: ComposeOptions): ComposeResult {
  const projectDir = resolve(opts.projectDir);
  const packageName = normalizePackageRef(opts.packageRef);
  const config = loadProjectConfig(projectDir);
  const hostPath = resolve(projectDir, opts.hostFile ?? config?.entry ?? 'cells/main.cell');

  if (!existsSync(hostPath)) {
    return {
      ok: false,
      outFile: '',
      organ: '',
      errors: [`Host file not found · host 파일 없음: ${hostPath}`],
      warnings: [],
      source: '',
    };
  }

  let manifest;
  try {
    ({ manifest } = resolvePackageDir(packageName));
  } catch (e) {
    return {
      ok: false,
      outFile: '',
      organ: '',
      errors: [e instanceof Error ? e.message : String(e)],
      warnings: [],
      source: '',
    };
  }

  const vendorPath = vendorDirFor(projectDir, packageName);
  const pkgCellFile = join(vendorPath, manifest.files[0] ?? 'organ.cell');
  if (!existsSync(pkgCellFile)) {
    return {
      ok: false,
      outFile: '',
      organ: manifest.organ,
      errors: [`Run 'cell install ${packageName}' first · 먼저 install 하세요`],
      warnings: [],
      source: '',
    };
  }

  const hostSource = readFileSync(hostPath, 'utf-8');
  const pkgSource = readFileSync(pkgCellFile, 'utf-8');

  const hostCompile = compile(hostSource);
  const pkgCompile = compile(pkgSource);
  const errors = [
    ...hostCompile.diagnostics.filter(d => d.kind === 'error').map(d => d.message),
    ...pkgCompile.diagnostics.filter(d => d.kind === 'error').map(d => d.message),
  ];
  if (errors.length) {
    return { ok: false, outFile: '', organ: manifest.organ, errors, warnings: [], source: '' };
  }

  const hostOrganism = hostCompile.program.statements.find(
    (s): s is AST.OrganismDecl => s.kind === 'OrganismDecl',
  );
  if (!hostOrganism) {
    return {
      ok: false,
      outFile: '',
      organ: manifest.organ,
      errors: ['Host has no organism block · host에 organism 없음'],
      warnings: [],
      source: '',
    };
  }

  if (hostOrganism.organs.includes(manifest.organ)) {
    return {
      ok: false,
      outFile: '',
      organ: manifest.organ,
      errors: [`Organ '${manifest.organ}' already in host organism · 이미 등록됨`],
      warnings: [],
      source: '',
    };
  }

  const warnings: string[] = [];
  const hostSigNames = new Set(
    hostCompile.program.statements
      .filter((s): s is AST.SignalDecl => s.kind === 'SignalDecl')
      .map(s => s.name),
  );
  for (const decl of pkgCompile.program.statements) {
    if (decl.kind === 'SignalDecl' && hostSigNames.has(decl.name)) {
      warnings.push(`Signal '${decl.name}' exists in host — skipped · 중복 signal 스킵`);
    }
  }

  const organismRe = /organism\s+(\w+)\s*\{([\s\S]*?)\n\}/m;
  const orgMatch = hostSource.match(organismRe);
  if (!orgMatch) {
    return {
      ok: false,
      outFile: '',
      organ: manifest.organ,
      errors: ['Cannot parse host organism · host organism 파싱 실패'],
      warnings,
      source: '',
    };
  }

  const organismName = orgMatch[1];
  let organismBody = orgMatch[2];

  const organsBlockRe = /organs\s*\{([^}]*)\}/;
  const organsMatch = organismBody.match(organsBlockRe);
  if (organsMatch) {
    const organsInner = organsMatch[1].trim();
    const newOrgans = organsInner
      ? `${organsInner}\n    ${manifest.organ}  // ${packageName}`
      : `${manifest.organ}  // ${packageName}`;
    organismBody = organismBody.replace(organsBlockRe, `organs {\n    ${newOrgans}\n  }`);
  }

  if (opts.nervousRoute) {
    const routeLine =
      `\n    ${opts.nervousRoute.source} -> ${opts.nervousRoute.targetOrgan}  // ${packageName}`;
    if (/nervous\s+\w+\s*\{/.test(organismBody)) {
      organismBody = organismBody.replace(
        /(nervous\s+\w+\s*\{[\s\S]*?)(\n\s*\})/,
        `$1${routeLine}$2`,
      );
    } else {
      organismBody += `\n\n  nervous ComposeBus {${routeLine}\n  }`;
    }
  }

  const pkgDecls = pkgCompile.program.statements
    .filter(s => s.kind !== 'OrganismDecl')
    .map(s => {
      if (s.kind === 'SignalDecl' && hostSigNames.has(s.name)) return '';
      return sliceDecl(pkgSource, s);
    })
    .filter(Boolean)
    .join('\n\n');

  const hostWithoutOrganism = hostSource.replace(organismRe, '').trim();
  const mergedOrganism = `organism ${organismName} {${organismBody}\n}`;

  const header = [
    `// Composed with ${packageName} · ${packageName} 병합`,
    `// vendor: ${pkgCellFile.replace(/\\/g, '/')}`,
    '',
  ].join('\n');

  const source = [header, hostWithoutOrganism, pkgDecls, mergedOrganism]
    .filter(Boolean)
    .join('\n\n');

  const mergedCompile = compile(source);
  const mergeErrors = mergedCompile.diagnostics
    .filter(d => d.kind === 'error')
    .map(d => d.message);
  if (mergeErrors.length) {
    return {
      ok: false,
      outFile: '',
      organ: manifest.organ,
      errors: mergeErrors,
      warnings,
      source,
    };
  }

  const outFile = resolve(
    projectDir,
    opts.outFile ?? hostPath.replace(/\.cell$/i, '.composed.cell'),
  );
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, source, 'utf-8');

  return { ok: true, outFile, organ: manifest.organ, errors: [], warnings, source };
}

function sliceDecl(source: string, decl: AST.TopLevelDecl): string {
  let pattern: RegExp | undefined;
  switch (decl.kind) {
    case 'SignalDecl':
      pattern = new RegExp(`signal\\s+${decl.name}\\s*\\{`, 'm');
      break;
    case 'CellDecl':
      pattern = new RegExp(`cell\\s+${decl.name}\\s*\\{`, 'm');
      break;
    case 'TissueDecl':
      pattern = new RegExp(`tissue\\s+${decl.name}\\s*\\{`, 'm');
      break;
    case 'OrganDecl':
      pattern = new RegExp(`organ\\s+${decl.name}\\s*\\{`, 'm');
      break;
    case 'GenomeDecl':
      pattern = new RegExp(`genome\\s+${decl.name}\\s*\\{`, 'm');
      break;
  }
  if (!pattern) return '';
  const match = source.match(pattern);
  if (!match || match.index === undefined) return '';
  const start = match.index;
  let depth = 0;
  let started = false;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') {
      depth++;
      started = true;
    } else if (source[i] === '}') {
      depth--;
      if (started && depth === 0) {
        return source.slice(start, i + 1).trim();
      }
    }
  }
  return '';
}

export function formatComposeHuman(result: ComposeResult): string {
  const lines = [
    '',
    '  Cell compose · organ 병합',
    `  organ : ${result.organ}`,
    `  out   : ${result.outFile.replace(/\\/g, '/')}`,
  ];
  if (result.warnings.length) {
    lines.push('', '  Warnings · 경고:');
    for (const w of result.warnings) lines.push(`    ⚠ ${w}`);
  }
  if (result.errors.length) {
    lines.push('', '  Errors · 오류:');
    for (const e of result.errors) lines.push(`    ✗ ${e}`);
  }
  lines.push('', result.ok ? '  ✓ compose OK' : '  ✗ compose failed');
  if (result.ok) {
    lines.push('', '  Next · 다음:');
    lines.push(`    cell test ${result.outFile}`);
    lines.push(`    cell deploy ${result.outFile}`);
  }
  return lines.join('\n');
}
