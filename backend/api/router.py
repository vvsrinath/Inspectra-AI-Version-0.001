import time
import uuid
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse, PlainTextResponse

from reports.csp_report_generator import generate_csp_csv, generate_csp_pdf
from reports.ttdc_report_generator import generate_csv_export, generate_ttdc_pdf
from services.batch_statistics import BatchStatistics
from services.csp_analyzer import CspAnalyzer
from services.material_analyzer import METRIC_COLUMNS, MaterialAnalyzer

router = APIRouter()
analyzer = MaterialAnalyzer()
batch_engine = BatchStatistics()
csp_engine = CspAnalyzer()


def _workspace_id(request: Request) -> str:
    return getattr(request.state, "workspace_id", "anonymous")


@router.get("/")
def health_check():
    return {"status": "ok", "message": "Inspectra AI Backend is running"}


@router.post("/analyze-material")
async def analyze_material(
    request: Request,
    file: UploadFile = File(...),
    reference: Optional[UploadFile] = File(None),
    lot_id: Optional[str] = Form(None),
    mill_name: Optional[str] = Form(None),
    operator: Optional[str] = Form("MMN"),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    image_bytes = await file.read()
    ref_bytes = await reference.read() if reference else None

    try:
        result = analyzer.analyze(image_bytes, ref_bytes, test_id="S1")
        result["analysis_id"] = f"INS-{uuid.uuid4().hex[:10].upper()}"
        result["timestamp"] = time.strftime("%d/%m/%Y %H:%M:%S", time.gmtime())
        result["workspace_id"] = _workspace_id(request)
        result["report_meta"] = {
            "lot_id": lot_id or "SINGLE",
            "mill_name": mill_name or "",
            "operator": operator or "MMN",
            "serial_no": str(uuid.uuid4().int)[:7],
        }
        result["columns"] = METRIC_COLUMNS
        result["rows"] = [{"test_id": "S1", "values": result["values"]}]
        result["sample_count"] = 1
        result["explanation"] = result.get("findings", [])
        result["reference_insights"] = "; ".join(result["findings"][:2])
        result["recommendation"] = (
            "Approved for production."
            if result["verdict"] == "PASS"
            else "Review recommended before production release."
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}") from e


@router.post("/compare-batch")
async def compare_batch(
    request: Request,
    lot_id: str = Form("C:00000"),
    mill_name: str = Form(""),
    operator: str = Form("MMN"),
    samples: list[UploadFile] = File(...),
    reference: Optional[UploadFile] = File(None),
):
    if len(samples) < 2:
        raise HTTPException(status_code=400, detail="At least 2 sample images required")
    if len(samples) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 samples per batch")

    ref_bytes = await reference.read() if reference else None
    labeled: list[tuple[str, bytes]] = []
    for i, f in enumerate(samples):
        if not f.content_type or not f.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail=f"Invalid file type: {f.filename}")
        data = await f.read()
        labeled.append((f"S{i + 1}", data))

    try:
        result = batch_engine.compare_batch(labeled, ref_bytes, lot_id, mill_name, operator)
        result["analysis_id"] = f"INS-{uuid.uuid4().hex[:10].upper()}"
        result["timestamp"] = time.strftime("%d/%m/%Y %H:%M:%S", time.gmtime())
        result["workspace_id"] = _workspace_id(request)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch comparison failed: {str(e)}") from e


@router.post("/generate-report")
async def create_report(data: dict):
    try:
        pdf_b64 = generate_ttdc_pdf(data)
        return {"pdf_base64": pdf_b64}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}") from e


@router.post("/export-csv")
async def export_csv(data: dict):
    try:
        csv_text = generate_csv_export(data)
        return PlainTextResponse(content=csv_text, media_type="text/csv")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV export failed: {str(e)}") from e


@router.post("/csp-report")
async def csp_report(
    request: Request,
    file: UploadFile = File(...),
    lot_id: Optional[str] = Form(None),
    mill_name: Optional[str] = Form(None),
    operator: Optional[str] = Form("MMN"),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    image_bytes = await file.read()

    try:
        result = csp_engine.analyze(image_bytes)
        result["analysis_id"] = f"CSP-{uuid.uuid4().hex[:10].upper()}"
        result["timestamp"] = time.strftime("%d/%m/%Y %H:%M:%S", time.gmtime())
        result["workspace_id"] = _workspace_id(request)
        result["report_meta"] = {
            "lot_id": lot_id or "SINGLE",
            "mill_name": mill_name or "",
            "operator": operator or "MMN",
            "serial_no": str(uuid.uuid4().int)[:7],
        }
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSP analysis failed: {str(e)}") from e


@router.post("/csp-report/pdf")
async def csp_pdf(data: dict):
    try:
        pdf_b64 = generate_csp_pdf(data)
        return {"pdf_base64": pdf_b64}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSP PDF failed: {str(e)}") from e


@router.post("/csp-report/csv")
async def csp_csv(data: dict):
    try:
        csv_text = generate_csp_csv(data)
        return PlainTextResponse(content=csv_text, media_type="text/csv")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSP CSV failed: {str(e)}") from e


@router.get("/auth/google")
def google_auth():
    return {"status": "success", "auth_url": "mock-oauth-url", "token": "mock-token-xyz"}


@router.post("/save-to-drive")
async def save_to_drive(data: dict):
    return {
        "status": "success",
        "message": "Report successfully saved to Inspectra AI/Reports in Google Drive",
    }
