"""Simulated camera / motion sensor · 가상 카메라·모션 센서."""

from __future__ import annotations

import random
from typing import Any


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
