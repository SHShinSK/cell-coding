"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs"));
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
let lastLivePayload;
let activePanel;
let liveRunWatcher;
function workspaceRoot() {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}
function tracesPath(root) {
    return path.join(root, 'viewer', 'traces.json');
}
function liveRunPath(root) {
    return path.join(root, 'viewer', 'live-run.json');
}
function viewerMediaDir(extensionUri) {
    return vscode.Uri.joinPath(extensionUri, 'media', 'viewer');
}
function getNonce() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < 32; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
}
/** typescript/viewer-traces.ts 실행으로 trace 재생성 */
async function regenerateTraces(root) {
    const tsDir = path.join(root, 'typescript');
    await execFileAsync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'viewer:traces'], {
        cwd: tsDir,
        shell: process.platform === 'win32',
    });
}
/** cell CLI 실행 경로 · monorepo dev vs npm @cell-coding/cli */
function resolveCellRunner(root) {
    const cfg = vscode.workspace.getConfiguration('cellCoding');
    const cliPath = (cfg.get('cliPath') || process.env.CELL_CLI || '').trim();
    const tsDir = path.join(root, 'typescript');
    if (cliPath) {
        return { executable: cliPath, baseArgs: ['run', '--json'], cwd: root, devMode: false };
    }
    if (fs.existsSync(path.join(tsDir, 'run.ts'))) {
        return {
            executable: process.execPath,
            baseArgs: ['--import', 'tsx', 'run.ts', '--json'],
            cwd: tsDir,
            devMode: true,
        };
    }
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    const found = (0, node_child_process_1.spawnSync)(whichCmd, ['cell'], { encoding: 'utf-8', windowsHide: true });
    if (found.status === 0) {
        return { executable: 'cell', baseArgs: ['run', '--json'], cwd: root, devMode: false };
    }
    return {
        executable: process.execPath,
        baseArgs: ['--import', 'tsx', 'run.ts', '--json'],
        cwd: tsDir,
        devMode: true,
    };
}
async function runCellCli(root, cellFile, signalType, signalJson, opts = {}) {
    const runner = resolveCellRunner(root);
    const tsDir = path.join(root, 'typescript');
    const relCell = runner.devMode
        ? path.relative(tsDir, cellFile).replace(/\\/g, '/')
        : cellFile.replace(/\\/g, '/');
    const args = [...runner.baseArgs];
    if (opts.transpiled)
        args.push('--transpiled');
    if (opts.functionsPath) {
        const relFn = runner.devMode
            ? path.relative(tsDir, opts.functionsPath).replace(/\\/g, '/')
            : opts.functionsPath.replace(/\\/g, '/');
        args.push('--functions', relFn);
    }
    if (opts.jaegerUiUrl) {
        args.push('--jaeger', opts.jaegerUiUrl);
    }
    if (opts.outFile) {
        const relOut = runner.devMode
            ? path.relative(tsDir, opts.outFile).replace(/\\/g, '/')
            : opts.outFile.replace(/\\/g, '/');
        args.push('--out', relOut);
    }
    args.push(relCell, signalType, signalJson);
    const { stdout, stderr } = await execFileAsync(runner.executable, args, {
        cwd: runner.cwd,
        windowsHide: true,
    });
    if (opts.outFile && fs.existsSync(opts.outFile)) {
        return fs.readFileSync(opts.outFile, 'utf-8');
    }
    if (stderr && !stdout) {
        throw new Error(stderr);
    }
    return stdout;
}
function viewerConfig() {
    const cfg = vscode.workspace.getConfiguration('cellCoding');
    const jaeger = (cfg.get('jaegerUiUrl') || process.env.JAEGER_UI_URL || '').trim();
    const fnPath = (cfg.get('functionsPath') || '').trim();
    return {
        jaegerUiUrl: jaeger || undefined,
        runTranspiled: cfg.get('runTranspiled') ?? false,
        functionsPath: fnPath || undefined,
    };
}
/** cell inspect CLI 실행 */
async function runInspectCli(root, cellFile, target) {
    const tsDir = path.join(root, 'typescript');
    const relCell = path.relative(tsDir, cellFile).replace(/\\/g, '/');
    const args = ['--import', 'tsx', 'inspect.ts', '--json', relCell];
    if (target)
        args.push(target);
    try {
        const { stdout } = await execFileAsync(process.execPath, args, {
            cwd: tsDir,
            windowsHide: true,
            maxBuffer: 10 * 1024 * 1024,
        });
        return { ok: true, output: stdout, json: stdout };
    }
    catch (e) {
        const err = e;
        const output = err.stdout || err.stderr || String(e);
        return { ok: false, output, json: err.stdout };
    }
}
/** inspect-only viewer JSON 생성 */
async function buildInspectPayload(root, cellFile) {
    const tsDir = path.join(root, 'typescript');
    const relCell = path.relative(tsDir, cellFile).replace(/\\/g, '/');
    const { stdout } = await execFileAsync(process.execPath, ['--import', 'tsx', 'viewer-inspect-cli.ts', relCell], { cwd: tsDir, windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
    return stdout;
}
/** cell test CLI (Cell Lab) 실행 */
async function runCellTestCli(root, cellFile, target) {
    const tsDir = path.join(root, 'typescript');
    const relCell = path.relative(tsDir, cellFile).replace(/\\/g, '/');
    const args = ['--import', 'tsx', 'test.ts', relCell];
    if (target)
        args.push(target);
    try {
        const { stdout, stderr } = await execFileAsync(process.execPath, args, {
            cwd: tsDir,
            windowsHide: true,
            maxBuffer: 10 * 1024 * 1024,
        });
        const output = stdout || stderr;
        return { ok: output.includes('0 failed'), output };
    }
    catch (e) {
        const err = e;
        const output = err.stdout || err.stderr || String(e);
        return { ok: false, output };
    }
}
function loadViewerPayload(root) {
    if (lastLivePayload)
        return lastLivePayload;
    const live = liveRunPath(root);
    if (fs.existsSync(live))
        return fs.readFileSync(live, 'utf-8');
    const traces = tracesPath(root);
    if (fs.existsSync(traces))
        return fs.readFileSync(traces, 'utf-8');
    return undefined;
}
/** React viewer (viewer-react/dist → media/viewer) webview HTML */
function getReactWebviewHtml(webview, extensionUri) {
    const indexPath = path.join(extensionUri.fsPath, 'media', 'viewer', 'index.html');
    if (!fs.existsSync(indexPath)) {
        return undefined;
    }
    let html = fs.readFileSync(indexPath, 'utf-8');
    const nonce = getNonce();
    const viewerRoot = viewerMediaDir(extensionUri);
    html = html.replace(/(?:(href|src)=")(?!https?:|data:)([^"]+)"/g, (_match, attr, rel) => {
        const normalized = rel.replace(/^\.\//, '');
        const uri = webview.asWebviewUri(vscode.Uri.joinPath(viewerRoot, normalized));
        return `${attr}="${uri}"`;
    });
    const csp = [
        "default-src 'none'",
        `style-src ${webview.cspSource} 'unsafe-inline'`,
        `font-src ${webview.cspSource}`,
        `script-src 'nonce-${nonce}' ${webview.cspSource}`,
    ].join('; ');
    const bootstrap = `
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <script nonce="${nonce}">
    window.__CELL_VIEWER_BOOT__ = true;
    const vscode = acquireVsCodeApi();
    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg && msg.type === 'loadPayload') {
        window.__CELL_VIEWER_PAYLOAD__ = msg.payload;
        window.dispatchEvent(new Event('cell-viewer-payload'));
      }
    });
    vscode.postMessage({ type: 'ready' });
  </script>`;
    return html.replace('</head>', `${bootstrap}</head>`);
}
function fallbackHtml(message) {
    return `<!DOCTYPE html>
<html lang="en"><body style="font-family:var(--vscode-font-family);padding:1rem;color:var(--vscode-foreground)">
  <h2>Cell Coding Viewer</h2>
  <p>${message}</p>
  <pre>cd extensions/cell-viewer && npm run build:viewer</pre>
</body></html>`;
}
function wirePayloadHandshake(panel, payloadJson) {
    panel.webview.onDidReceiveMessage(msg => {
        if (msg?.type === 'ready') {
            panel.webview.postMessage({
                type: 'loadPayload',
                payload: JSON.parse(payloadJson),
            });
        }
    });
}
/** live-run.json 변경 시 webview에 자동 push · watch 모드 연동 */
function watchLiveRunFile(root, panel) {
    liveRunWatcher?.close();
    const live = liveRunPath(root);
    if (!fs.existsSync(live))
        return;
    liveRunWatcher = fs.watch(live, () => {
        try {
            const json = fs.readFileSync(live, 'utf-8');
            lastLivePayload = json;
            panel.webview.postMessage({
                type: 'loadPayload',
                payload: JSON.parse(json),
            });
        }
        catch {
            /* ignore partial writes · 부분 쓰기 무시 */
        }
    });
}
function openViewerPanel(context, payloadJson) {
    const viewerRoot = viewerMediaDir(context.extensionUri);
    if (activePanel) {
        activePanel.reveal(vscode.ViewColumn.Beside);
        activePanel.webview.postMessage({
            type: 'loadPayload',
            payload: JSON.parse(payloadJson),
        });
        return;
    }
    const panel = vscode.window.createWebviewPanel('cellCodingViewer', 'Cell Coding Viewer', vscode.ViewColumn.Beside, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [viewerRoot],
    });
    const reactHtml = getReactWebviewHtml(panel.webview, context.extensionUri);
    panel.webview.html = reactHtml ?? fallbackHtml('React viewer bundle missing · React viewer 번들 없음');
    wirePayloadHandshake(panel, payloadJson);
    const root = workspaceRoot();
    if (root)
        watchLiveRunFile(root, panel);
    panel.onDidDispose(() => {
        if (activePanel === panel) {
            activePanel = undefined;
            liveRunWatcher?.close();
            liveRunWatcher = undefined;
        }
    });
    activePanel = panel;
}
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('cellCoding.refreshTraces', async () => {
        const root = workspaceRoot();
        if (!root) {
            vscode.window.showErrorMessage('Open a workspace folder first · 워크스페이스를 먼저 여세요.');
            return;
        }
        try {
            await regenerateTraces(root);
            lastLivePayload = undefined;
            vscode.window.showInformationMessage('viewer/traces.json regenerated · trace 갱신 완료');
        }
        catch (e) {
            vscode.window.showErrorMessage(`Trace generation failed · trace 생성 실패: ${e}`);
        }
    }), vscode.commands.registerCommand('cellCoding.runActiveCell', async () => {
        const root = workspaceRoot();
        if (!root) {
            vscode.window.showErrorMessage('Open a workspace folder first · 워크스페이스를 먼저 여세요.');
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor || !editor.document.fileName.endsWith('.cell')) {
            vscode.window.showErrorMessage('Open a .cell file first · .cell 파일을 먼저 여세요.');
            return;
        }
        const signalType = await vscode.window.showInputBox({
            prompt: 'Signal type to inject · 주입할 신호 타입',
            value: 'WaterSample',
        });
        if (!signalType)
            return;
        const signalJson = await vscode.window.showInputBox({
            prompt: 'Signal JSON data · 신호 JSON',
            value: '{"turbidity":0.2,"flowRate":10}',
        });
        if (!signalJson)
            return;
        try {
            JSON.parse(signalJson);
        }
        catch {
            vscode.window.showErrorMessage('Invalid JSON · JSON 형식 오류');
            return;
        }
        const cellFile = editor.document.fileName;
        const out = liveRunPath(root);
        fs.mkdirSync(path.dirname(out), { recursive: true });
        const cfg = viewerConfig();
        const functionsPath = cfg.functionsPath
            ? path.isAbsolute(cfg.functionsPath)
                ? cfg.functionsPath
                : path.join(root, cfg.functionsPath)
            : undefined;
        try {
            await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Cell run · 실행 중' }, () => runCellCli(root, cellFile, signalType, signalJson, {
                outFile: out,
                transpiled: cfg.runTranspiled,
                functionsPath,
                jaegerUiUrl: cfg.jaegerUiUrl,
            }));
            lastLivePayload = fs.readFileSync(out, 'utf-8');
            vscode.window.showInformationMessage('Live run complete · 실행 완료');
            openViewerPanel(context, lastLivePayload);
        }
        catch (e) {
            vscode.window.showErrorMessage(`Cell run failed · 실행 실패: ${e}`);
        }
    }), vscode.commands.registerCommand('cellCoding.inspectActiveCell', async () => {
        const root = workspaceRoot();
        if (!root) {
            vscode.window.showErrorMessage('Open a workspace folder first · 워크스페이스를 먼저 여세요.');
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor || !editor.document.fileName.endsWith('.cell')) {
            vscode.window.showErrorMessage('Open a .cell file first · .cell 파일을 먼저 여세요.');
            return;
        }
        const cellFile = editor.document.fileName;
        const targets = ['(whole file)', 'FilterTissue', 'SpongeBody', 'EchoTissue'];
        const pick = await vscode.window.showQuickPick(targets, {
            placeHolder: 'Inspect target (optional) · inspect 대상(선택)',
        });
        if (!pick)
            return;
        const target = pick === '(whole file)' ? undefined : pick;
        try {
            const { ok, output } = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Cell inspect · 분석 중' }, () => runInspectCli(root, cellFile, target));
            const channel = vscode.window.createOutputChannel('Cell Inspect');
            channel.clear();
            channel.appendLine(output);
            channel.show(true);
            const payloadJson = await buildInspectPayload(root, cellFile);
            lastLivePayload = payloadJson;
            openViewerPanel(context, payloadJson);
            if (ok) {
                vscode.window.showInformationMessage('Inspect complete · 분석 완료 — Viewer opened');
            }
            else {
                vscode.window.showWarningMessage('Inspect found issues · 문제 발견 — see Output & Viewer');
            }
        }
        catch (e) {
            vscode.window.showErrorMessage(`Cell inspect failed · 분석 실패: ${e}`);
        }
    }), vscode.commands.registerCommand('cellCoding.testActiveCell', async () => {
        const root = workspaceRoot();
        if (!root) {
            vscode.window.showErrorMessage('Open a workspace folder first · 워크스페이스를 먼저 여세요.');
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor || !editor.document.fileName.endsWith('.cell')) {
            vscode.window.showErrorMessage('Open a .cell file first · .cell 파일을 먼저 여세요.');
            return;
        }
        const targets = ['(all suites)', 'InflowSenseCell', 'FilterDecideCell', 'FilterTissue', 'SpongeBody'];
        const pick = await vscode.window.showQuickPick(targets, {
            placeHolder: 'Test target (cell / tissue / organ) · 테스트 대상',
        });
        if (!pick)
            return;
        const cellFile = editor.document.fileName;
        const target = pick === '(all suites)' ? undefined : pick;
        try {
            const { ok, output } = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Cell Lab · 테스트 실행' }, () => runCellTestCli(root, cellFile, target));
            const channel = vscode.window.createOutputChannel('Cell Lab');
            channel.clear();
            channel.appendLine(output);
            channel.show(true);
            if (ok) {
                vscode.window.showInformationMessage('Cell Lab passed · 테스트 통과');
            }
            else {
                vscode.window.showErrorMessage('Cell Lab failed · 테스트 실패 — see Output');
            }
        }
        catch (e) {
            vscode.window.showErrorMessage(`Cell Lab error · 테스트 오류: ${e}`);
        }
    }), vscode.commands.registerCommand('cellCoding.openViewer', async () => {
        const root = workspaceRoot();
        if (!root) {
            vscode.window.showErrorMessage('Open a workspace folder first · 워크스페이스를 먼저 여세요.');
            return;
        }
        let payload = loadViewerPayload(root);
        if (!payload) {
            const act = await vscode.window.showWarningMessage('No viewer traces found. Generate batch traces? · trace 없음. 일괄 생성할까요?', 'Generate', 'Cancel');
            if (act === 'Generate') {
                await vscode.commands.executeCommand('cellCoding.refreshTraces');
                payload = loadViewerPayload(root);
            }
            if (!payload)
                return;
        }
        openViewerPanel(context, payload);
    }));
}
function deactivate() {
    liveRunWatcher?.close();
}
//# sourceMappingURL=extension.js.map