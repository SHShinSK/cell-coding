// ═══════════════════════════════════════════════════════════
//  Cell Coding — Registry semver helpers (Phase 4+)
//  패키지 버전 범위 검사
// ═══════════════════════════════════════════════════════════

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

/** semver 문자열 파싱 · x.y.z */
export function parseSemver(input: string): SemVer | null {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?$/.exec(input.trim());
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4],
  };
}

export function compareSemver(a: string, b: string): number {
  const va = parseSemver(a);
  const vb = parseSemver(b);
  if (!va || !vb) return 0;
  if (va.major !== vb.major) return va.major - vb.major;
  if (va.minor !== vb.minor) return va.minor - vb.minor;
  if (va.patch !== vb.patch) return va.patch - vb.patch;
  return 0;
}

function matchCaret(version: SemVer, range: SemVer): boolean {
  if (version.major !== range.major) return false;
  if (range.major > 0) return true;
  if (version.minor !== range.minor) return false;
  if (range.minor > 0) return true;
  return version.patch >= range.patch;
}

function matchTilde(version: SemVer, range: SemVer): boolean {
  if (version.major !== range.major || version.minor !== range.minor) return false;
  return version.patch >= range.patch;
}

/** 버전이 범위를 만족하는지 (^x.y.z, ~x.y.z, >=x.y.z, exact) */
export function satisfiesRange(version: string, range: string): boolean {
  const v = parseSemver(version);
  if (!v) return false;

  const trimmed = range.trim();
  if (trimmed.startsWith('^')) {
    const base = parseSemver(trimmed.slice(1));
    return base ? matchCaret(v, base) : false;
  }
  if (trimmed.startsWith('~')) {
    const base = parseSemver(trimmed.slice(1));
    return base ? matchTilde(v, base) : false;
  }
  if (trimmed.startsWith('>=')) {
    return compareSemver(version, trimmed.slice(2).trim()) >= 0;
  }
  if (trimmed.startsWith('>')) {
    return compareSemver(version, trimmed.slice(1).trim()) > 0;
  }
  if (trimmed.startsWith('<=')) {
    return compareSemver(version, trimmed.slice(2).trim()) <= 0;
  }
  if (trimmed.startsWith('<')) {
    return compareSemver(version, trimmed.slice(1).trim()) < 0;
  }
  return compareSemver(version, trimmed) === 0;
}
