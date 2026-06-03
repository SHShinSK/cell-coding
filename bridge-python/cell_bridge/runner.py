"""Run `.cell` programs via the TypeScript `cell run` CLI."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any


def repo_root() -> Path:
    """Resolve monorepo root (parent of bridge-python/)."""
    return Path(__file__).resolve().parents[2]


def typescript_dir() -> Path:
    return repo_root() / "typescript"


def _cell_run_cmd(
    cell_path: Path,
    signal_type: str,
    signal_data: dict[str, Any],
    *,
    node: str | None = None,
    transpiled: bool = False,
    functions: str | Path | None = None,
    jaeger_ui_url: str | None = None,
    stream_name: str | None = None,
    stream_samples: int | None = None,
    stream_interval_ms: float | None = None,
    stream_payload_file: str | Path | None = None,
) -> tuple[list[str], str | Path]:
    """Build `cell run --json` argv and working directory."""
    cell_cli = os.environ.get("CELL_CLI", "cell")
    cell_bin = shutil.which(cell_cli.split()[0]) if cell_cli else None
    ts_dir = typescript_dir()

    if cell_bin and not (ts_dir / "run.ts").exists():
        cmd = [cell_cli, "run", "--json"]
        cwd: str | Path = cell_path.parent
        cell_arg = str(cell_path)
    elif cell_bin and os.environ.get("CELL_FORCE_GLOBAL_CLI") == "1":
        cmd = [cell_cli, "run", "--json"]
        cwd = cell_path.parent
        cell_arg = str(cell_path)
    elif (ts_dir / "run.ts").exists():
        node_bin = node or os.environ.get("CELL_NODE", "node")
        cmd = [node_bin, "--import", "tsx", "run.ts", "--json"]
        cwd = ts_dir
        cell_arg = os.path.relpath(cell_path, ts_dir).replace("\\", "/")
    elif cell_bin:
        cmd = [cell_cli, "run", "--json"]
        cwd = cell_path.parent
        cell_arg = str(cell_path)
    else:
        raise RuntimeError(
            "cell CLI not found · `npm install -g @cell-coding/cli` or clone monorepo with typescript/"
        )

    if transpiled:
        cmd.append("--transpiled")
    if functions:
        fn_path = Path(functions).resolve()
        if cwd == ts_dir:
            cmd.extend(["--functions", os.path.relpath(fn_path, ts_dir).replace("\\", "/")])
        else:
            cmd.extend(["--functions", str(fn_path)])
    jaeger = jaeger_ui_url or os.environ.get("JAEGER_UI_URL")
    if jaeger:
        cmd.extend(["--jaeger", jaeger])
    if stream_name is not None:
        cmd.append("--stream")
        if stream_name:
            cmd.append(stream_name)
        if stream_samples is not None:
            cmd.extend(["--samples", str(stream_samples)])
        if stream_interval_ms is not None:
            cmd.extend(["--interval-ms", str(stream_interval_ms)])
    if stream_payload_file:
        payload_arg = f"@{Path(stream_payload_file).resolve()}"
    else:
        payload_arg = json.dumps(signal_data)
    cmd.extend([cell_arg, signal_type, payload_arg])
    return cmd, cwd


def run_cell_file(
    cell_file: str | Path,
    signal_type: str,
    signal_data: dict[str, Any],
    *,
    node: str | None = None,
    transpiled: bool = False,
    functions: str | Path | None = None,
    jaeger_ui_url: str | None = None,
) -> dict[str, Any]:
    """Execute `cell run --json` and return parsed payload."""
    cell_path = Path(cell_file).resolve()
    cmd, cwd = _cell_run_cmd(
        cell_path,
        signal_type,
        signal_data,
        node=node,
        transpiled=transpiled,
        functions=functions,
        jaeger_ui_url=jaeger_ui_url,
    )

    proc = subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )

    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or "cell run failed")

    return json.loads(proc.stdout)


def run_cell_stream(
    cell_file: str | Path,
    signal_type: str,
    *,
    stream_name: str = "",
    samples: list[dict[str, Any]] | None = None,
    template: dict[str, Any] | None = None,
    sample_count: int = 5,
    interval_ms: float = 50.0,
    node: str | None = None,
    transpiled: bool = False,
    functions: str | Path | None = None,
    jaeger_ui_url: str | None = None,
) -> dict[str, Any]:
    """Execute `cell run --json --stream` with batch samples · stream 주기 inject."""
    cell_path = Path(cell_file).resolve()
    payload_file: Path | None = None
    signal_data = template or {}

    if samples is not None:
        import tempfile

        payload = [{"data": s} if "type" not in s else s for s in samples]
        tmp = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8")
        json.dump(payload, tmp)
        tmp.close()
        payload_file = Path(tmp.name)
        signal_data = samples[0] if samples else (template or {})
    elif template is None:
        signal_data = {}

    cmd, cwd = _cell_run_cmd(
        cell_path,
        signal_type,
        signal_data,
        node=node,
        transpiled=transpiled,
        functions=functions,
        jaeger_ui_url=jaeger_ui_url,
        stream_name=stream_name,
        stream_samples=sample_count if samples is None else len(samples),
        stream_interval_ms=interval_ms,
        stream_payload_file=payload_file,
    )

    try:
        proc = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
    finally:
        if payload_file is not None:
            payload_file.unlink(missing_ok=True)

    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or "cell run --stream failed")

    return json.loads(proc.stdout)
