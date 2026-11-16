#!/usr/bin/env python3
"""Build the editable .drawio twin of docs/reproai-architecture.html and the
shareable app.diagrams.net editor URL (draw.io's #R deflate+base64 format).

Node/band/edge geometry mirrors the SVG exactly, so the two artifacts agree.
Run: python3 scripts/build-architecture-drawio.py
"""
import base64
import zlib
from pathlib import Path
from xml.sax.saxutils import escape

import html as html_mod

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "reproai-architecture.drawio"
URL_OUT = ROOT / "docs" / "reproai-architecture.drawio.url"

PAPER = "#F5F5F5"
INK = "#2D3142"
MUTED = "#4F5D75"
SOFT = "#5A6580"
ACCENT = "#BF4520"
LINK = "#2E5AA8"
WORK = "#2F7D4F"
PARTIAL = "#A8641A"

BAND_FILL = "#F0F0F1"
BAND_STROKE = "#DCDCDE"
INPUT_FILL = "#E4E6EA"
STORE_FILL = "#EBEBED"
EXTERNAL_FILL = "#EFEFF1"
EXTERNAL_STROKE = "#B9BBBE"
ACCENT_FILL = "#F1E7E4"

BANDS = [
    (156, 96, 488, 112, "PEOPLE"),
    (156, 240, 728, 208, "REPROAI APP \u00b7 VERCEL \u00b7 NEXT.JS 14"),
    (156, 480, 968, 120, "DATA & MODELS"),
]

# id, x, y, w, h, tag, name, sublabel, treatment, status
NODES = [
    ("n-patient", 180, 120, 200, 64, "USER", "Patient", "portal \u00b7 EN / AR", "input", "work"),
    ("n-clinician", 420, 120, 200, 64, "USER", "Clinician", "own care panel", "input", "work"),
    ("n-assess", 180, 348, 200, 64, "PIPE", "Assessment pipeline", "score \u00b7 Shapley factors", "focal", "work"),
    ("n-answer", 660, 348, 200, 64, "RAG", "Grounded answer", "retrieve \u00b7 verify \u00b7 cite", "focal", "work"),
    ("n-ml", 180, 504, 200, 64, "ML", "ML service", "FastAPI \u00b7 score + attribution", "backend", "work"),
    ("n-db", 420, 504, 200, 64, "DB", "PostgreSQL", "Neon \u00b7 AES-256-GCM", "store", "work"),
    ("n-corpus", 660, 504, 200, 64, "EVID", "Guideline corpus", "Thiqa \u00b7 WHO \u00b7 ESHRE", "store", "partial"),
    ("n-azure", 900, 504, 200, 64, "LLM", "Azure OpenAI", "gpt-5-mini \u00b7 UAE North", "external", "partial"),
]

TREATMENTS = {
    "input": f"fillColor={INPUT_FILL};strokeColor={SOFT};",
    "backend": "fillColor=#FFFFFF;strokeColor=#2D3142;",
    "store": f"fillColor={STORE_FILL};strokeColor={MUTED};",
    "external": f"fillColor={EXTERNAL_FILL};strokeColor={EXTERNAL_STROKE};dashed=1;",
    "focal": f"fillColor={ACCENT_FILL};strokeColor={ACCENT};strokeWidth=1.4;",
}
STATUS_COLOUR = {"work": WORK, "partial": PARTIAL}

# id, source, target, label, colour, exit(x,y), entry(x,y)
EDGES = [
    ("e-patient", "n-patient", "plate", "CONSENT-SCOPED", MUTED, (0.5, 1), (0.147, 0)),
    ("e-clinician", "n-clinician", "plate", "OWN PANEL ONLY", MUTED, (0.5, 1), (0.5, 0)),
    ("e-plate-assess", "plate", "n-assess", "", MUTED, (0.147, 1), (0.5, 0)),
    ("e-plate-answer", "plate", "n-answer", "", MUTED, (0.853, 1), (0.5, 0)),
    ("e-assess-ml", "n-assess", "n-ml", "SCORE REQUEST", MUTED, (0.5, 1), (0.5, 0)),
    ("e-assess-gate", "n-assess", "gate", "DRAFT", ACCENT, (1, 0.5), (0, 0.5)),
    ("e-gate-db", "gate", "n-db", "RELEASED", ACCENT, (0.5, 1), (0.5, 0)),
    ("e-answer-corpus", "n-answer", "n-corpus", "RETRIEVE TOP 4", MUTED, (0.5, 1), (0.5, 0)),
    ("e-answer-azure", "n-answer", "n-azure", "PASSAGES ONLY", LINK, (0.7, 1), (0.3, 0)),
    ("e-azure-answer", "n-azure", "n-answer", "ANSWER + CITATIONS", LINK, (0.6, 0), (1, 0.56)),
]


def band_cells():
    out = []
    for i, (x, y, w, h, label) in enumerate(BANDS):
        bid = f"band-{i}"
        out.append(
            f'<mxCell id="{bid}" value="" style="rounded=1;whiteSpace=wrap;html=1;arcSize=4;'
            f"fillColor={BAND_FILL};strokeColor={BAND_STROKE};connectable=0;movable=0;"
            f'resizable=0;" vertex="1" parent="1">'
            f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'
        )
        out.append(
            f'<mxCell id="{bid}-label" value="{escape(label)}" style="text;html=1;align=center;'
            f"verticalAlign=middle;resizable=0;points=[];autosize=1;fontSize=7;fontFamily=Geist Mono;"
            f'fontColor={SOFT};spacing=0;" vertex="1" parent="1">'
            f'<mxGeometry x="{x + w / 2 - 120}" y="{y + 1}" width="240" height="14" as="geometry"/></mxCell>'
        )
    return out


def node_cells():
    out = []
    for nid, x, y, w, h, tag, name, sub, treat, status in NODES:
        dot = STATUS_COLOUR[status]
        value = (
            f'<b>{escape(name)}</b><br>'
            f'<span style="color:{dot}">&#9679;</span> '
            f'<span style="font-size:9px;color:{MUTED};font-family:Geist Mono, monospace">{escape(sub)}</span>'
        )
        style = (
            f"rounded=1;whiteSpace=wrap;html=1;arcSize=10;{TREATMENTS[treat]}"
            f"verticalAlign=middle;align=center;fontSize=12;fontColor={INK};"
        )
        out.append(
            f'<mxCell id="{nid}" value="{html_mod.escape(value, quote=True)}" style="{style}" '
            f'vertex="1" parent="1">'
            f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'
        )
        out.append(
            f'<mxCell id="{nid}-tag" value="{escape(tag)}" style="text;html=1;align=center;'
            f"verticalAlign=middle;resizable=0;points=[];autosize=1;fontSize=7;fontFamily=Geist Mono;"
            f'fontColor={SOFT};spacing=0;" vertex="1" parent="{nid}">'
            f'<mxGeometry x="8" y="4" width="40" height="12" as="geometry"/></mxCell>'
        )
    return out


def plate_and_gate():
    plate = (
        '<mxCell id="plate" value="CONSENT + AUDIT \u2014 every access scoped to a grant, logged, revocable" '
        'style="rounded=1;whiteSpace=wrap;html=1;arcSize=14;fillColor=#FBF1EE;strokeColor=#BF4520;'
        'dashed=1;dashPattern=4 4;fontSize=9;fontFamily=Geist Mono;fontColor=#BF4520;align=center;" '
        'vertex="1" parent="1"><mxGeometry x="180" y="272" width="680" height="40" as="geometry"/></mxCell>'
    )
    gate = (
        '<mxCell id="gate" value="HUMAN APPROVAL GATE" '
        'style="rounded=1;whiteSpace=wrap;html=1;arcSize=50;fillColor=#2D3142;strokeColor=#2D3142;'
        'fontSize=7;fontFamily=Geist Mono;fontColor=#F5F5F5;letterSpacing=1;align=center;" '
        'vertex="1" parent="1"><mxGeometry x="452" y="373" width="136" height="22" as="geometry"/></mxCell>'
    )
    return [plate, gate]


def edge_cells():
    out = []
    for eid, src, dst, label, colour, (ex, ey), (nx, ny) in EDGES:
        style = (
            "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;"
            f"strokeColor={colour};strokeWidth=1.2;endArrow=block;endFill=1;endSize=6;"
            f"labelBackgroundColor={PAPER};fontSize=8;fontFamily=Geist Mono;fontColor={colour};"
            f"exitX={ex};exitY={ey};exitDx=0;exitDy=0;entryX={nx};entryY={ny};entryDx=0;entryDy=0;"
        )
        out.append(
            f'<mxCell id="{eid}" value="{escape(label)}" style="{style}" edge="1" parent="1" '
            f'source="{src}" target="{dst}"><mxGeometry relative="1" as="geometry"/></mxCell>'
        )
    return out


def build_xml() -> str:
    cells = band_cells() + plate_and_gate() + node_cells() + edge_cells()
    body = "\n        ".join(cells)
    return (
        '<mxfile host="app.diagrams.net" agent="ReproAI" version="24.7.17" type="device">\n'
        '  <diagram id="reproai-architecture" name="ReproAI architecture">\n'
        '    <mxGraphModel dx="1400" dy="900" grid="1" gridSize="4" guides="1" tooltips="1" '
        'connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1280" '
        'pageHeight="720" math="0" shadow="0">\n'
        "      <root>\n"
        '        <mxCell id="0"/>\n'
        '        <mxCell id="1" parent="0"/>\n'
        f"        {body}\n"
        "      </root>\n"
        "    </mxGraphModel>\n"
        "  </diagram>\n"
        "</mxfile>\n"
    )


def compress(xml: str) -> str:
    """draw.io's Graph.compress: raw DEFLATE, then standard base64."""
    raw = zlib.compress(xml.encode("utf-8"), 9)[2:-4]
    return base64.b64encode(raw).decode("ascii")


def main() -> None:
    xml = build_xml()
    OUT.write_text(xml, encoding="utf-8")

    data = compress(xml)
    url = "https://app.diagrams.net/?title=ReproAI%20architecture#R" + data
    URL_OUT.write_text(url + "\n", encoding="utf-8")

    assert zlib.decompress(base64.b64decode(data), -15).decode("utf-8") == xml

    print(f"wrote {OUT.relative_to(ROOT)} ({len(xml)} bytes)")
    print(f"editor URL length: {len(url)} chars")
    print("round-trip verified: payload inflates to the exact XML")


if __name__ == "__main__":
    main()
