"""Simulated camera / motion / IMU sensors · 가상 카메라·모션·IMU 센서."""

from __future__ import annotations

import math
import random
import time
from typing import Any, Iterator


def simulate_motion(
    *,
    x: float | None = None,
    y: float | None = None,
    confidence: float | None = None,
    seed: int | None = None,
) -> dict[str, Any]:
    """Return a MotionDetected payload for `cell run` injection."""
    rng = random.Random(seed)
    return {
        "type": "MotionDetected",
        "data": {
            "x": x if x is not None else rng.randint(0, 640),
            "y": y if y is not None else rng.randint(0, 480),
            "confidence": confidence if confidence is not None else round(rng.uniform(0.2, 0.99), 2),
        },
    }


def simulate_imu_sample(
    *,
    timestamp: float | None = None,
    accel_x: float | None = None,
    accel_y: float | None = None,
    accel_z: float | None = None,
    gyro_x: float = 0.0,
    gyro_y: float = 0.0,
    gyro_z: float | None = None,
    seed: int | None = None,
    slope: float | None = None,
) -> dict[str, Any]:
    """Return an ImuSample payload for spiderling-sim `cell run` injection."""
    rng = random.Random(seed)
    ts = timestamp if timestamp is not None else time.time() * 1000
    slope_val = slope if slope is not None else round(rng.uniform(0.1, 0.7), 2)
    ax = accel_x if accel_x is not None else round(rng.uniform(-0.2, 0.2), 3)
    ay = accel_y if accel_y is not None else round(rng.uniform(-0.2, 0.2), 3)
    az = accel_z if accel_z is not None else round(9.81 + slope_val * 2.0, 3)
    gz = gyro_z if gyro_z is not None else round(rng.uniform(-0.1, 0.1), 3)
    return {
        "type": "ImuSample",
        "data": {
            "timestamp": ts,
            "accelX": ax,
            "accelY": ay,
            "accelZ": az,
            "gyroX": gyro_x,
            "gyroY": gyro_y,
            "gyroZ": gz,
        },
    }


def imu_magnitude(sample: dict[str, Any]) -> float:
    """L2 norm of accelerometer vector · 가속도 벡터 크기."""
    data = sample.get("data", sample)
    ax = float(data.get("accelX", 0.0))
    ay = float(data.get("accelY", 0.0))
    az = float(data.get("accelZ", 0.0))
    return math.sqrt(ax * ax + ay * ay + az * az)


def iter_imu_stream(
    *,
    samples: int = 5,
    interval_ms: float = 50.0,
    seed: int | None = None,
) -> Iterator[dict[str, Any]]:
    """Yield ImuSample payloads simulating a periodic stream · 주기 IMU 스트림."""
    rng = random.Random(seed)
    base_ts = time.time() * 1000
    for i in range(samples):
        yield simulate_imu_sample(
            timestamp=base_ts + i * interval_ms,
            slope=round(rng.uniform(0.1, 0.8), 2),
            seed=None if seed is None else seed + i,
        )
        if interval_ms > 0 and i + 1 < samples:
            time.sleep(interval_ms / 1000.0)


def simulate_vision_frame(
    *,
    contrast: float | None = None,
    motion: float | None = None,
    seed: int | None = None,
) -> dict[str, Any]:
    """Return a VisionFrame payload for spider-sim `cell run` injection."""
    rng = random.Random(seed)
    return {
        "type": "VisionFrame",
        "data": {
            "contrast": contrast if contrast is not None else round(rng.uniform(0.05, 0.95), 2),
            "motion": motion if motion is not None else round(rng.uniform(0.0, 0.8), 2),
        },
    }


def iter_vision_stream(
    *,
    samples: int = 3,
    interval_ms: float = 33.0,
    seed: int | None = None,
) -> Iterator[dict[str, Any]]:
    """Yield VisionFrame payloads simulating VisionStream · VisionStream 시뮬."""
    rng = random.Random(seed)
    base_ts = time.time() * 1000
    for i in range(samples):
        yield {
            "type": "VisionFrame",
            "data": {
                "timestamp": base_ts + i * interval_ms,
                "contrast": round(rng.uniform(0.2, 0.9), 2),
                "motion": round(rng.uniform(0.1, 0.7), 2),
            },
        }
        if interval_ms > 0 and i + 1 < samples:
            time.sleep(interval_ms / 1000.0)


def simulate_owner_ping(
    *,
    rssi: float | None = None,
    timestamp: float | None = None,
    seed: int | None = None,
) -> dict[str, Any]:
    """Return an OwnerPing payload for PET `cell run` injection · OwnerPing inject."""
    rng = random.Random(seed)
    data: dict[str, Any] = {
        "rssi": rssi if rssi is not None else round(rng.uniform(0.4, 0.95), 2),
    }
    if timestamp is not None:
        data["timestamp"] = timestamp
    return {"type": "OwnerPing", "data": data}


def iter_owner_stream(
    *,
    samples: int = 3,
    interval_ms: float = 500.0,
    rssi: float | None = None,
    seed: int | None = None,
) -> Iterator[dict[str, Any]]:
    """Yield OwnerPing payloads simulating OwnerStream · OwnerStream 시뮬."""
    rng = random.Random(seed)
    base_ts = time.time() * 1000
    for i in range(samples):
        sample_rssi = rssi if rssi is not None else round(rng.uniform(0.5, 0.85), 2)
        yield {
            "type": "OwnerPing",
            "data": {
                "timestamp": base_ts + i * interval_ms,
                "rssi": sample_rssi,
            },
        }
        if interval_ms > 0 and i + 1 < samples:
            time.sleep(interval_ms / 1000.0)
