import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  installPackage,
  resolveRegistryRoot,
  listRegistryPackages,
  checkMembraneCompatibility,
  resolvePackageDir,
} from './cell-registry.js';
import { composeOrgan } from './cell-compose.js';
import { deployCellFile } from './cell-deploy.js';
import { compile } from './compile.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryRoot = resolveRegistryRoot();

const HOST_CELL = `signal Ping {
  tag: String;
}

signal Pong {
  tag: String;
}

cell EchoCell {
  role: "Echo · 에코";

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

describe('Cell Registry', () => {
  it('lists @community/auth-organ in bundled registry', () => {
    const packages = listRegistryPackages(registryRoot);
    assert.ok(packages.some(p => p.name === '@community/auth-organ'));
  });

  it('auth-organ package compiles', () => {
    const { dir, manifest } = resolvePackageDir('@community/auth-organ', registryRoot);
    const source = readFileSync(join(dir, manifest.files[0]), 'utf-8');
    const { diagnostics } = compile(source);
    assert.equal(diagnostics.filter(d => d.kind === 'error').length, 0);
  });
});

describe('cell install + compose + deploy', () => {
  const projectDir = mkdtempSync(join(tmpdir(), 'cell-phase4-'));

  after(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('installs auth-organ into vendor/', () => {
    const cellsDir = join(projectDir, 'cells');
    mkdirSync(cellsDir, { recursive: true });
    writeFileSync(join(cellsDir, 'main.cell'), HOST_CELL, 'utf-8');
    writeFileSync(
      join(projectDir, 'cell.config.json'),
      JSON.stringify({ version: 1, name: 'echo-app', entry: 'cells/main.cell' }, null, 2),
      'utf-8',
    );

    const result = installPackage({
      projectDir,
      packageRef: '@community/auth-organ',
      registryRoot,
    });

    assert.equal(result.ok, true, result.errors.join('; '));
    assert.ok(existsSync(join(result.vendorPath, 'auth-organ.cell')));
    assert.ok(existsSync(join(result.vendorPath, 'cell.pkg.json')));
  });

  it('checks membrane compatibility for echo host', () => {
    const { manifest } = resolvePackageDir('@community/auth-organ', registryRoot);
    const compat = checkMembraneCompatibility(HOST_CELL, manifest);
    assert.equal(compat.ok, true);
  });

  it('composes auth organ into host organism', () => {
    const result = composeOrgan({
      projectDir,
      packageRef: '@community/auth-organ',
    });

    assert.equal(result.ok, true, result.errors.join('; '));
    assert.ok(existsSync(result.outFile));
    const merged = readFileSync(result.outFile, 'utf-8');
    assert.match(merged, /AuthOrgan/);
    assert.match(merged, /EchoOrgan/);
    const { diagnostics } = compile(merged);
    assert.equal(diagnostics.filter(d => d.kind === 'error').length, 0);
  });

  it('generates Kubernetes manifests per organ', () => {
    const composed = join(projectDir, 'cells', 'main.composed.cell');
    const result = deployCellFile({ file: composed, outDir: join(projectDir, 'deploy', 'k8s') });

    assert.equal(result.ok, true, result.errors.join('; '));
    assert.equal(result.organs.sort().join(','), 'AuthOrgan,EchoOrgan');
    assert.ok(result.manifests.length >= 2);
    const yaml = readFileSync(result.manifests[0], 'utf-8');
    assert.match(yaml, /kind: Deployment/);
    assert.match(yaml, /cell-coding.io\/organ/);
  });
});
