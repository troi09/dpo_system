"""
Generate a clean, professional source-code PDF for IPOPHIL copyright submission.

Includes only the essential, manually authored source code (server + client logic).
Excludes AI assistant instructions, environment files, lock files, build artifacts,
static assets, stub/placeholder files, and styling files.
"""

import os
from datetime import date

from pygments import highlight
from pygments.lexers import get_lexer_for_filename, guess_lexer, JavascriptLexer
from pygments.formatters import HtmlFormatter
from pygments.util import ClassNotFound

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    PageBreak,
    KeepTogether,
)
from reportlab.pdfgen import canvas


PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PDF = os.path.join(PROJECT_ROOT, "DPO_System_Source_Code_IPOPHIL.pdf")

PROJECT_TITLE = "Data Privacy Office (DPO) Request Management System"
PROJECT_SUBTITLE = "Source Code Compilation for Copyright Deposit"

# Curated list of source files in logical reading order.
# Backend first, then frontend (entry -> context -> guards -> services -> components -> pages -> config).
FILES = [
    # --- Backend: entry & infrastructure ---
    "server/server.js",
    "server/config/db.js",

    # --- Backend: data models ---
    "server/models/User.js",
    "server/models/Request.js",
    "server/models/AuditLog.js",

    # --- Backend: middleware ---
    "server/middleware/authMiddleware.js",
    "server/middleware/piiRedactMiddleware.js",

    # --- Backend: controllers ---
    "server/controllers/authController.js",
    "server/controllers/requestController.js",
    "server/controllers/auditController.js",

    # --- Backend: routes ---
    "server/routes/authRoutes.js",
    "server/routes/requestRoutes.js",
    "server/routes/auditRoutes.js",

    # --- Backend: utilities & scripts ---
    "server/utils/emailService.js",
    "server/scripts/runArchive.js",
    "server/scripts/restoreArchive.js",

    # --- Frontend: entry ---
    "client/src/main.jsx",
    "client/src/App.jsx",
    "client/src/firebase.js",

    # --- Frontend: context & guards ---
    "client/src/context/AuthContext.jsx",
    "client/src/guards/RequireRole.jsx",

    # --- Frontend: services ---
    "client/src/services/authService.js",
    "client/src/services/requestService.js",
    "client/src/services/auditService.js",
    "client/src/services/firebaseStorageService.js",
    "client/src/services/qrService.js",

    # --- Frontend: utilities ---
    "client/src/utils/passwordPolicy.js",
    "client/src/utils/inPageFeedback.js",
    "client/src/utils/requestStatusCharts.js",

    # --- Frontend: configuration ---
    "client/src/config/fieldsFileSlotsConfig.js",
    "client/src/config/documentTemplates/index.jsx",
    "client/src/config/documentTemplates/styles.jsx",
    "client/src/config/documentTemplates/AgreementDoc.jsx",
    "client/src/config/documentTemplates/NDAResearchDoc.jsx",
    "client/src/config/documentTemplates/NDAStudentOrgActivitiesDoc.jsx",

    # --- Frontend: shared components ---
    "client/src/components/Navbar.jsx",
    "client/src/components/Headbar.jsx",
    "client/src/components/FilterSelect.jsx",
    "client/src/components/PasswordChecklist.jsx",
    "client/src/components/SessionWarningModal.jsx",
    "client/src/components/SignaturePad.jsx",
    "client/src/components/RequestStepper.jsx",
    "client/src/components/InPageFeedbackHost.jsx",

    # --- Frontend: public pages ---
    "client/src/pages/Landing.jsx",
    "client/src/pages/ActivateAccountPage.jsx",
    "client/src/pages/VerifyEmailPage.jsx",
    "client/src/pages/VerifyDocument.jsx",
    "client/src/pages/public/RepSigningPage.jsx",

    # --- Frontend: student pages ---
    "client/src/pages/student/StudentDashboard.jsx",
    "client/src/pages/student/StudentProfile.jsx",
    "client/src/pages/student/StudentNewRequest.jsx",
    "client/src/pages/student/StudentAgreementRequest.jsx",
    "client/src/pages/student/StudentAgreementRequirements.jsx",
    "client/src/pages/student/StudentNDATypeChooser.jsx",
    "client/src/pages/student/StudentNDARequest.jsx",
    "client/src/pages/student/StudentRequestReview.jsx",
    "client/src/pages/student/StudentResubmitRequest.jsx",

    # --- Frontend: admin pages ---
    "client/src/pages/admin/AdminDashboard.jsx",
    "client/src/pages/admin/AdminProfile.jsx",
    "client/src/pages/admin/AdminUsers.jsx",
    "client/src/pages/admin/AdminRequests.jsx",
    "client/src/pages/admin/AdminRequestReview.jsx",
    "client/src/pages/admin/AdminReports.jsx",
    "client/src/pages/admin/AdminAuditLog.jsx",
    "client/src/pages/admin/AdminArchives.jsx",
]


# ---------- PDF infrastructure ---------- #

PAGE_W, PAGE_H = LETTER
MARGIN_X = 0.7 * inch
MARGIN_Y = 0.8 * inch

CODE_FONT = "Courier"
CODE_FONT_SIZE = 7.2
CODE_LEADING = 8.6


class NumberedDocTemplate(BaseDocTemplate):
    """Document template with header / footer and page numbers."""

    def __init__(self, filename, **kwargs):
        super().__init__(filename, **kwargs)
        frame = Frame(
            MARGIN_X,
            MARGIN_Y,
            PAGE_W - 2 * MARGIN_X,
            PAGE_H - 2 * MARGIN_Y - 0.3 * inch,
            id="content",
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
        )
        self.addPageTemplates([
            PageTemplate(id="cover", frames=[frame], onPage=_draw_cover_chrome),
            PageTemplate(id="body", frames=[frame], onPage=_draw_body_chrome),
        ])


def _draw_cover_chrome(canv: canvas.Canvas, doc):
    canv.saveState()
    canv.setStrokeColor(colors.HexColor("#1f3a68"))
    canv.setLineWidth(1.0)
    canv.rect(0.5 * inch, 0.5 * inch, PAGE_W - 1 * inch, PAGE_H - 1 * inch)
    canv.restoreState()


def _draw_body_chrome(canv: canvas.Canvas, doc):
    canv.saveState()

    # Header
    canv.setFont("Helvetica-Bold", 9)
    canv.setFillColor(colors.HexColor("#1f3a68"))
    canv.drawString(MARGIN_X, PAGE_H - MARGIN_Y + 0.35 * inch, PROJECT_TITLE)
    canv.setFont("Helvetica", 8)
    canv.setFillColor(colors.HexColor("#666666"))
    canv.drawRightString(
        PAGE_W - MARGIN_X,
        PAGE_H - MARGIN_Y + 0.35 * inch,
        "IPOPHIL Source Code Deposit",
    )
    canv.setStrokeColor(colors.HexColor("#1f3a68"))
    canv.setLineWidth(0.5)
    canv.line(
        MARGIN_X,
        PAGE_H - MARGIN_Y + 0.25 * inch,
        PAGE_W - MARGIN_X,
        PAGE_H - MARGIN_Y + 0.25 * inch,
    )

    # Footer
    canv.setFont("Helvetica", 8)
    canv.setFillColor(colors.HexColor("#666666"))
    canv.drawString(MARGIN_X, MARGIN_Y - 0.3 * inch, PROJECT_SUBTITLE)
    canv.drawRightString(
        PAGE_W - MARGIN_X, MARGIN_Y - 0.3 * inch, f"Page {doc.page}"
    )
    canv.line(
        MARGIN_X,
        MARGIN_Y - 0.18 * inch,
        PAGE_W - MARGIN_X,
        MARGIN_Y - 0.18 * inch,
    )
    canv.restoreState()


# ---------- Styles ---------- #

styles = getSampleStyleSheet()

cover_title = ParagraphStyle(
    "CoverTitle",
    parent=styles["Title"],
    fontName="Helvetica-Bold",
    fontSize=24,
    leading=30,
    alignment=1,
    textColor=colors.HexColor("#1f3a68"),
    spaceAfter=18,
)
cover_sub = ParagraphStyle(
    "CoverSub",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=14,
    leading=18,
    alignment=1,
    textColor=colors.HexColor("#444444"),
    spaceAfter=12,
)
cover_meta = ParagraphStyle(
    "CoverMeta",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=11,
    leading=15,
    alignment=1,
    textColor=colors.HexColor("#222222"),
)
section_h = ParagraphStyle(
    "SectionH",
    parent=styles["Heading1"],
    fontName="Helvetica-Bold",
    fontSize=16,
    leading=20,
    textColor=colors.HexColor("#1f3a68"),
    spaceBefore=8,
    spaceAfter=12,
)
file_h = ParagraphStyle(
    "FileH",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=12,
    leading=16,
    textColor=colors.white,
    backColor=colors.HexColor("#1f3a68"),
    borderPadding=(4, 6, 4, 6),
    leftIndent=0,
    spaceBefore=10,
    spaceAfter=8,
)
toc_entry = ParagraphStyle(
    "TocEntry",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=10,
    leading=14,
    leftIndent=0,
)
body_text = ParagraphStyle(
    "BodyText",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=10.5,
    leading=14,
    spaceAfter=8,
)
code_style = ParagraphStyle(
    "Code",
    parent=styles["Code"],
    fontName=CODE_FONT,
    fontSize=CODE_FONT_SIZE,
    leading=CODE_LEADING,
    textColor=colors.HexColor("#111111"),
    backColor=colors.HexColor("#f5f7fb"),
    borderPadding=(4, 4, 4, 4),
    leftIndent=0,
    rightIndent=0,
)


# ---------- Helpers ---------- #

def _read_file(path):
    full = os.path.join(PROJECT_ROOT, path)
    with open(full, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def _line_count(text):
    return len(text.splitlines())


def _file_label(path):
    return path


def _section_for(path):
    if path.startswith("server/"):
        return "Backend"
    return "Frontend"


def _make_code_flowables(code_text):
    """Render code as Preformatted (line-numbered, monospace).

    Pygments could syntax-highlight, but ReportLab's Preformatted with line
    numbers is more legible for print and avoids color reproduction issues
    on grayscale printers used by IPOPHIL filings.
    """
    lines = code_text.splitlines() or [""]
    width = len(str(len(lines)))
    numbered = "\n".join(
        f"{str(i + 1).rjust(width)}  {ln}" for i, ln in enumerate(lines)
    )
    pre = Preformatted(numbered, code_style)
    return pre


def build():
    doc = NumberedDocTemplate(
        OUTPUT_PDF,
        pagesize=LETTER,
        leftMargin=MARGIN_X,
        rightMargin=MARGIN_X,
        topMargin=MARGIN_Y,
        bottomMargin=MARGIN_Y,
        title=PROJECT_TITLE,
        author="DPO System Development Team",
        subject="Source Code Deposit for IPOPHIL Copyright Registration",
    )

    story = []

    # ---------- Cover ---------- #
    story.append(Spacer(1, 1.6 * inch))
    story.append(Paragraph(PROJECT_TITLE, cover_title))
    story.append(Paragraph(PROJECT_SUBTITLE, cover_sub))
    story.append(Spacer(1, 0.4 * inch))
    story.append(Paragraph(
        "A web-based system for the management, review, electronic signing, "
        "and archival of Data Privacy Office requests, including Non-Disclosure "
        "Agreements (NDA) and Data Sharing Agreements.",
        ParagraphStyle(
            "CoverDesc",
            parent=cover_meta,
            fontSize=10.5,
            leading=15,
            textColor=colors.HexColor("#333333"),
        ),
    ))
    story.append(Spacer(1, 0.7 * inch))

    total_lines = sum(_line_count(_read_file(p)) for p in FILES)
    backend_count = sum(1 for p in FILES if p.startswith("server/"))
    frontend_count = len(FILES) - backend_count

    meta_lines = [
        f"<b>Submission Date:</b> {date.today().strftime('%B %d, %Y')}",
        f"<b>Total Source Files:</b> {len(FILES)}",
        f"<b>Backend (Node.js / Express / MongoDB):</b> {backend_count} files",
        f"<b>Frontend (React / Vite):</b> {frontend_count} files",
        f"<b>Total Lines of Code:</b> {total_lines:,}",
        "<b>Primary Languages:</b> JavaScript (Node.js), JSX (React)",
    ]
    for line in meta_lines:
        story.append(Paragraph(line, cover_meta))
    story.append(Spacer(1, 0.6 * inch))
    story.append(Paragraph(
        "<i>This document contains only the original, manually authored source "
        "code authored by the development team. Auto-generated files, build "
        "artifacts, third-party libraries, configuration files, environment "
        "variables, and static assets have been excluded.</i>",
        ParagraphStyle(
            "CoverNote",
            parent=cover_meta,
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor("#555555"),
        ),
    ))

    story.append(PageBreak())

    # Switch to body template for the rest
    story.append(_NextPageTemplate("body"))

    # ---------- Table of Contents ---------- #
    story.append(Paragraph("Table of Contents", section_h))
    story.append(Spacer(1, 6))

    current_section = None
    for idx, path in enumerate(FILES, start=1):
        sect = _section_for(path)
        if sect != current_section:
            current_section = sect
            story.append(Spacer(1, 6))
            story.append(Paragraph(
                f"<b><font color='#1f3a68'>{sect}</font></b>",
                ParagraphStyle("TocSect", parent=toc_entry, fontSize=11, spaceBefore=6, spaceAfter=4),
            ))
        story.append(Paragraph(
            f"{idx:>2}.&nbsp;&nbsp;<font face='Courier' size='9'>{path}</font>",
            toc_entry,
        ))

    story.append(PageBreak())

    # ---------- File sections ---------- #
    current_section = None
    for idx, path in enumerate(FILES, start=1):
        sect = _section_for(path)
        if sect != current_section:
            current_section = sect
            story.append(Paragraph(f"{sect} Source Code", section_h))

        code = _read_file(path)
        lines = _line_count(code)
        header = f"{idx}. &nbsp; {path} &nbsp;&nbsp; <font size='9' color='#cdd6e8'>({lines} lines)</font>"
        story.append(Paragraph(header, file_h))
        story.append(_make_code_flowables(code))
        story.append(Spacer(1, 10))
        story.append(PageBreak())

    doc.build(story)
    print(f"Wrote {OUTPUT_PDF}")
    print(f"  Files: {len(FILES)}   Lines: {total_lines:,}")


# ---------- A small flowable to switch page templates ---------- #
from reportlab.platypus.doctemplate import NextPageTemplate as _NextPageTemplate  # noqa: E402


if __name__ == "__main__":
    build()
