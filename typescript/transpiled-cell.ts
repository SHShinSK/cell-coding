// ═══════════════════════════════════════════════════════════
//  Cell Coding — Transpiled cell base (Phase 3+)
//  cell build 출력 · CellRuntime wire-up 공용 BaseCell
// ═══════════════════════════════════════════════════════════

export type CellHandlerFn = (...args: unknown[]) => unknown;

export type EmitSignalFn = (type: string, data?: Record<string, unknown>) => void;

/** apoptosis hook 메서드명 */
export const apoptosisMethodName = 'onApoptosis';

/** transpiled handler 메서드명 · on(RawInput) → onRawInput */
export function handlerMethodName(signalType: string): string {
  return `on${signalType}`;
}

/** 트랜스파일된 세포 베이스 · emit/callFn DI */
export abstract class BaseCell {
  constructor(
    protected readonly fns: Record<string, CellHandlerFn> = {},
    protected readonly emitSignal: EmitSignalFn = () => {},
  ) {}

  protected emit(type: string, data: Record<string, unknown> = {}): void {
    this.emitSignal(type, data);
  }

  protected callFn(name: string, ...args: unknown[]): unknown {
    const fn = this.fns[name];
    if (!fn) return undefined;
    return fn(...args);
  }
}

/** generated/*.ts preamble import · cell build 출력용 */
export function transpiledImportLine(): string {
  return "import { BaseCell, type CellHandlerFn } from '../transpiled-cell.js';";
}

/** cell build standalone preamble (import 없이 inline) · 외부 배포용 */
export function inlineTranspiledPreamble(): string[] {
  return [
    'export type CellHandlerFn = (...args: unknown[]) => unknown;',
    '',
    'export abstract class BaseCell {',
    '  constructor(',
    '    protected readonly fns: Record<string, CellHandlerFn> = {},',
    '    protected readonly emitSignal: (type: string, data?: Record<string, unknown>) => void = () => {},',
    '  ) {}',
    '',
    '  protected emit(type: string, data: Record<string, unknown> = {}): void {',
    '    this.emitSignal(type, data);',
    '  }',
    '',
    '  protected callFn(name: string, ...args: unknown[]): unknown {',
    '    const fn = this.fns[name];',
    '    if (!fn) return undefined;',
    '    return fn(...args);',
    '  }',
    '}',
  ];
}
