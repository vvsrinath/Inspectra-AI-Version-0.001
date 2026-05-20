import base64
import csv
import io
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

METRIC_COLS = ["SSIM", "TEX", "WVE", "SHP", "EDG", "UNF", "STN", "SIM", "QLY", "GRD"]
STAT_ROW_IDS = {"MEAN", "STD DEV", "C.V.%"}


def _fmt_val(v) -> str:
    if isinstance(v, (int, float)):
        return f"{v:.2f}" if isinstance(v, float) else str(v)
    return str(v)


def _is_comparison_report(report_data: dict) -> bool:
    if report_data.get("report_type") == "comparison":
        return True
    return int(report_data.get("sample_count", 1)) > 1


def generate_ttdc_pdf(report_data: dict) -> str:
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

    meta = report_data.get("report_meta", {})
    lot_id = meta.get("lot_id", "N/A")
    mill = meta.get("mill_name", "")
    operator = meta.get("operator", "N/A")
    serial = meta.get("serial_no", "0000000")
    ts = report_data.get("timestamp") or datetime.now(timezone.utc).strftime(
        "%d/%m/%Y %H:%M:%S"
    )
    is_comparison = _is_comparison_report(report_data)
    verdict = report_data.get("verdict", "")

    centre_title = (
        "INSPECTRA AI — TEXTILE TESTING &amp; ANALYSIS CENTRE"
    )
    story.append(Paragraph(f"<b>{centre_title}</b>", styles["Title"]))
    story.append(Spacer(1, 4))

    if is_comparison:
        story.append(
            Paragraph(
                "<b>BATCH COMPARISON REPORT</b> "
                f"(Classical CV — No AI/ML models)",
                styles["Heading2"],
            )
        )
        story.append(
            Paragraph(
                f"<b>Batch verdict:</b> {verdict}",
                styles["Normal"],
            )
        )
        story.append(Spacer(1, 6))

    story.append(Paragraph(f"Lot ID: {lot_id}  {mill}", styles["Normal"]))
    story.append(
        Paragraph(
            f"{ts} &nbsp;&nbsp; Operator: {operator} &nbsp;&nbsp; "
            f"Pg 1/1 | Report Ver 1.0.0 | Serial No.: {serial}",
            styles["Normal"],
        )
    )
    story.append(Spacer(1, 12))

    columns = report_data.get("columns", METRIC_COLS)
    rows = report_data.get("rows", [])

    if not rows and "values" in report_data:
        rows = [{"test_id": report_data.get("test_id", "S1"), "values": report_data["values"]}]

    header = ["Test ID"] + columns
    table_data = [header]
    stat_row_indices = []
    for idx, row in enumerate(rows):
        tid = row.get("test_id", "")
        vals = row.get("values", {})
        table_data.append([tid] + [_fmt_val(vals.get(c, "")) for c in columns])
        if tid in STAT_ROW_IDS:
            stat_row_indices.append(len(table_data) - 1)

    sample_count = report_data.get("sample_count")
    if sample_count is None:
        sample_count = len([r for r in rows if r.get("test_id", "") not in STAT_ROW_IDS])
    if not sample_count:
        sample_count = len([r for r in rows if r.get("test_id", "").startswith("S")])

    col_width = (letter[0] - 72) / len(header)
    t = Table(table_data, colWidths=[col_width] * len(header))

    style_commands = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4a4a4a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("ALIGN", (0, 1), (0, -1), "LEFT"),
    ]
    for ri in stat_row_indices:
        style_commands.append(("BACKGROUND", (0, ri), (-1, ri), colors.HexColor("#e8e8e8")))
        style_commands.append(("FONTNAME", (0, ri), (-1, ri), "Helvetica-Bold"))

    t.setStyle(TableStyle(style_commands))
    story.append(t)
    story.append(Spacer(1, 8))
    story.append(Paragraph(f"<b>Total Number of Samples - {sample_count}</b>", styles["Normal"]))

    if is_comparison and report_data.get("statistics"):
        stats = report_data["statistics"]
        story.append(Spacer(1, 8))
        story.append(Paragraph("<b>Comparison summary (classical statistics)</b>", styles["Heading3"]))
        cv = stats.get("cv_percent", {})
        for col in ["SIM", "QLY", "STN", "WVE"]:
            if col in cv:
                story.append(
                    Paragraph(f"{col} C.V.%: {_fmt_val(cv[col])}%", styles["Normal"])
                )

    explanation = report_data.get("explanation", report_data.get("findings", []))
    if explanation:
        story.append(Spacer(1, 12))
        story.append(Paragraph("<b>Analysis &amp; Explanation</b>", styles["Heading2"]))
        for line in explanation:
            story.append(Paragraph(f"• {line}", styles["Normal"]))
            story.append(Spacer(1, 3))

    story.append(Spacer(1, 16))
    story.append(
        Paragraph(
            "Method: INS-MTH-001 | OpenCV + scikit-image classical analysis | "
            "<b>No AI/ML models used</b> | Inspectra AI",
            styles["Italic"],
        )
    )

    doc.build(story)
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")


def generate_csv_export(report_data: dict) -> str:
    output = io.StringIO()
    columns = report_data.get("columns", METRIC_COLS)
    rows = report_data.get("rows", [])
    if not rows and "values" in report_data:
        rows = [{"test_id": "S1", "values": report_data["values"]}]

    writer = csv.writer(output)
    if _is_comparison_report(report_data):
        writer.writerow(["Report type", "Batch comparison"])
        writer.writerow(["Verdict", report_data.get("verdict", "")])
        writer.writerow([])

    writer.writerow(["Test ID"] + columns)
    for row in rows:
        vals = row.get("values", {})
        writer.writerow([row.get("test_id", "")] + [vals.get(c, "") for c in columns])

    sample_count = report_data.get("sample_count", "")
    writer.writerow([])
    writer.writerow([f"Total Number of Samples - {sample_count}"])

    explanation = report_data.get("explanation", [])
    if explanation:
        writer.writerow([])
        writer.writerow(["Analysis"])
        for line in explanation:
            writer.writerow([line])

    return output.getvalue()
