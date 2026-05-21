# Inspectra AI — Version 0.002

> Textile and cotton fabric analysis using **classical computer vision only** (no AI/ML models).
> Produces lab-style metric reports, multi-sample batch comparisons, CSP scoring, and downloadable PDF/CSV exports.

---

## About

Inspectra AI is a fabric quality-intelligence platform built for mills, quality-assurance labs, and textile buyers.
It uses classical image-processing pipelines (OpenCV + scikit-image) to extract quantitative metrics directly from fabric images — no neural networks, no cloud inference, no black-box scores.

### What it does

| Feature | Description |
|---|---|
| **Single-sample Analyze** | Upload one fabric image → receive a full lab report (SSIM, TEX, WVE, SHP, EDG, UNF, STN, SIM, QLY, GRD) |
| **Batch Compare** | Upload 2–10 images → side-by-side comparison table with statistical summary (mean, std-dev, CV%) |
| **CSP Reporter** | Count Strength Product analysis — USTER® benchmark comparison, BCI quality checks, cotton-type classification |
| **Dashboard** | Persistent history of every report, stored privately in your browser (IndexedDB) |
| **PDF / CSV / Drive export** | Download any report as a print-ready PDF or spreadsheet, or save to Google Drive |

### Why classical CV?

- **Reproducible** — same image always produces the same numbers.
- **Explainable** — every metric traces back to a concrete image-processing step.
- **Fast** — no GPU required; a typical analysis completes in < 300 ms.
- **Offline-capable** — the Python backend can run on a local machine or private server.

### Standards referenced

- USTER® Statistics 2023 — yarn CSP and unevenness benchmarks
- ISO 2061 — twist direction and count
- ASTM D1907 / D1425 — yarn count and evenness
- Better Cotton Initiative (BCI) quality thresholds
- BS EN ISO 13934-1 — tensile properties of fabrics

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS v4 + wouter |
| Backend | Python 3.12 · FastAPI · Uvicorn |
| CV pipeline | OpenCV · scikit-image · NumPy · SciPy |
| PDF reports | ReportLab |
| Database | PostgreSQL + Drizzle ORM (report metadata) |
| Monorepo | pnpm workspaces · Node.js 24 · TypeScript 5.9 |

---

## Project structure

```
/
├── artifacts/
│   ├── inspectra/          # React + Vite frontend  (preview at /)
│   └── api-server/         # Express scaffold (unused; FastAPI is the real backend)
├── backend/
│   ├── main.py             # FastAPI app — mounts /api
│   ├── api/router.py       # All API endpoints
│   ├── services/
│   │   ├── material_analyzer.py   # Single-sample CV pipeline
│   │   ├── batch_statistics.py    # Multi-sample statistics
│   │   └── csp_analyzer.py        # Cotton CSP pipeline
│   └── reports/
│       ├── ttdc_report_generator.py   # PDF/CSV for fabric reports
│       └── csp_report_generator.py    # PDF/CSV for CSP reports
└── packages/
    ├── api-spec/           # OpenAPI spec + Orval codegen
    └── db/                 # Drizzle schema + migrations
```

---

## Getting started

### Prerequisites

- Node.js ≥ 24 and pnpm ≥ 9
- Python ≥ 3.12
- PostgreSQL (or set `DATABASE_URL` to a hosted instance)

### Install and run

```bash
# Install JS dependencies
pnpm install

# Install Python dependencies
pip install -r backend/requirements.txt

# Start the FastAPI backend (port 8000)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload --app-dir backend

# Start the frontend dev server
pnpm --filter @workspace/inspectra run dev
```

### Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `VITE_API_URL` | No | `/api` (same origin) | Override FastAPI backend URL |

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/analyze-material` | Single fabric image analysis |
| `POST` | `/api/compare-batch` | Multi-sample batch comparison |
| `POST` | `/api/csp-report` | Cotton CSP analysis |
| `POST` | `/api/generate-report` | Generate PDF for fabric report |
| `POST` | `/api/export-csv` | Export fabric report as CSV |
| `POST` | `/api/csp-report/pdf` | Generate PDF for CSP report |
| `POST` | `/api/csp-report/csv` | Export CSP report as CSV |
| `POST` | `/api/save-to-drive` | Save report to Google Drive |

---

## Version history

| Version | Summary |
|---|---|
| 0.001 | Initial release — single-sample analysis, batch compare, lab report PDF/CSV, dashboard |
| **0.002** | Added **CSP Reporter** (Count Strength Product), USTER® benchmarks, BCI quality checks, CSP PDF/CSV/Drive downloads |

---

## License

MIT — see [LICENSE](LICENSE) for details.
