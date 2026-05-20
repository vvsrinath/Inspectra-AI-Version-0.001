import json
import time
from pathlib import Path

import cv2
import numpy as np
from skimage.feature import graycomatrix, graycoprops, local_binary_pattern
from skimage.metrics import structural_similarity as ssim_fn

SPECS_PATH = Path(__file__).resolve().parent.parent / "data" / "lab_specs.json"
METRIC_COLUMNS = [
    "SSIM", "TEX", "WVE", "SHP", "EDG", "UNF", "STN", "SIM", "QLY", "GRD"
]
SIZE = 256


def _load_specs() -> dict:
    with open(SPECS_PATH, encoding="utf-8") as f:
        return json.load(f)


class MaterialAnalyzer:
    def __init__(self):
        self.specs = _load_specs()

    def _decode(self, image_bytes: bytes) -> np.ndarray:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image")
        return cv2.resize(img, (SIZE, SIZE))

    def _raw_metrics(
        self, img: np.ndarray, reference_gray: np.ndarray | None = None
    ) -> dict[str, float]:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (3, 3), 0)

        # GLCM texture
        glcm = graycomatrix(
            gray, distances=[1], angles=[0], levels=256, symmetric=True, normed=True
        )
        contrast = float(graycoprops(glcm, "contrast")[0, 0])
        tex = min(max(100 - contrast / 3.0, 0), 100)

        # FFT weave energy
        f = np.fft.fft2(gray.astype(np.float32))
        fshift = np.fft.fftshift(f)
        magnitude = np.abs(fshift)
        h, w = magnitude.shape
        cy, cx = h // 2, w // 2
        mask = np.ones((h, w), np.uint8)
        cv2.circle(mask, (cx, cy), 8, 0, -1)
        ring_energy = float(np.mean(magnitude[mask == 1]))
        wve = min(ring_energy / 15.0, 100)

        # Sharpness
        lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        shp = min(lap_var / 50.0, 100)

        # Edge density
        edges = cv2.Canny(gray, 80, 160)
        edg = float(np.sum(edges > 0) / (SIZE * SIZE)) * 100

        # Uniformity (inverse local variance)
        local_std = float(np.std(gray))
        unf = max(min(100 - local_std / 2.0, 100), 0)

        # Stain heuristic (HSV bright/low-sat blobs)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        stain_mask = cv2.inRange(hsv, (0, 0, 180), (180, 60, 255))
        stn = float(np.sum(stain_mask > 0) / (SIZE * SIZE)) * 100

        # SSIM vs reference
        if reference_gray is not None:
            ref_r = cv2.resize(reference_gray, (SIZE, SIZE))
            ssim_val = float(ssim_fn(ref_r, gray, data_range=255)) * 100
        else:
            ssim_val = 100.0

        return {
            "SSIM": round(ssim_val, 2),
            "TEX": round(tex, 2),
            "WVE": round(wve, 2),
            "SHP": round(shp, 2),
            "EDG": round(edg, 2),
            "UNF": round(unf, 2),
            "STN": round(stn, 2),
        }

    def _composite_sim(self, metrics: dict[str, float]) -> float:
        w = self.specs["sim_weights"]
        total = sum(metrics.get(k, 0) * w.get(k, 0) for k in w)
        stain_penalty = max(0, metrics.get("STN", 0) - 10) * 0.3
        return round(max(min(total - stain_penalty, 100), 0), 2)

    def _quality_score(self, metrics: dict[str, float]) -> float:
        sim = metrics.get("SIM", 0)
        stn = metrics.get("STN", 0)
        qly = sim * 0.7 + (100 - stn) * 0.3
        return round(max(min(qly, 100), 0), 2)

    def _grade(self, qly: float) -> str:
        for entry in self.specs["grade_from_qly"]:
            if qly >= entry["min"]:
                return entry["grade"]
        return "D"

    def _verdict(self, qly: float, stn: float) -> str:
        th = self.specs["pass_thresholds"]
        if qly >= th["QLY"]["pass_min"] and stn <= th["STN"]["pass_max"]:
            return "PASS"
        if qly >= th["QLY"]["warn_min"] and stn <= th["STN"]["warn_max"]:
            return "WARN"
        return "FAIL"

    def _findings(self, metrics: dict[str, float], verdict: str) -> list[str]:
        findings = []
        if metrics["TEX"] > 70:
            findings.append("Fine uniform texture pattern detected")
        else:
            findings.append("Coarse or irregular texture detected")
        if metrics["EDG"] > 12:
            findings.append("Tight weave structure")
        else:
            findings.append("Loose or open weave structure")
        if metrics["STN"] > 15:
            findings.append("Elevated stain index — inspect for contamination")
        else:
            findings.append("No significant staining detected")
        findings.append(f"Overall verdict: {verdict}")
        return findings

    def analyze(
        self,
        image_bytes: bytes,
        reference_bytes: bytes | None = None,
        test_id: str = "S1",
    ) -> dict:
        t0 = time.perf_counter()
        img = self._decode(image_bytes)
        ref_gray = None
        if reference_bytes:
            ref_img = self._decode(reference_bytes)
            ref_gray = cv2.cvtColor(ref_img, cv2.COLOR_BGR2GRAY)

        raw = self._raw_metrics(img, ref_gray)
        raw["SIM"] = self._composite_sim(raw)
        raw["QLY"] = self._quality_score(raw)
        raw["GRD"] = self._grade(raw["QLY"])
        verdict = self._verdict(raw["QLY"], raw["STN"])
        findings = self._findings(raw, verdict)

        elapsed = int((time.perf_counter() - t0) * 1000)

        return {
            "test_id": test_id,
            "columns": METRIC_COLUMNS,
            "values": {k: raw[k] for k in METRIC_COLUMNS},
            "metrics": raw,
            "verdict": verdict,
            "findings": findings,
            "quality_score": raw["QLY"],
            "similarity_score": raw["SIM"],
            "quality_status": "High" if verdict == "PASS" else ("Average" if verdict == "WARN" else "Low"),
            "texture_analysis": findings[0],
            "pattern_analysis": findings[1],
            "grade": raw["GRD"],
            "processing_ms": elapsed,
        }
