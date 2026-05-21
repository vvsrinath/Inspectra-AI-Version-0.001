"""
CSP Report PDF and CSV generators.
Classical CV only — no AI/ML models.
"""

import base64
import csv
import io
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _fmt(v) -> str:
    if isinstance(v, float):
        return f"{v:.2f}"
    return str(v)


def generate_csp_pdf(data: dict) -> str:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = getSampleStyleSheet()
    story = []

    meta = data.get("report_meta", {})
    ts = data.get("timestamp") or datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M:%S")
    analysis_id = data.get("analysis_id", "—")
    grade = data.get("grade", "—")
    grade_label = data.get("grade_label", "—")
    csp = data.get("csp", 0)
    ne = data.get("estimated_ne", 0)
    benchmark = data.get("benchmark", {})
    cotton_type = data.get("cotton_type", {})
    bci = data.get("bci_status", {})

    # ── Title ──────────────────────────────────────────────────────────
    story.append(Paragraph(
        "<b>INSPECTRA AI — COTTON COUNT STRENGTH PRODUCT (CSP) REPORT</b>",
        styles["Title"],
    ))
    story.append(Paragraph(
        "Classical CV Analysis — No AI/ML Models Used",
        styles["Heading3"],
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph(
        f"Lot ID: {meta.get('lot_id', 'N/A')}  {meta.get('mill_name', '')}",
        styles["Normal"],
    ))
    story.append(Paragraph(
        f"{ts} &nbsp;&nbsp; Operator: {meta.get('operator', 'N/A')} &nbsp;&nbsp; "
        f"Serial No.: {meta.get('serial_no', '0000000')} &nbsp;&nbsp; ID: {analysis_id}",
        styles["Normal"],
    ))
    story.append(Spacer(1, 14))

    # ── CSP Score + Grade ──────────────────────────────────────────────
    story.append(Paragraph("<b>CSP SCORE SUMMARY</b>", styles["Heading2"]))
    summary_data = [
        ["CSP Score", "Grade", "Ne (count)", "Cotton Type", "Weave Type", "USTER® Percentile"],
        [
            str(csp),
            f"{grade} — {grade_label}",
            str(ne),
            cotton_type.get("name", "—"),
            data.get("weave_type", "—"),
            benchmark.get("uster_percentile", "—"),
        ],
    ]
    t = Table(summary_data, colWidths=[(_letter_width() / 6)] * 6)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4a4a4a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#f5f5f5")),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    # ── Fibre metrics ──────────────────────────────────────────────────
    story.append(Paragraph("<b>FIBRE METRICS</b>", styles["Heading2"]))
    metrics_data = [
        ["Metric", "Value", "BCI Threshold", "Status"],
        ["Uniformity Index (%)", _fmt(data.get("uniformity_index", 0)), "≥ 82%",
         "PASS" if data.get("uniformity_index", 0) >= 82 else "FAIL"],
        ["Fiber Fineness (µ proxy)", _fmt(data.get("fiber_fineness_index", 0)), "3.5–4.9 optimal", ""],
        ["Nep Index (per g equiv.)", _fmt(data.get("nep_index", 0)), "< 200", 
         "PASS" if data.get("nep_index", 0) < 200 else "FAIL"],
        ["Short Fiber Index (%)", _fmt(data.get("short_fiber_index", 0)), "< 10%",
         "PASS" if data.get("short_fiber_index", 0) < 10 else "FAIL"],
        ["Strength Factor", _fmt(data.get("strength_factor", 0)), "≥ 26 g/tex",
         "PASS" if data.get("strength_factor", 0) >= 26 else "FAIL"],
    ]
    col_w = _letter_width() / 4
    mt = Table(metrics_data, colWidths=[col_w * 1.4, col_w * 0.7, col_w * 0.9, col_w * 0.6])
    pass_fail_style = []
    for i, row in enumerate(metrics_data[1:], 1):
        if row[-1] == "PASS":
            pass_fail_style.append(("TEXTCOLOR", (3, i), (3, i), colors.HexColor("#16a34a")))
        elif row[-1] == "FAIL":
            pass_fail_style.append(("TEXTCOLOR", (3, i), (3, i), colors.HexColor("#dc2626")))
    mt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4a4a4a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        *pass_fail_style,
    ]))
    story.append(mt)
    story.append(Spacer(1, 12))

    # ── USTER benchmark table ──────────────────────────────────────────
    story.append(Paragraph(
        f"<b>USTER® CSP BENCHMARKS — {benchmark.get('ne_range', '—')}</b>",
        styles["Heading2"],
    ))
    bench_data = [
        ["Category", "CSP Value", "Your Score"],
        ["Excellent (top 25%)", str(benchmark.get("csp_excellent", "—")), ""],
        ["Good (25–50%)", str(benchmark.get("csp_good", "—")), ""],
        ["Average (50–75%)", str(benchmark.get("csp_average", "—")), ""],
        ["Below average", str(benchmark.get("csp_below", "—")), ""],
        ["Your CSP", "", str(csp)],
    ]
    bt = Table(bench_data, colWidths=[_letter_width() / 3] * 3)
    bt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4a4a4a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#e8f5e9")),
    ]))
    story.append(bt)
    story.append(Spacer(1, 12))

    # ── BCI checks ────────────────────────────────────────────────────
    story.append(Paragraph("<b>BETTER COTTON INITIATIVE (BCI) QUALITY CHECKS</b>", styles["Heading2"]))
    story.append(Paragraph(
        f"Status: <b>{bci.get('status', '—')}</b> — {bci.get('passed', 0)}/{bci.get('total', 0)} checks passed",
        styles["Normal"],
    ))
    story.append(Spacer(1, 4))
    bci_checks = bci.get("checks", {})
    if bci_checks:
        bci_data = [["BCI Check", "Result"]]
        for check, passed in bci_checks.items():
            bci_data.append([check, "✓ PASS" if passed else "✗ FAIL"])
        bci_t = Table(bci_data, colWidths=[_letter_width() * 0.75, _letter_width() * 0.25])
        bci_style = []
        for i, row in enumerate(bci_data[1:], 1):
            if row[1].startswith("✓"):
                bci_style.append(("TEXTCOLOR", (1, i), (1, i), colors.HexColor("#16a34a")))
            else:
                bci_style.append(("TEXTCOLOR", (1, i), (1, i), colors.HexColor("#dc2626")))
        bci_t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4a4a4a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
            ("ALIGN", (1, 0), (1, -1), "CENTER"),
            *bci_style,
        ]))
        story.append(bci_t)
    story.append(Spacer(1, 12))

    # ── Findings ─────────────────────────────────────────────────────
    findings = data.get("findings", [])
    if findings:
        story.append(Paragraph("<b>ANALYSIS FINDINGS</b>", styles["Heading2"]))
        for line in findings:
            story.append(Paragraph(f"• {line}", styles["Normal"]))
            story.append(Spacer(1, 3))
        story.append(Spacer(1, 8))

    # ── Cotton type description ───────────────────────────────────────
    story.append(Paragraph(
        f"<b>Cotton type:</b> {cotton_type.get('name', '—')} ({cotton_type.get('examples', '—')})",
        styles["Normal"],
    ))
    story.append(Paragraph(cotton_type.get("description", ""), styles["Normal"]))
    story.append(Spacer(1, 12))

    # ── Standards ────────────────────────────────────────────────────
    story.append(Paragraph("<b>STANDARDS REFERENCED</b>", styles["Heading3"]))
    for ref in data.get("standard_refs", []):
        story.append(Paragraph(f"• {ref}", styles["Normal"]))
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "Method: INS-CSP-001 | OpenCV + scikit-image classical analysis | "
        "<b>No AI/ML models used</b> | Inspectra AI",
        styles["Italic"],
    ))

    doc.build(story)
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")


def generate_csp_csv(data: dict) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    meta = data.get("report_meta", {})
    benchmark = data.get("benchmark", {})
    cotton_type = data.get("cotton_type", {})
    bci = data.get("bci_status", {})

    writer.writerow(["INSPECTRA AI — Cotton CSP Report"])
    writer.writerow(["Analysis ID", data.get("analysis_id", "")])
    writer.writerow(["Timestamp", data.get("timestamp", "")])
    writer.writerow(["Lot ID", meta.get("lot_id", "")])
    writer.writerow(["Mill", meta.get("mill_name", "")])
    writer.writerow(["Operator", meta.get("operator", "")])
    writer.writerow([])

    writer.writerow(["CSP SCORE SUMMARY"])
    writer.writerow(["CSP Score", "Grade", "Grade Label", "Ne (count)", "Strength Factor", "Weave Type", "USTER Percentile"])
    writer.writerow([
        data.get("csp", ""),
        data.get("grade", ""),
        data.get("grade_label", ""),
        data.get("estimated_ne", ""),
        data.get("strength_factor", ""),
        data.get("weave_type", ""),
        benchmark.get("uster_percentile", ""),
    ])
    writer.writerow([])

    writer.writerow(["FIBRE METRICS"])
    writer.writerow(["Metric", "Value"])
    writer.writerow(["Uniformity Index (%)", data.get("uniformity_index", "")])
    writer.writerow(["Fiber Fineness Index", data.get("fiber_fineness_index", "")])
    writer.writerow(["Nep Index (per g equiv.)", data.get("nep_index", "")])
    writer.writerow(["Short Fiber Index (%)", data.get("short_fiber_index", "")])
    writer.writerow([])

    writer.writerow(["USTER BENCHMARKS", benchmark.get("ne_range", "")])
    writer.writerow(["Excellent (top 25%)", benchmark.get("csp_excellent", "")])
    writer.writerow(["Good (25-50%)", benchmark.get("csp_good", "")])
    writer.writerow(["Average (50-75%)", benchmark.get("csp_average", "")])
    writer.writerow(["Below average", benchmark.get("csp_below", "")])
    writer.writerow([])

    writer.writerow(["BCI QUALITY CHECKS"])
    writer.writerow(["Status", bci.get("status", "")])
    writer.writerow(["Passed", f"{bci.get('passed', 0)}/{bci.get('total', 0)}"])
    for check, passed in bci.get("checks", {}).items():
        writer.writerow([check, "PASS" if passed else "FAIL"])
    writer.writerow([])

    writer.writerow(["COTTON TYPE"])
    writer.writerow(["Name", cotton_type.get("name", "")])
    writer.writerow(["Examples", cotton_type.get("examples", "")])
    writer.writerow(["Description", cotton_type.get("description", "")])
    writer.writerow([])

    writer.writerow(["ANALYSIS FINDINGS"])
    for finding in data.get("findings", []):
        writer.writerow([finding])
    writer.writerow([])

    writer.writerow(["STANDARDS REFERENCED"])
    for ref in data.get("standard_refs", []):
        writer.writerow([ref])
    writer.writerow([])
    writer.writerow(["Method", "INS-CSP-001 | Classical CV — No AI/ML models | Inspectra AI"])

    return output.getvalue()


def _letter_width() -> float:
    return letter[0] - 72  # page width minus margins
