import json
import time
import uuid
from pathlib import Path

import numpy as np

from services.material_analyzer import METRIC_COLUMNS, MaterialAnalyzer
from services.analysis_explainer import AnalysisExplainer

SPECS_PATH = Path(__file__).resolve().parent.parent / "data" / "lab_specs.json"


def _load_cv_limits() -> dict:
    with open(SPECS_PATH, encoding="utf-8") as f:
        return json.load(f)["cv_limits_percent"]


class BatchStatistics:
    def __init__(self):
        self.analyzer = MaterialAnalyzer()
        self.explainer = AnalysisExplainer()
        self.cv_limits = _load_cv_limits()

    def compare_batch(
        self,
        samples: list[tuple[str, bytes]],
        reference_bytes: bytes | None,
        lot_id: str,
        mill_name: str,
        operator: str,
    ) -> dict:
        t0 = time.perf_counter()
        ref = reference_bytes
        rows = []
        numeric_cols = [c for c in METRIC_COLUMNS if c != "GRD"]

        for label, img_bytes in samples:
            result = self.analyzer.analyze(img_bytes, ref, test_id=label)
            rows.append(
                {
                    "test_id": label,
                    "values": result["values"],
                    "verdict": result["verdict"],
                }
            )

        matrix = np.array([[r["values"][c] for c in numeric_cols] for r in rows])
        means = np.mean(matrix, axis=0)
        stds = np.std(matrix, axis=0, ddof=1) if len(rows) > 1 else np.zeros(len(numeric_cols))
        with np.errstate(divide="ignore", invalid="ignore"):
            cv_pct = np.where(means != 0, (stds / means) * 100, 0)

        stats = {
            "mean": {numeric_cols[i]: round(float(means[i]), 2) for i in range(len(numeric_cols))},
            "std_dev": {numeric_cols[i]: round(float(stds[i]), 2) for i in range(len(numeric_cols))},
            "cv_percent": {
                numeric_cols[i]: round(float(cv_pct[i]), 2) for i in range(len(numeric_cols))
            },
        }

        stat_rows = [
            {"test_id": "MEAN", "values": stats["mean"]},
            {"test_id": "STD DEV", "values": stats["std_dev"]},
            {"test_id": "C.V.%", "values": stats["cv_percent"]},
        ]

        verdict = self._batch_verdict(stats["cv_percent"])
        explanation = self.explainer.explain_batch(rows, stats, verdict)

        elapsed = int((time.perf_counter() - t0) * 1000)
        serial = str(uuid.uuid4().int)[:7]

        mean_qly = float(stats["mean"].get("QLY", 0))
        grade = "A" if mean_qly >= 85 else "B" if mean_qly >= 70 else "C" if mean_qly >= 55 else "D"

        return {
            "report_type": "comparison",
            "report_meta": {
                "lot_id": lot_id,
                "mill_name": mill_name,
                "operator": operator,
                "serial_no": serial,
                "report_version": "1.0.0",
            },
            "columns": METRIC_COLUMNS,
            "rows": rows + stat_rows,
            "sample_rows": rows,
            "statistics": stats,
            "sample_count": len(rows),
            "verdict": verdict,
            "grade": grade,
            "explanation": explanation,
            "findings": explanation,
            "quality_score": round(mean_qly, 1),
            "similarity_score": round(float(stats["mean"].get("SIM", 0)), 1),
            "quality_status": "High" if verdict == "UNIFORM" else "Variable",
            "texture_analysis": "Batch texture comparison (classical GLCM)",
            "pattern_analysis": "Batch weave comparison (classical FFT/edges)",
            "processing_ms": elapsed,
        }

    def _batch_verdict(self, cv_percent: dict[str, float]) -> str:
        limits = self.cv_limits
        default_limit = limits.get("default", 15)
        violations = 0
        for col, val in cv_percent.items():
            limit = limits.get(col, default_limit)
            if val > limit:
                violations += 1
        if violations == 0:
            return "UNIFORM"
        if violations <= 2:
            return "VARIABLE"
        return "REJECT"
