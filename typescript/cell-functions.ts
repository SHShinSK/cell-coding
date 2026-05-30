// ═══════════════════════════════════════════════════════════
//  Cell Coding — External handler functions loader
//  cell run --functions · callFn 외부 함수
// ═══════════════════════════════════════════════════════════

import { readFileSync, existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export type CellFunction = (...args: unknown[]) => unknown;

const BUILTINS: Record<string, CellFunction> = {
  /** input.payload 비어 있지 않음 · validator.cell */
  nonEmptyPayload: (input: unknown) => {
    if (!input || typeof input !== 'object') return false;
    const payload = (input as { payload?: unknown }).payload;
    return typeof payload === 'string' && payload.length > 0;
  },
  always: () => true,
  never: () => false,
};

function compileExprFn(spec: { params?: string[]; body: string }): CellFunction {
  const params = spec.params ?? ['input'];
  const body = spec.body.trim().startsWith('return') ? spec.body : `return ${spec.body}`;
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function(...params, body) as CellFunction;
}

function parseJsonFunctions(raw: string): Record<string, CellFunction> {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const fns: Record<string, CellFunction> = {};

  for (const [name, value] of Object.entries(parsed)) {
    if (typeof value === 'string') {
      const builtin = BUILTINS[value];
      if (!builtin) {
        throw new Error(`Unknown builtin '${value}' for function '${name}' · 알 수 없는 builtin`);
      }
      fns[name] = builtin;
      continue;
    }
    if (value && typeof value === 'object') {
      const obj = value as { builtin?: string; body?: string; params?: string[]; expr?: string };
      if (obj.builtin) {
        const builtin = BUILTINS[obj.builtin];
        if (!builtin) {
          throw new Error(`Unknown builtin '${obj.builtin}' · 알 수 없는 builtin`);
        }
        fns[name] = builtin;
        continue;
      }
      if (obj.body || obj.expr) {
        fns[name] = compileExprFn({
          params: obj.params,
          body: obj.body ?? obj.expr ?? '',
        });
        continue;
      }
    }
    throw new Error(`Invalid function spec for '${name}' · 함수 정의 형식 오류`);
  }

  return fns;
}

/** `{stem}.functions.json` sidecar 경로 · cell 파일 옆 자동 탐색 */
export function defaultFunctionsPath(cellFile: string): string {
  const abs = resolve(cellFile);
  return abs.replace(/\.cell$/i, '.functions.json');
}

/** `--functions` 또는 sidecar에서 callFn 함수 로드 */
export async function loadCellFunctions(spec: string): Promise<Record<string, CellFunction>> {
  const path = resolve(spec.startsWith('@') ? spec.slice(1) : spec);
  if (!existsSync(path)) {
    throw new Error(`Functions file not found · 함수 파일 없음: ${path.replace(/\\/g, '/')}`);
  }

  const ext = extname(path).toLowerCase();
  if (ext === '.json') {
    return parseJsonFunctions(readFileSync(path, 'utf-8'));
  }
  if (ext === '.mjs' || ext === '.js' || ext === '.ts') {
    const mod = await import(`${pathToFileURL(path).href}?v=${Date.now()}`);
    const exported = (mod.default ?? mod.functions) as Record<string, CellFunction>;
    if (!exported || typeof exported !== 'object') {
      throw new Error('Functions module must export default or named `functions` · export 필요');
    }
    return exported;
  }

  throw new Error(`Unsupported functions file type · 지원하지 않는 확장자: ${ext}`);
}

/** cell 파일 옆 sidecar 또는 명시 경로 */
export async function resolveCellFunctions(
  cellFile: string,
  explicitPath?: string,
): Promise<Record<string, CellFunction>> {
  if (explicitPath) {
    return loadCellFunctions(explicitPath.startsWith('@') ? explicitPath : `@${explicitPath}`);
  }
  const sidecar = defaultFunctionsPath(cellFile);
  if (existsSync(sidecar)) {
    return loadCellFunctions(`@${sidecar}`);
  }
  return {};
}

export { BUILTINS as cellFunctionBuiltins };
