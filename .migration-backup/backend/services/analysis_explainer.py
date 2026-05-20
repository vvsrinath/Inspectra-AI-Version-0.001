import json
from pathlib import Path

SPECS_PATH = Path(__file__).resolve().parent.parent / "data" / "lab_specs.json"


class AnalysisExplainer:
    def __init__(self):
        with open(SPECS_PATH, encoding="utf-8") as f:
            self.specs = json.load(f)
        self.cv_limits = self.specs["cv_limits_percent"]
        self.labels = self.specs.get("column_labels", {})

    def explain_batch(
        self,
        sample_rows: list[dict],
        statistics: dict,
        verdict: str,
    ) -> list[str]:
        lines = []
        n = len(sample_rows)
        lines.append(
            f"Batch analysis completed on {n} sample(s). Overall batch status: {verdict}."
        )

        cv = statistics.get("cv_percent", {})
        for col, val in cv.items():
            limit = self.cv_limits.get(col, self.cv_limits.get("default", 15))
            name = self.labels.get(col, col)
            if val > limit:
                lines.append(
                    f"C.V.% for {name} ({col}) is {val:.1f}%, exceeding lab tolerance of {limit}%."
                )
            else:
                lines.append(
                    f"C.V.% for {name} ({col}) is {val:.1f}%, within lab tolerance ({limit}%)."
                )

        if n >= 2:
            s1, s2 = sample_rows[0], sample_rows[1]
            for col in ["STN", "SIM", "QLY"]:
                v1 = s1["values"].get(col, 0)
                v2 = s2["values"].get(col, 0)
                if v1 and abs(v2 - v1) / max(v1, 1) > 0.1:
                    direction = "higher" if v2 > v1 else "lower"
                    lines.append(
                        f"{s2['test_id']} shows {abs(v2 - v1):.1f} points {direction} "
                        f"{self.labels.get(col, col)} than {s1['test_id']}."
                    )

        if verdict == "UNIFORM":
            lines.append("Batch is uniform — acceptable for production release.")
        elif verdict == "VARIABLE":
            lines.append("Batch shows variation — recommend additional sampling before release.")
        else:
            lines.append("Batch rejected — significant variation across key metrics.")

        return lines

    def explain_single(self, result: dict) -> list[str]:
        return result.get("findings", [])
