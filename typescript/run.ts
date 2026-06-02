// ═══════════════════════════════════════════════════════════
//  Cell Coding — cell run CLI
//  Usage · 사용법:
//    npm run cell:run -- [flags] <file.cell> <SignalType> '<json>'
//    npm run cell:run -- --json --watch --out ../viewer/live-run.json <file.cell> ...
// ═══════════════════════════════════════════════════════════

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { runCellFileAsync, formatRunHuman } from './run-cell.js';
import { buildLiveRunPayload } from './run-payload.js';
import { DEFAULT_WATCH_OUT, DEFAULT_WATCH_POLL_MS, startCellWatch } from './run-watch.js';
import { parseStreamSamplePayload } from './stream-run.js';

interface ParsedArgs {
  json: boolean;
  watch: boolean;
  transpiled: boolean;
  stream?: string;
  streamSamples: number;
  streamIntervalMs?: number;
  generatedDir?: string;
  functionsPath?: string;
  jaegerUiUrl?: string;
  out?: string;
  intervalMs: number;
  file?: string;
  signalType?: string;
  signalJson?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const rest: string[] = [];
  let json = false;
  let watch = false;
  let transpiled = false;
  let stream: string | undefined;
  let streamSamples = 5;
  let streamIntervalMs: number | undefined;
  let out: string | undefined;
  let generatedDir: string | undefined;
  let functionsPath: string | undefined;
  let jaegerUiUrl: string | undefined;
  let intervalMs = DEFAULT_WATCH_POLL_MS;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') {
      json = true;
    } else if (arg === '--watch') {
      watch = true;
    } else if (arg === '--transpiled') {
      transpiled = true;
    } else if (arg === '--stream') {
      const next = argv[i + 1];
      if (next && !next.startsWith('-') && !next.endsWith('.cell')) {
        stream = argv[++i];
      } else {
        stream = '';
      }
    } else if (arg === '--samples') {
      const parsed = Number(argv[++i]);
      if (!Number.isFinite(parsed) || parsed < 1) {
        console.error('--samples must be >= 1 · --samples는 1 이상');
        process.exit(1);
      }
      streamSamples = parsed;
    } else if (arg === '--interval-ms') {
      const parsed = Number(argv[++i]);
      if (!Number.isFinite(parsed) || parsed < 0) {
        console.error('--interval-ms must be >= 0 · --interval-ms는 0 이상');
        process.exit(1);
      }
      streamIntervalMs = parsed;
    } else if (arg === '--generated') {
      generatedDir = argv[++i];
    } else if (arg === '--functions') {
      functionsPath = argv[++i];
    } else if (arg === '--jaeger') {
      jaegerUiUrl = argv[++i];
    } else if (arg === '--out') {
      out = argv[++i];
    } else if (arg === '--interval') {
      const raw = argv[++i];
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 200) {
        console.error('--interval must be >= 200 ms · --interval은 200ms 이상');
        process.exit(1);
      }
      intervalMs = parsed;
    } else {
      rest.push(arg);
    }
  }

  const [file, signalType, signalJson] = rest;
  return {
    json,
    watch,
    transpiled,
    stream,
    streamSamples,
    streamIntervalMs,
    generatedDir,
    functionsPath,
    jaegerUiUrl,
    out,
    intervalMs,
    file,
    signalType,
    signalJson,
  };
}

function parseSignalData(signalJson: string | undefined): Record<string, unknown> {
  if (!signalJson) return { turbidity: 0.5, flowRate: 12 };
  const raw = signalJson.startsWith('@')
    ? readFileSync(resolve(process.cwd(), signalJson.slice(1)), 'utf-8')
    : signalJson;
  return JSON.parse(raw);
}

function main(): void {
  mainAsync().catch(err => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}

async function mainAsync(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args.file) {
    console.error(`Usage · 사용법:
  npm run cell:run -- [--json] [--transpiled] [--stream [StreamName]] [--samples N] [--interval-ms ms] [--generated dir] [--functions path] [--jaeger url] [--watch] [--out path] [--interval ms] <file.cell> <SignalType> '<json>'

Examples · 예:
  npm run cell:run -- ../examples/porifera-filter/sponge-organism.cell WaterSample '{"turbidity":0.2}'
  npm run cell:run -- --stream --samples 5 --interval-ms 50 ../examples/spiderling-sim/spiderling-sim-organism.cell ImuSample '{"timestamp":1,"accelX":0.1,"accelY":0.2,"accelZ":9.81,"gyroX":0,"gyroY":0,"gyroZ":0.05}'
  npm run cell:run -- --stream ImuStream --samples 3 ../examples/spiderling-sim/spiderling-sim-organism.cell ImuSample '{"timestamp":1,"accelX":0.1,"accelY":0.2,"accelZ":9.81,"gyroX":0,"gyroY":0,"gyroZ":0.05}'
  npm run cell:run -- --transpiled ../examples/motion-alarm/motion-alarm.cell MotionDetected '{"x":1,"y":2,"confidence":0.9}'
  npm run cell:run -- --json --watch --out ../viewer/live-run.json ../examples/porifera-filter/sponge-organism.cell WaterSample '{"turbidity":0.95}'`);
    process.exit(1);
  }

  const inputType = args.signalType ?? 'WaterSample';
  let inputData: Record<string, unknown>;
  try {
    inputData = parseSignalData(args.signalJson);
  } catch {
    console.error('Invalid JSON for signal data · 신호 JSON 파싱 실패');
    process.exit(1);
  }

  const input = { type: inputType, data: inputData };

  let streamOpts: { name?: string; samples: Record<string, unknown>[]; intervalMs?: number } | undefined;
  if (args.stream !== undefined) {
    const samplesResult = parseStreamSamplePayload(
      args.signalJson,
      inputData,
      args.streamSamples,
      args.streamIntervalMs ?? 50,
    );
    if ('error' in samplesResult) {
      console.error(samplesResult.error);
      process.exit(1);
    }
    streamOpts = {
      name: args.stream || undefined,
      samples: samplesResult,
      intervalMs: args.streamIntervalMs,
    };
  }

  if (args.watch) {
    if (!args.json) {
      console.error('--watch requires --json · --watch는 --json과 함께 사용');
      process.exit(1);
    }

    const out = args.out ?? DEFAULT_WATCH_OUT;
    const filePath = resolve(process.cwd(), args.file);
    const outPath = resolve(process.cwd(), out);

    const session = startCellWatch({
      file: args.file,
      out,
      input,
      pollIntervalMs: args.intervalMs,
      transpiled: args.transpiled
        ? { generatedDir: args.generatedDir ? resolve(process.cwd(), args.generatedDir) : undefined }
        : undefined,
      functionsPath: args.functionsPath
        ? resolve(process.cwd(), args.functionsPath.replace(/^@/, ''))
        : undefined,
      jaegerUiUrl: args.jaegerUiUrl ?? process.env.JAEGER_UI_URL,
      onRun: ({ ok, signalCount, out: written }) => {
        const rel = written.replace(/\\/g, '/');
        if (ok) {
          console.error(`[watch] ${signalCount} signal(s) → ${rel}`);
        } else {
          console.error(`[watch] compile error → ${rel}`);
        }
      },
    });

    console.error(`Watching ${filePath.replace(/\\/g, '/')} → ${outPath.replace(/\\/g, '/')} (Ctrl+C to stop · Ctrl+C 종료)`);

    process.on('SIGINT', () => {
      session.close();
      process.exit(0);
    });

    return;
  }

  const runOpts = {
    file: resolve(process.cwd(), args.file),
    input,
    stream: streamOpts,
    transpiled: args.transpiled
      ? { generatedDir: args.generatedDir ? resolve(process.cwd(), args.generatedDir) : undefined }
      : undefined,
    functionsPath: args.functionsPath
      ? resolve(process.cwd(), args.functionsPath.replace(/^@/, ''))
      : undefined,
    jaegerUiUrl: args.jaegerUiUrl ?? process.env.JAEGER_UI_URL,
  };

  let result;
  try {
    result = await runCellFileAsync(runOpts);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  if (!result.ok) {
    console.error('Compile errors · 컴파일 오류:');
    for (const e of result.errors) console.error(`  ${e}`);
    process.exit(1);
  }

  if (args.json) {
    const payload = buildLiveRunPayload(result, {
      jaegerUiUrl: args.jaegerUiUrl ?? process.env.JAEGER_UI_URL,
      otelServiceName: `cell-${basename(resolve(process.cwd(), args.file), '.cell')}`,
    });
    const text = JSON.stringify(payload, null, 2);
    if (args.out) {
      const outPath = resolve(process.cwd(), args.out);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, text, 'utf-8');
      console.error(`Wrote ${args.out.replace(/\\/g, '/')}`);
    } else {
      console.log(text);
    }
    return;
  }

  console.log(formatRunHuman(result, input));
}

main();
