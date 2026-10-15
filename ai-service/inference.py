"""Stateless, bounded history adapter for the upstream 15-second model.

Replaying decisions from a batch of causal features avoids recomputing the entire
feature table for every historic row. No synthetic readings fill missing time.
"""
from datetime import datetime, timezone
from math import isfinite
from zoneinfo import ZoneInfo

import numpy as np

from restroom_unified import features as F
from restroom_unified.model import UnifiedJudge

MODEL_VERSION = "e66ee4e67d79a87a0e6b9fe4790ec33e7b7c0267"
LOCAL_TIME = ZoneInfo("Asia/Seoul")


def number(row, key, low, high, optional=False):
    value = row.get(key)
    if optional and value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{key} must be a number")
    if not isfinite(value) or not low <= value <= high:
        raise ValueError(f"{key} must be between {low} and {high}")
    return float(value)


def evaluate(payload, model):
    if not isinstance(payload, dict):
        raise ValueError("Expected a JSON object")
    device_id = payload.get("deviceId")
    rows = payload.get("samples")
    if not isinstance(device_id, str) or not 1 <= len(device_id) <= 100:
        raise ValueError("deviceId is required")
    if not isinstance(rows, list) or not 1 <= len(rows) <= F.BUFFER_ROWS:
        raise ValueError(f"Expected 1 to {F.BUFFER_ROWS} samples")
    stamps, values = [], []
    for row in rows:
        if not isinstance(row, dict) or not isinstance(row.get("at"), str):
            raise ValueError("Each sample needs an ISO timestamp")
        at = datetime.fromisoformat(row["at"].replace("Z", "+00:00"))
        if at.tzinfo is None:
            raise ValueError("Timestamps must include a UTC offset")
        at = at.astimezone(LOCAL_TIME)
        if stamps and (at - stamps[-1]).total_seconds() != F.DT:
            raise ValueError("Samples must be ordered, unique and exactly 15 seconds apart")
        stamps.append(at)
        values.append((number(row, "temperature", -40, 80), number(row, "humidity", 0, 100),
                       number(row, "mq135Adc", 0, 4095), number(row, "mq7Adc", 0, 4095, True)))

    judge = UnifiedJudge(device_id, model=model)
    if len(rows) < F.WARMUP_ROWS:
        result = judge.add(stamps[-1], *values[-1])
    else:
        matrix = np.asarray([[np.nan if v is None else v for v in row] for row in values])
        timestamps = np.array([np.datetime64(t.replace(tzinfo=None), "ns") for t in stamps])
        features = F.compute_features(timestamps, *matrix.T)
        # Replaying all ready rows restores persistence and leak/door timers on
        # every request, including immediately after either service restarts.
        probabilities = model.predict(features.iloc[F.WARMUP_ROWS - 1:].to_numpy())
        for index, probs in enumerate(probabilities, start=F.WARMUP_ROWS - 1):
            result = judge._decide(stamps[index], dict(zip(model.labels, map(float, probs))), values[index][0])

    result["at"] = stamps[-1].astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    result["historyRows"] = len(rows)
    result["warmupRows"] = F.WARMUP_ROWS
    result["modelVersion"] = MODEL_VERSION
    result["syntheticModel"] = True
    # Only explicitly qualified MQ-7 readings are supplied by the backend.
    result["mq7Available"] = any(v[3] is not None for v in values[-30:])
    return result
