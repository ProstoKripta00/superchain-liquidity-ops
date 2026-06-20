from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "examples" / "7-day-liquidity-impact-report-example.pdf"

OP_RED = colors.HexColor("#ff0420")
INK = colors.HexColor("#101010")
MUTED = colors.HexColor("#5f6368")
LIGHT = colors.HexColor("#f6f6f6")
LINE = colors.HexColor("#dedede")
GREEN = colors.HexColor("#008a5b")
AMBER = colors.HexColor("#8a5a00")


class CoverBlock(Flowable):
    def __init__(self, width, height=120 * mm):
        super().__init__()
        self.width = width
        self.height = height

    def wrap(self, avail_width, avail_height):
        self.width = avail_width
        return avail_width, self.height

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(OP_RED)
        c.roundRect(0, 0, self.width, self.height, 14, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(16 * mm, self.height - 22 * mm, "SUPERCHAIN LIQUIDITY OPS")
        c.setFont("Helvetica-Bold", 36)
        text = ["7-Day Liquidity", "Impact Report"]
        y = self.height - 48 * mm
        for line in text:
            c.drawString(16 * mm, y, line)
            y -= 16 * mm
        c.setFont("Helvetica", 14)
        c.drawString(16 * mm, y - 4 * mm, "Example buyer delivery for OP / Superchain teams")
        c.setFillColor(INK)
        c.roundRect(self.width - 48 * mm, self.height - 34 * mm, 26 * mm, 26 * mm, 7, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 15)
        c.drawCentredString(self.width - 35 * mm, self.height - 24 * mm, "OP")
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(self.width - 35 * mm, self.height - 29 * mm, "READY")
        c.restoreState()


class BarChart(Flowable):
    def __init__(self, data, width=150 * mm, height=46 * mm):
        super().__init__()
        self.data = data
        self.width = width
        self.height = height

    def wrap(self, avail_width, avail_height):
        self.width = min(self.width, avail_width)
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.saveState()
        max_value = max(value for _, value, _ in self.data)
        x = 0
        y = 9 * mm
        bar_height = 7 * mm
        label_width = 34 * mm
        chart_width = self.width - label_width - 18 * mm
        c.setFont("Helvetica", 8)
        for label, value, color in self.data:
            c.setFillColor(MUTED)
            c.drawString(x, y + 2 * mm, label)
            c.setFillColor(colors.HexColor("#eeeeee"))
            c.roundRect(x + label_width, y, chart_width, bar_height, 3, fill=1, stroke=0)
            c.setFillColor(color)
            c.roundRect(x + label_width, y, chart_width * (value / max_value), bar_height, 3, fill=1, stroke=0)
            c.setFillColor(INK)
            c.setFont("Helvetica-Bold", 8)
            c.drawRightString(self.width, y + 2 * mm, f"${value:.1f}M")
            c.setFont("Helvetica", 8)
            y += 12 * mm
        c.restoreState()


def p(text, style):
    return Paragraph(text, style)


def make_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=21,
            leading=25,
            textColor=INK,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=17,
            textColor=INK,
            spaceBefore=8,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.6,
            leading=13.2,
            textColor=colors.HexColor("#242424"),
            spaceAfter=5,
        ),
        "small": ParagraphStyle(
            "small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.2,
            leading=10.5,
            textColor=MUTED,
        ),
        "kicker": ParagraphStyle(
            "kicker",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=10,
            textColor=OP_RED,
            spaceAfter=3,
        ),
        "center": ParagraphStyle(
            "center",
            parent=base["BodyText"],
            alignment=TA_CENTER,
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            textColor=INK,
        ),
        "left_bold": ParagraphStyle(
            "left_bold",
            parent=base["BodyText"],
            alignment=TA_LEFT,
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            textColor=INK,
        ),
        "table_head": ParagraphStyle(
            "table_head",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=8.2,
            leading=9.8,
            textColor=colors.white,
        ),
        "table_cell": ParagraphStyle(
            "table_cell",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.0,
            leading=9.7,
            textColor=INK,
        ),
    }


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    if doc.page > 1:
        canvas.setFillColor(INK)
        canvas.rect(0, height - 13 * mm, width, 13 * mm, fill=1, stroke=0)
        canvas.setFillColor(OP_RED)
        canvas.rect(0, height - 14 * mm, width, 1.2 * mm, fill=1, stroke=0)
        canvas.setFont("Helvetica-Bold", 8.5)
        canvas.setFillColor(colors.white)
        canvas.drawString(18 * mm, height - 8.5 * mm, "Superchain Liquidity Ops")
        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(width - 18 * mm, height - 8.5 * mm, "7-Day Liquidity Impact Report Example")
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 10 * mm, "Independent analytics example. Not financial advice, not investment advice, not an official OP assessment.")
    canvas.drawRightString(width - 18 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def table_style(header_bg=INK):
    return TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), header_bg),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8.6),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 1), (-1, -1), 8.4),
            ("LEADING", (0, 1), (-1, -1), 10.5),
            ("TEXTCOLOR", (0, 1), (-1, -1), INK),
            ("GRID", (0, 0), (-1, -1), 0.35, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fafafa")]),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]
    )


def wrap_table_rows(rows, styles):
    wrapped = []
    for row_index, row in enumerate(rows):
        style = styles["table_head"] if row_index == 0 else styles["table_cell"]
        wrapped.append([p(str(cell), style) for cell in row])
    return wrapped


def make_table(rows, col_widths, styles, header_bg=INK):
    tbl = Table(wrap_table_rows(rows, styles), colWidths=col_widths, hAlign="LEFT", repeatRows=1)
    tbl.setStyle(table_style(header_bg))
    return tbl


def metric_cards(styles):
    data = [
        [p("30d DEX volume<br/><b>$128.4M</b>", styles["center"]), p("30d fees<br/><b>$216.8K</b>", styles["center"]), p("Fee / volume<br/><b>0.17%</b>", styles["center"])],
        [p("Watch markets<br/><b>2</b>", styles["center"]), p("Source confidence<br/><b>82 / 100</b>", styles["center"]), p("Report price<br/><b>$500</b>", styles["center"])],
    ]
    tbl = Table(data, colWidths=[52 * mm, 52 * mm, 52 * mm], hAlign="LEFT")
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.4, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    return tbl


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    styles = make_styles()
    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=17 * mm,
        title="7-Day Liquidity Impact Report Example",
        author="Superchain Liquidity Ops",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=header_footer)])

    story = []
    story.append(CoverBlock(doc.width))
    story.append(Spacer(1, 10 * mm))
    story.append(p("PRIMARY BUYER-FACING ARTIFACT", styles["kicker"]))
    story.append(p("Example Protocol - OP / Superchain Liquidity Impact", styles["title"]))
    story.append(
        p(
            "This example shows the paid delivery format for a 7-day report: source-backed DEX activity, fee output, weak markets, recommendations, payment boundary, and handoff rules.",
            styles["body"],
        )
    )
    summary = make_table(
        [
            ["Package", "7-day Diagnostic Report"],
            ["Price", "$500"],
            ["Accepted payment", "OP / USDT / USDC"],
            ["Timeline", "7 days after scope and initial payment"],
            ["Handoff", "PDF-ready report, Markdown, CSV evidence, source audit"],
        ],
        [42 * mm, 112 * mm],
        styles,
        OP_RED,
    )
    story.append(summary)
    story.append(Spacer(1, 8 * mm))
    story.append(p("What the buyer gets", styles["h2"]))
    story.append(
        p(
            "A concise decision memo that answers whether a protocol's OP / Superchain liquidity is creating measurable DEX outcomes and what to do next.",
            styles["body"],
        )
    )
    story.append(PageBreak())

    story.append(p("EXECUTIVE ANSWER", styles["kicker"]))
    story.append(p("Liquidity is active, but two markets need review before scaling incentives.", styles["title"]))
    story.append(metric_cards(styles))
    story.append(Spacer(1, 7 * mm))
    story.append(
        p(
            "The example protocol shows enough public Superchain activity for a deeper buyer conversation: 30d DEX volume is visible, fee output can be checked, and source coverage is strong enough to separate facts from assumptions. The recommendation is to continue strong markets, adjust weak fee-capture markets, and investigate missing fee fields before increasing budget.",
            styles["body"],
        )
    )
    story.append(Spacer(1, 4 * mm))
    story.append(p("Market activity snapshot", styles["h2"]))
    story.append(BarChart([("OP Mainnet", 128.4, OP_RED), ("Base", 84.2, INK), ("Unichain", 51.8, AMBER)]))
    story.append(Spacer(1, 6 * mm))
    evidence = make_table(
        [
            ["Signal", "Example output", "Buyer use"],
            ["DEX activity", "$128.4M 30d volume on primary market", "Confirms real usage, not only deposited liquidity"],
            ["Fee output", "$216.8K 30d fees where public feeds expose data", "Checks whether activity creates measurable economic output"],
            ["Fee / volume", "0.17% on primary market", "Compares capital efficiency across markets"],
            ["Watch markets", "2 markets need review", "Prioritizes follow-up before additional spend"],
            ["Source gaps", "Unavailable values are disclosed", "Prevents hidden assumptions in stakeholder updates"],
        ],
        [34 * mm, 60 * mm, 62 * mm],
        styles,
    )
    story.append(evidence)
    story.append(PageBreak())

    story.append(p("RECOMMENDED ACTIONS", styles["kicker"]))
    story.append(p("Continue, adjust, investigate, then decide.", styles["title"]))
    actions = make_table(
        [
            ["Action", "Condition", "Example next step"],
            ["Continue", "Strong volume, visible fees, healthy source confidence", "Track weekly and prepare a concise stakeholder update"],
            ["Adjust", "Volume is present but fee output is weak", "Review whether incentives attract low-quality flow"],
            ["Investigate", "Missing fee fields or negative trend", "Refresh public sources before making paid conclusions"],
            ["Pause", "No reliable public evidence", "Do not claim impact; re-scope to source audit or private data review"],
        ],
        [28 * mm, 58 * mm, 70 * mm],
        styles,
        OP_RED,
    )
    story.append(actions)
    story.append(Spacer(1, 8 * mm))
    story.append(p("Methodology boundary", styles["h2"]))
    story.append(
        p(
            "The report uses public endpoints, labels unavailable values directly, and keeps recommendations conservative when confidence is low. It does not replace DeFiLlama, Dune, Artemis, or Token Terminal. It packages public data into a buyer-readable decision memo.",
            styles["body"],
        )
    )
    source_table = make_table(
        [
            ["Source", "Used for", "Boundary"],
            ["DefiLlama chains", "Network TVL context", "Public chain-level values only"],
            ["DefiLlama DEX overview", "DEX volume and market rows", "Protocol matching depends on public feed labels"],
            ["DefiLlama fees overview", "30d fees where exposed", "Unavailable fee fields are not manually estimated"],
        ],
        [40 * mm, 50 * mm, 66 * mm],
        styles,
    )
    story.append(source_table)
    story.append(PageBreak())

    story.append(p("COMMERCIAL HANDOFF", styles["kicker"]))
    story.append(p("Payment, scope, and delivery rules", styles["title"]))
    gates = make_table(
        [
            ["Gate", "Rule"],
            ["Scope confirmation", "Protocol, networks, metrics, format, deadline, and contact route are agreed before work starts."],
            ["Payment route", "Accepted payment is OP, USDT, or USDC by agreed wallet and network. Wallet details are shared after scope confirmation."],
            ["Start condition", "Work starts after the initial payment is confirmed."],
            ["Final handoff", "Final PDF, Markdown, CSV, and source notes are released after final payment is confirmed."],
        ],
        [38 * mm, 118 * mm],
        styles,
    )
    story.append(gates)
    story.append(Spacer(1, 8 * mm))
    story.append(p("What is not included", styles["h2"]))
    story.append(
        p(
            "This report is not financial advice, not investment advice, not tax advice, not a smart-contract security audit, and not an official OP assessment. New protocols, private data work, custom dashboards, extra revisions, or legal/compliance documents are separate scope.",
            styles["body"],
        )
    )
    story.append(Spacer(1, 8 * mm))
    story.append(
        KeepTogether(
            [
                p("Buyer message", styles["h2"]),
                p(
                    "I can deliver this 7-day Liquidity Impact Report for $500. If it is useful, a deeper evidence pack is $1,500-$3,000 and monthly monitoring starts from $1,500/mo.",
                    styles["body"],
                ),
            ]
        )
    )

    doc.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    build_pdf()
