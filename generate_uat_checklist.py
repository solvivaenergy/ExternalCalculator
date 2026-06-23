"""Generate Solviva_Calculator_UAT_Checklist.xlsx — business-user math accuracy checklist."""
from openpyxl import Workbook
from openpyxl.styles import (
    Font, PatternFill, Alignment, Border, Side, GradientFill
)
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule
from openpyxl.utils import get_column_letter

OUT = "Solviva_Calculator_UAT_Checklist.xlsx"

# ── Brand colours ────────────────────────────────────────────────────────────
C_DARK_GREEN  = "1F522B"   # dark green
C_LIME        = "D2FF1E"   # lime
C_BLUE        = "006AC6"   # blue
C_WHITE       = "FFFFFF"
C_LIGHT_GREEN = "E8F5E9"   # soft green tint for data rows
C_LIGHT_BLUE  = "E3F2FD"   # soft blue tint
C_LIGHT_LIME  = "F5FFD6"   # soft lime tint
C_YELLOW      = "FFF9C4"   # instruction rows
C_PASS        = "C6EFCE"
C_FAIL        = "FFC7CE"
C_BLOCKED     = "FFEB9C"
C_NA          = "F2F2F2"
C_GREY_HDR    = "455A64"   # section header (slate)
C_LIGHT_GREY  = "F5F5F5"
C_MID_GREY    = "E0E0E0"

THIN = Side(border_style="thin", color="BFBFBF")
MED  = Side(border_style="medium", color="9E9E9E")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
MED_BORDER = Border(left=MED, right=MED, top=MED, bottom=MED)


def fill(hex_color):
    return PatternFill("solid", fgColor=hex_color)


def cell_font(bold=False, color=C_DARK_GREEN, size=10, italic=False):
    return Font(bold=bold, color=color, size=size, italic=italic)


def set_cell(ws, row, col, value, bold=False, font_color="000000", bg=None,
             size=10, italic=False, wrap=True, halign="left", valign="top",
             border=True):
    c = ws.cell(row=row, column=col, value=value)
    c.font = Font(bold=bold, color=font_color, size=size, italic=italic)
    c.alignment = Alignment(horizontal=halign, vertical=valign,
                            wrap_text=wrap)
    if bg:
        c.fill = fill(bg)
    if border:
        c.border = BORDER
    return c


def add_status_dv(ws, col_letter, first_row, last_row):
    dv = DataValidation(
        type="list",
        formula1='"Not Started,Pass,Fail,Blocked,N/A"',
        allow_blank=True,
        showDropDown=False,
    )
    rng = f"{col_letter}{first_row}:{col_letter}{last_row}"
    dv.add(rng)
    ws.add_data_validation(dv)
    ws.conditional_formatting.add(
        rng, CellIsRule("equal", ['"Pass"'],    fill=fill(C_PASS)))
    ws.conditional_formatting.add(
        rng, CellIsRule("equal", ['"Fail"'],    fill=fill(C_FAIL)))
    ws.conditional_formatting.add(
        rng, CellIsRule("equal", ['"Blocked"'], fill=fill(C_BLOCKED)))
    ws.conditional_formatting.add(
        rng, CellIsRule("equal", ['"N/A"'],     fill=fill(C_NA)))


# ── Shared helpers ────────────────────────────────────────────────────────────

def write_cover_row(ws, row, col_start, col_end, text,
                    bg=C_DARK_GREEN, font_color=C_WHITE,
                    bold=True, size=11, halign="left"):
    """Write text in col_start and fill merge through col_end."""
    c = set_cell(ws, row, col_start, text,
                 bold=bold, font_color=font_color, bg=bg,
                 size=size, halign=halign, valign="center", border=False)
    ws.merge_cells(
        start_row=row, start_column=col_start,
        end_row=row,   end_column=col_end)
    c.border = MED_BORDER
    return c


def section_header(ws, row, ncols, text):
    """Full-width dark-green section header."""
    write_cover_row(ws, row, 1, ncols, text, bg=C_DARK_GREEN,
                    font_color=C_WHITE, size=12, bold=True, halign="left")


def col_header(ws, row, col, text, bg=C_GREY_HDR):
    c = set_cell(ws, row, col, text, bold=True,
                 font_color=C_WHITE, bg=bg, size=10,
                 halign="center", valign="center", wrap=True)
    c.border = MED_BORDER
    return c


def instruction_row(ws, row, ncols, text, bg=C_YELLOW):
    c = set_cell(ws, row, 1, text, bold=False, font_color="5D4037",
                 bg=bg, size=9, italic=True, halign="left", valign="top")
    ws.merge_cells(start_row=row, start_column=1,
                   end_row=row,   end_column=ncols)
    c.border = BORDER
    ws.row_dimensions[row].height = 30


wb = Workbook()

# ════════════════════════════════════════════════════════════════════════════════
# SHEET 1 — Instructions / Cover
# ════════════════════════════════════════════════════════════════════════════════
ws_cover = wb.active
ws_cover.title = "Instructions"
ws_cover.sheet_view.showGridLines = False
ws_cover.column_dimensions["A"].width = 2
ws_cover.column_dimensions["B"].width = 70
ws_cover.column_dimensions["C"].width = 30

r = 1
# Logo-area header
c = ws_cover.cell(row=r, column=2,
                  value="Solviva Calculator — Math Accuracy Checklist")
c.font = Font(bold=True, color=C_DARK_GREEN, size=18)
c.alignment = Alignment(horizontal="left", vertical="center")
c.fill = fill(C_LIME)
ws_cover.merge_cells(f"B{r}:C{r}")
ws_cover.row_dimensions[r].height = 40
r += 1

subtitle_text = ("Purpose: Verify that the numbers on the Solviva Calculator website "
                 "match the source-of-truth Excel file "
                 "(v1.5_Solviva Proposal Generator 2026.xlsx).")
c = ws_cover.cell(row=r, column=2, value=subtitle_text)
c.font = Font(size=10, color="444444", italic=True)
c.alignment = Alignment(wrap_text=True, vertical="top")
c.fill = fill(C_LIGHT_LIME)
ws_cover.merge_cells(f"B{r}:C{r}")
ws_cover.row_dimensions[r].height = 30
r += 2

def cover_section(ws, row, heading, bullets):
    c = ws.cell(row=row, column=2, value=heading)
    c.font = Font(bold=True, size=11, color=C_DARK_GREEN)
    c.alignment = Alignment(vertical="top")
    row += 1
    for b in bullets:
        c = ws.cell(row=row, column=2, value=b)
        c.font = Font(size=10, color="222222")
        c.alignment = Alignment(vertical="top", wrap_text=True)
        ws.row_dimensions[row].height = 18
        row += 1
    return row + 1

r = cover_section(ws_cover, r, "Before You Start",
    ["1. Open the Solviva Calculator website in a browser tab.",
     "2. Open v1.5_Solviva Proposal Generator 2026.xlsx in Excel.",
     "3. The website always uses ₱14.50 per kWh as the electricity rate — this never changes."])

r = cover_section(ws_cover, r, "How to Use This Checklist",
    ["• For each row, follow the steps in 'What to Do on the Website'.",
     "• Write down the number you actually see in the 'Actual Value (Website)' column.",
     "• Compare it to the 'Expected Value' column.",
     "• Select Pass / Fail / Blocked / N/A in the 'Result' column using the dropdown.",
     "• Add any notes in the 'Notes' column."])

r = cover_section(ws_cover, r, "Tabs in This Workbook",
    ["S1 — User Type Test         : Verify Day / Night / Balanced User labels",
     "S2 — Usage Summary          : Verify monthly consumption kWh",
     "S3 — System Sizes           : Verify kWp and battery size recommendations",
     "S4 — Direct Purchase Prices : Verify solar + battery spot-cash prices",
     "S5 — RTO Monthly Payment    : Verify 60-month rent-to-own amount",
        "S6 — Monthly Savings        : Verify ₱ savings shown on 'Your Package in Detail'",
     "S7 — 25-Year Savings        : Verify 25-year savings amount",
     "Ref — Quick Reference       : Pre-calculated expected values at a glance"])

r = cover_section(ws_cover, r, "Excel Reference Cells (Proposal Generator)",
    ["Proposal Feeder B14  = Monthly Bill (enter bill here to update the sheet)",
     "Proposal Feeder B15  = Electricity rate (must stay at 14.5)",
     "Proposal Feeder B16  = Monthly Savings (₱)",
     "Proposal Feeder B18  = Monthly Consumption (kWh)",
     "Proposal Feeder B30  = 25-Year Savings (₱)",
     "COGS column H rows 3-9 = Solar-only spot-cash prices by kWp",
     "COGS column I rows 3-9 = Solar-only 60-month RTO payment by kWp",
     "COGS column E rows 12-16 = Battery component prices",
     "Annex-A cell F14     = RTO monthly payment (updates with Proposal Feeder)"])

# ════════════════════════════════════════════════════════════════════════════════
# SHEET 2 — S1: User Type
# ════════════════════════════════════════════════════════════════════════════════
ws1 = wb.create_sheet("S1 — User Type")
ws1.sheet_view.showGridLines = False

COLS_S1 = {1: 5, 2: 12, 3: 40, 4: 38, 5: 38, 6: 14, 7: 30}
for c, w in COLS_S1.items():
    ws1.column_dimensions[get_column_letter(c)].width = w

NCOLS = 7

r = 1
section_header(ws1, r, NCOLS, "SECTION 1 — Testing the User Type")
ws1.row_dimensions[r].height = 22
r += 1

instruction_row(ws1, r, NCOLS,
    "Goal: Confirm the website correctly labels the user as Day Time User, Night Time User, or Balanced User.\n"
    "Setup: Use ₱15,000 as the bill for all three tests in this section.")
ws1.row_dimensions[r].height = 45
r += 1

# Column headers
for col, lbl in enumerate(["#", "Test ID", "What to Do on the Website",
                            "What to Check on the Website",
                            "Expected Result / Excel Reference",
                            "Result", "Notes"], 1):
    col_header(ws1, r, col, lbl)
ws1.row_dimensions[r].height = 30
r += 1

tests_s1 = [
    # (test_id, steps_text, check_text, expected_text, row_bg)
    ("1A-1", "Open the calculator. Enter ₱15,000 as the monthly bill.",
     "—", "—", C_LIGHT_GREEN),
    ("1A-2", "On the Appliances step (Step 3), do NOT add any appliances. Click Next.",
     "—", "—", C_LIGHT_GREEN),
    ("1A-3", "Complete the contact form and reach the 'Your Usage Summary' page.",
     "The User Type card (sun icon) should say: Balanced User",
     "Label = 'Balanced User'\nNo specific Excel cell — with no appliances the day/night split is exactly 50/50.", C_LIGHT_GREEN),
    ("1A-4", "Look at the percentage line under the User Type label.",
     "Should say: '50% day · 50% night'",
     "Day% = Night% = 50%\nFormula: Day kWh ÷ Total kWh × 100 = 50% when no appliances added.", C_LIGHT_GREEN),

    ("1B-1", "Start a fresh run. Enter ₱15,000 as the bill.",
     "—", "—", C_LIGHT_BLUE),
    ("1B-2", "On the Appliances step, add one appliance:\n• Device: 1.0hp AC\n• ON: 8:00 AM\n• OFF: 5:00 PM\n• Days: 7 days/week\nClick Next.",
     "—", "—", C_LIGHT_BLUE),
    ("1B-3", "Reach the 'Your Usage Summary' page.",
     "User Type card should say: Day Time User",
     "Label = 'Day Time User'\nReason: AC runs 8 AM–5 PM (daytime), pushing day% above 50%.", C_LIGHT_BLUE),
    ("1B-4", "Check the percentage split below the label.",
     "Day% should be greater than 50%\n(e.g., '57% day · 43% night')",
     "Day% > 50%\nExact value depends on the relative size of the AC vs. total bill.", C_LIGHT_BLUE),

    ("1C-1", "Start a fresh run. Enter ₱15,000 as the bill.",
     "—", "—", C_LIGHT_LIME),
    ("1C-2", "On the Appliances step, add one appliance:\n• Device: 1.0hp AC\n• ON: 8:00 PM\n• OFF: 5:00 AM\n• Days: 7 days/week\nClick Next.",
     "—", "—", C_LIGHT_LIME),
    ("1C-3", "Reach the 'Your Usage Summary' page.",
     "User Type card should say: Night Time User",
     "Label = 'Night Time User'\nReason: AC runs 8 PM–5 AM (nighttime), pushing night% above 50%.", C_LIGHT_LIME),
    ("1C-4", "Check the percentage split below the label.",
     "Day% should be less than 50%\n(e.g., '43% day · 57% night')",
     "Day% < 50%", C_LIGHT_LIME),
]

for i, (tid, steps, check, expected, bg) in enumerate(tests_s1, 1):
    set_cell(ws1, r, 1, i,         bold=True, bg=bg, halign="center")
    set_cell(ws1, r, 2, tid,       bold=True, bg=bg, halign="center")
    set_cell(ws1, r, 3, steps,     bg=bg)
    set_cell(ws1, r, 4, check,     bg=bg)
    set_cell(ws1, r, 5, expected,  bg=bg)
    set_cell(ws1, r, 6, "Not Started", bg=C_NA, halign="center")
    set_cell(ws1, r, 7, "",        bg=C_WHITE)
    ws1.row_dimensions[r].height = 55
    r += 1

add_status_dv(ws1, "F", 4, r - 1)

# ════════════════════════════════════════════════════════════════════════════════
# SHEET 3 — S2: Usage Summary
# ════════════════════════════════════════════════════════════════════════════════
ws2 = wb.create_sheet("S2 — Usage Summary")
ws2.sheet_view.showGridLines = False

COLS_S2 = {1: 5, 2: 12, 3: 20, 4: 24, 5: 24, 6: 28, 7: 14, 8: 14, 9: 30}
for c, w in COLS_S2.items():
    ws2.column_dimensions[get_column_letter(c)].width = w
NCOLS2 = 9

r = 1
section_header(ws2, r, NCOLS2, "SECTION 2 — 'Your Usage Summary' Page: Monthly Consumption")
ws2.row_dimensions[r].height = 22
r += 1
instruction_row(ws2, r, NCOLS2,
    "Setup: Enter each bill amount shown, add NO appliances. "
    "All tests should produce a 'Balanced User' label (50% day / 50% night).\n"
    "Excel: Open Proposal Feeder sheet → type the bill into cell B14 → the consumption appears in cell B18.")
ws2.row_dimensions[r].height = 50
r += 1

for col, lbl in enumerate(["#", "Test ID", "Bill Entered",
                            "Expected User Type", "Expected Day/Night Split",
                            "Expected Monthly Consumption (kWh)",
                            "Actual Value (Website)", "Result", "Notes"], 1):
    col_header(ws2, r, col, lbl)
ws2.row_dimensions[r].height = 35
r += 1

scenarios_s2 = [
    ("2A", "₱10,000", "Balanced User", "50% day · 50% night",
     "690 kWh\n(= 10,000 ÷ 14.5 = 689.66 → rounded to 690)\nProposal Feeder B18 ≈ 690"),
    ("2B", "₱15,000", "Balanced User", "50% day · 50% night",
     "1,034 kWh\n(= 15,000 ÷ 14.5 = 1,034.48 → rounded to 1,034)\nProposal Feeder B18 ≈ 1,034"),
    ("2C", "₱20,000", "Balanced User", "50% day · 50% night",
     "1,379 kWh\n(= 20,000 ÷ 14.5 = 1,379.31 → rounded to 1,379)\nProposal Feeder B18 ≈ 1,379"),
    ("2D", "₱30,000", "Balanced User", "50% day · 50% night",
     "2,069 kWh\n(= 30,000 ÷ 14.5 = 2,068.97 → rounded to 2,069)\nProposal Feeder B18 ≈ 2,069"),
]

bg_cycle = [C_LIGHT_GREEN, C_LIGHT_BLUE, C_LIGHT_LIME, C_LIGHT_GREEN]
for i, (tid, bill, utype, split, expected) in enumerate(scenarios_s2):
    bg = bg_cycle[i % len(bg_cycle)]
    set_cell(ws2, r, 1, i + 1,    bold=True, bg=bg, halign="center")
    set_cell(ws2, r, 2, tid,       bold=True, bg=bg, halign="center")
    set_cell(ws2, r, 3, bill,      bold=True, bg=bg, halign="center")
    set_cell(ws2, r, 4, utype,     bg=bg, halign="center")
    set_cell(ws2, r, 5, split,     bg=bg, halign="center")
    set_cell(ws2, r, 6, expected,  bg=bg)
    set_cell(ws2, r, 7, "",        bg=C_WHITE, halign="center")
    set_cell(ws2, r, 8, "Not Started", bg=C_NA, halign="center")
    set_cell(ws2, r, 9, "",        bg=C_WHITE)
    ws2.row_dimensions[r].height = 55
    r += 1

add_status_dv(ws2, "H", 4, r - 1)

# ════════════════════════════════════════════════════════════════════════════════
# SHEET 4 — S3: System Sizes
# ════════════════════════════════════════════════════════════════════════════════
ws3 = wb.create_sheet("S3 — System Sizes")
ws3.sheet_view.showGridLines = False

COLS_S3 = {1: 5, 2: 12, 3: 18, 4: 16, 5: 18, 6: 18, 7: 18, 8: 18, 9: 14, 10: 14, 11: 30}
for c, w in COLS_S3.items():
    ws3.column_dimensions[get_column_letter(c)].width = w
NCOLS3 = 11

r = 1
section_header(ws3, r, NCOLS3, "SECTION 3 — Choose Your Package: Recommended System Sizes")
ws3.row_dimensions[r].height = 22
r += 1
instruction_row(ws3, r, NCOLS3,
    "Setup: Enter each bill amount, add NO appliances. "
    "Check that the website shows the correct kWp size and battery size for each package.\n"
    "Note: The 3rd card ('Full Independence') is always locked — you do NOT need to check numbers behind that lock.")
ws3.row_dimensions[r].height = 45
r += 1

for col, lbl in enumerate(["#", "Test ID", "Bill Entered", "Package",
                            "Expected kWp", "Expected Battery",
                            "Actual kWp (Website)", "Actual Battery (Website)",
                            "Result", "Notes", "Excel Reference"], 1):
    col_header(ws3, r, col, lbl)
ws3.row_dimensions[r].height = 35
r += 1

system_tests = [
    ("3A", "₱10,000", "Starter",     "5 kWp",  "None",   "COGS sheet Row 3: 5.04 kWp = 8 panels × 630W"),
    ("3B", "₱10,000", "Recommended", "5 kWp",  "5 kWh",  "COGS sheet Row 3 (solar) + Row 12 (1× Pylontech battery)"),
    ("3C", "₱15,000", "Starter",     "5 kWp",  "None",   "COGS sheet Row 3"),
    ("3D", "₱15,000", "Recommended", "5 kWp",  "5 kWh",  "COGS sheet Row 3 + Row 12"),
    ("3E", "₱20,000", "Starter",     "5 kWp",  "None",   "COGS sheet Row 3"),
    ("3F", "₱20,000", "Recommended", "8 kWp",  "5 kWh",  "COGS sheet Row 5: 8.19 kWp = 13 panels × 630W"),
    ("3G", "₱30,000", "Starter",     "6 kWp",  "None",   "COGS sheet Row 4: 6.3 kWp = 10 panels × 630W"),
    ("3H", "₱30,000", "Recommended", "10 kWp", "10 kWh", "COGS sheet Row 6: 10.08 kWp = 16 panels × 630W + 2 batteries"),
]

bg_by_bill = {"₱10,000": C_LIGHT_GREEN, "₱15,000": C_LIGHT_BLUE,
              "₱20,000": C_LIGHT_LIME,  "₱30,000": C_LIGHT_GREEN}
for i, (tid, bill, pkg, kwp, batt, ref) in enumerate(system_tests):
    bg = bg_by_bill.get(bill, C_LIGHT_GREY)
    set_cell(ws3, r, 1,  i + 1, bold=True, bg=bg, halign="center")
    set_cell(ws3, r, 2,  tid,   bold=True, bg=bg, halign="center")
    set_cell(ws3, r, 3,  bill,  bold=True, bg=bg, halign="center")
    set_cell(ws3, r, 4,  pkg,   bg=bg, halign="center")
    set_cell(ws3, r, 5,  kwp,   bold=True, bg=bg, halign="center",
             font_color=C_DARK_GREEN)
    set_cell(ws3, r, 6,  batt,  bold=True, bg=bg, halign="center",
             font_color=C_BLUE)
    set_cell(ws3, r, 7,  "",    bg=C_WHITE, halign="center")
    set_cell(ws3, r, 8,  "",    bg=C_WHITE, halign="center")
    set_cell(ws3, r, 9,  "Not Started", bg=C_NA, halign="center")
    set_cell(ws3, r, 10, "",   bg=C_WHITE)
    set_cell(ws3, r, 11, ref,  bg=C_LIGHT_GREY, size=9, italic=True)
    ws3.row_dimensions[r].height = 40
    r += 1

add_status_dv(ws3, "I", 4, r - 1)

# ════════════════════════════════════════════════════════════════════════════════
# SHEET 5 — S4: Direct Purchase Prices
# ════════════════════════════════════════════════════════════════════════════════
ws4 = wb.create_sheet("S4 — Direct Purchase")
ws4.sheet_view.showGridLines = False

COLS_S4 = {1: 5, 2: 12, 3: 18, 4: 16, 5: 18, 6: 18, 7: 22, 8: 22, 9: 14, 10: 14, 11: 35}
for c, w in COLS_S4.items():
    ws4.column_dimensions[get_column_letter(c)].width = w
NCOLS4 = 11

r = 1
section_header(ws4, r, NCOLS4, "SECTION 4 — Direct Purchase Pricing")
ws4.row_dimensions[r].height = 22
r += 1
instruction_row(ws4, r, NCOLS4,
    "Setup: Enter each bill shown, add NO appliances. On the Results page, click 'Direct Purchase' on the toggle.\n"
    "The price shown on the package card is the combined Direct Purchase price (solar + battery if any).")
ws4.row_dimensions[r].height = 40
r += 1

for col, lbl in enumerate(["#", "Test ID", "Bill", "Package",
                            "Expected System\n(kWp + Battery)",
                            "Expected Total DP Price",
                            "Actual Price (Website)", "Result", "Notes",
                            "Solar Price\n(COGS col H)",
                            "Battery Add-On\n(COGS rows 12-16)"], 1):
    col_header(ws4, r, col, lbl)
ws4.row_dimensions[r].height = 40
r += 1

dp_tests = [
    # (test_id, bill, package, system_desc, expected_total, solar_price, battery_addon)
    ("4A", "₱10,000", "Starter",     "5 kWp, no battery",    "₱233,000",  "₱233,000\n(COGS H3)",  "None"),
    ("4B", "₱10,000", "Recommended", "5 kWp + 5 kWh",        "₱359,311",  "₱233,000\n(COGS H3)",  "₱126,311\n(1 battery)"),
    ("4C", "₱15,000", "Starter",     "5 kWp, no battery",    "₱233,000",  "₱233,000\n(COGS H3)",  "None"),
    ("4D", "₱15,000", "Recommended", "5 kWp + 5 kWh",        "₱359,311",  "₱233,000\n(COGS H3)",  "₱126,311\n(1 battery)"),
    ("4E", "₱20,000", "Starter",     "5 kWp, no battery",    "₱233,000",  "₱233,000\n(COGS H3)",  "None"),
    ("4F", "₱20,000", "Recommended", "8 kWp + 5 kWh",        "₱504,311",  "₱378,000\n(COGS H5)",  "₱126,311\n(1 battery)"),
    ("4G", "₱30,000", "Starter",     "6 kWp, no battery",    "₱289,000",  "₱289,000\n(COGS H4)",  "None"),
    ("4H", "₱30,000", "Recommended", "10 kWp + 10 kWh",      "₱633,756",  "₱418,000\n(COGS H6)",  "₱215,756\n(2 batteries)"),
]

for i, (tid, bill, pkg, sys_desc, expected, solar, batt_addon) in enumerate(dp_tests):
    bg = bg_by_bill.get(bill, C_LIGHT_GREY)
    set_cell(ws4, r, 1,  i + 1,       bold=True, bg=bg, halign="center")
    set_cell(ws4, r, 2,  tid,          bold=True, bg=bg, halign="center")
    set_cell(ws4, r, 3,  bill,         bold=True, bg=bg, halign="center")
    set_cell(ws4, r, 4,  pkg,          bg=bg, halign="center")
    set_cell(ws4, r, 5,  sys_desc,     bg=bg, halign="center")
    set_cell(ws4, r, 6,  expected,     bold=True, bg=bg, halign="center",
             font_color=C_DARK_GREEN)
    set_cell(ws4, r, 7,  "",           bg=C_WHITE, halign="center")
    set_cell(ws4, r, 8,  "Not Started", bg=C_NA,  halign="center")
    set_cell(ws4, r, 9,  "",           bg=C_WHITE)
    set_cell(ws4, r, 10, solar,        bg=C_LIGHT_GREY, size=9, halign="center")
    set_cell(ws4, r, 11, batt_addon,   bg=C_LIGHT_GREY, size=9, halign="center")
    ws4.row_dimensions[r].height = 50
    r += 1

add_status_dv(ws4, "H", 4, r - 1)

# ── Battery add-on breakdown reference ─────────────────────────────────────
r += 1
section_header(ws4, r, NCOLS4, "Battery Add-On Price Breakdown (from COGS sheet)")
ws4.row_dimensions[r].height = 22
r += 1
instruction_row(ws4, r, NCOLS4,
    "These are the component prices that make up the battery add-on cost. "
    "The website adds these automatically when a Recommended package includes a battery.")
ws4.row_dimensions[r].height = 35
r += 1

for col, lbl in enumerate(["Component", "COGS Cell", "Price per Unit",
                            "1 Battery (5 kWh)", "2 Batteries (10 kWh)",
                            "3 Batteries (15 kWh)", "4 Batteries (20 kWh)",
                            None, None, None, None], 1):
    if lbl:
        col_header(ws4, r, col, lbl, bg=C_BLUE)
ws4.merge_cells(start_row=r, start_column=8, end_row=r, end_column=11)
ws4.row_dimensions[r].height = 30
r += 1

batt_components = [
    ("5 kWh Pylontech Battery (per unit)", "COGS E12", "₱89,444", "×1 = ₱89,444", "×2 = ₱178,889", "×3 = ₱268,333", "×4 = ₱357,778"),
    ("Battery Rack (holds up to 3 units)", "COGS E13", "₱7,778",  "×1 = ₱7,778",  "×1 = ₱7,778",   "×1 = ₱7,778",   "×2 = ₱15,556"),
    ("Automatic Transfer Switch (ATS)",    "COGS E14", "₱9,333",  "₱9,333",        "₱9,333",         "₱9,333",         "₱9,333"),
    ("Materials for Critical Loads",       "COGS E15", "₱3,422",  "₱3,422",        "₱3,422",         "₱3,422",         "₱3,422"),
    ("Labor & Install (with solar pkg)",   "COGS E16", "₱16,333", "₱16,333",       "₱16,333",        "₱16,333",        "₱16,333"),
    ("TOTAL",                              "",          "",        "₱126,311",      "₱215,756",       "₱305,200",       "₱402,422"),
]

for comp_row in batt_components:
    is_total = comp_row[0] == "TOTAL"
    bg_row = C_DARK_GREEN if is_total else C_LIGHT_GREY
    fc_row = C_WHITE if is_total else "000000"
    for col_i, val in enumerate(comp_row[:7], 1):
        set_cell(ws4, r, col_i, val, bold=is_total,
                 bg=bg_row, font_color=fc_row, size=10,
                 halign="center" if col_i > 2 else "left")
    ws4.row_dimensions[r].height = 22
    r += 1

# ════════════════════════════════════════════════════════════════════════════════
# SHEET 6 — S5: RTO Monthly Payment
# ════════════════════════════════════════════════════════════════════════════════
ws5 = wb.create_sheet("S5 — RTO Payment")
ws5.sheet_view.showGridLines = False

COLS_S5 = {1: 5, 2: 12, 3: 18, 4: 16, 5: 22, 6: 22, 7: 22, 8: 14, 9: 14, 10: 35}
for c, w in COLS_S5.items():
    ws5.column_dimensions[get_column_letter(c)].width = w
NCOLS5 = 10

r = 1
section_header(ws5, r, NCOLS5, "SECTION 5 — Rent-to-Own (RTO) Monthly Payment")
ws5.row_dimensions[r].height = 22
r += 1
instruction_row(ws5, r, NCOLS5,
    "Setup: Enter each bill shown, add NO appliances. "
    "The toggle on the Results page defaults to 'Rent-to-Own' — leave it as-is.\n"
    "Check the monthly payment shown on each package card. "
    "Rate = 28% annual interest over 60 months.")
ws5.row_dimensions[r].height = 45
r += 1

for col, lbl in enumerate(["#", "Test ID", "Bill", "Package",
                            "Expected System",
                            "Expected RTO Monthly Payment",
                            "Actual Payment (Website)",
                            "Result", "Notes", "Excel Reference"], 1):
    col_header(ws5, r, col, lbl)
ws5.row_dimensions[r].height = 35
r += 1

rto_tests = [
    ("5A", "₱10,000", "Starter",     "5 kWp, no battery", "₱7,089/month",  "COGS sheet I3 = 7,089\n(solar-only 60-mo PMT for 5 kWp @ 28%)"),
    ("5B", "₱10,000", "Recommended", "5 kWp + 5 kWh",     "₱10,932/month", "Set Proposal Feeder B14=10000 → Annex-A cell F14"),
    ("5C", "₱15,000", "Starter",     "5 kWp, no battery", "₱7,089/month",  "COGS sheet I3 = 7,089"),
    ("5D", "₱15,000", "Recommended", "5 kWp + 5 kWh",     "₱10,932/month", "Set Proposal Feeder B14=15000 → Annex-A cell F14"),
    ("5E", "₱20,000", "Starter",     "5 kWp, no battery", "₱7,089/month",  "COGS sheet I3 = 7,089"),
    ("5F", "₱20,000", "Recommended", "8 kWp + 5 kWh",     "₱15,344/month", "Set Proposal Feeder B14=20000, select 8kWp → Annex-A cell F14"),
    ("5G", "₱30,000", "Starter",     "6 kWp, no battery", "₱8,793/month",  "COGS sheet I4 = 8,793\n(solar-only 60-mo PMT for 6 kWp @ 28%)"),
    ("5H", "₱30,000", "Recommended", "10 kWp + 10 kWh",   "₱19,283/month", "Set Proposal Feeder B14=30000, select 10kWp + 2 batteries → Annex-A cell F14"),
]

for i, (tid, bill, pkg, sys_desc, expected, ref) in enumerate(rto_tests):
    bg = bg_by_bill.get(bill, C_LIGHT_GREY)
    set_cell(ws5, r, 1,  i + 1,    bold=True, bg=bg, halign="center")
    set_cell(ws5, r, 2,  tid,       bold=True, bg=bg, halign="center")
    set_cell(ws5, r, 3,  bill,      bold=True, bg=bg, halign="center")
    set_cell(ws5, r, 4,  pkg,       bg=bg, halign="center")
    set_cell(ws5, r, 5,  sys_desc,  bg=bg, halign="center")
    set_cell(ws5, r, 6,  expected,  bold=True, bg=bg, halign="center",
             font_color=C_DARK_GREEN)
    set_cell(ws5, r, 7,  "",        bg=C_WHITE, halign="center")
    set_cell(ws5, r, 8,  "Not Started", bg=C_NA, halign="center")
    set_cell(ws5, r, 9,  "",        bg=C_WHITE)
    set_cell(ws5, r, 10, ref,       bg=C_LIGHT_GREY, size=9, italic=True)
    ws5.row_dimensions[r].height = 50
    r += 1

add_status_dv(ws5, "H", 4, r - 1)

# ════════════════════════════════════════════════════════════════════════════════
# SHEET 7 — S6: Monthly Savings
# ════════════════════════════════════════════════════════════════════════════════
ws6 = wb.create_sheet("S6 — Monthly Savings")
ws6.sheet_view.showGridLines = False

COLS_S6 = {1: 5, 2: 12, 3: 18, 4: 16, 5: 22, 6: 22, 7: 20, 8: 20, 9: 22, 10: 22, 11: 14, 12: 14, 13: 30}
for c, w in COLS_S6.items():
    ws6.column_dimensions[get_column_letter(c)].width = w
NCOLS6 = 13

r = 1
section_header(ws6, r, NCOLS6, "SECTION 6 — 'Your Package in Detail' Page: Monthly Savings")
ws6.row_dimensions[r].height = 22
r += 1
instruction_row(ws6, r, NCOLS6,
    "How to get there: On the Results page, click 'View details' under the Starter or Recommended package.\n"
    "You will land on 'Your Package in Detail'. Check the GREEN card at the top for monthly savings "
    "and the savings % badge below it.\n"
    "Excel reference: Proposal Feeder B16 = Solar Savings (₱/month).")
ws6.row_dimensions[r].height = 55
r += 1

for col, lbl in enumerate(["#", "Test ID", "Bill", "Package Clicked",
                            "Expected System",
                            "Expected Monthly Savings (₱)",
                            "Expected Savings %",
                            "Actual ₱ Savings (Website)",
                            "Actual Savings % (Website)",
                            "Both Match?", "Result", "Notes",
                            "Excel Cell"], 1):
    col_header(ws6, r, col, lbl)
ws6.row_dimensions[r].height = 40
r += 1

savings_tests = [
    ("6A", "₱10,000", "Starter",     "5 kWp, no battery",  "₱4,300/month",  "-44%", "Proposal Feeder B16 (B14=10000, 5kWp no battery)"),
    ("6B", "₱10,000", "Recommended", "5 kWp + 5 kWh",      "₱6,400/month",  "-64%", "Proposal Feeder B16 (B14=10000, 5kWp + 1 battery)"),
    ("6C", "₱15,000", "Starter",     "5 kWp, no battery",  "₱6,000/month",  "-40%", "Proposal Feeder B16 (B14=15000, 5kWp no battery)"),
    ("6D", "₱15,000", "Recommended", "5 kWp + 5 kWh",      "₱7,800/month",  "-52%", "Proposal Feeder B16 (B14=15000, 5kWp + 1 battery)"),
    ("6E", "₱20,000", "Starter",     "5 kWp, no battery",  "₱7,200/month",  "-36%", "Proposal Feeder B16 (B14=20000, 5kWp no battery)"),
    ("6F", "₱20,000", "Recommended", "8 kWp + 5 kWh",      "₱10,400/month", "-52%", "Proposal Feeder B16 (B14=20000, 8kWp + 1 battery)"),
    ("6G", "₱30,000", "Starter",     "6 kWp, no battery",  "₱9,800/month",  "-33%", "Proposal Feeder B16 (B14=30000, 6kWp no battery)"),
    ("6H", "₱30,000", "Recommended", "10 kWp + 10 kWh",    "₱15,700/month", "-52%", "Proposal Feeder B16 (B14=30000, 10kWp + 2 batteries)"),
]

for i, (tid, bill, pkg, sys_desc, expected_sav, expected_pct, ref) in enumerate(savings_tests):
    bg = bg_by_bill.get(bill, C_LIGHT_GREY)
    set_cell(ws6, r, 1,  i + 1,       bold=True, bg=bg, halign="center")
    set_cell(ws6, r, 2,  tid,          bold=True, bg=bg, halign="center")
    set_cell(ws6, r, 3,  bill,         bold=True, bg=bg, halign="center")
    set_cell(ws6, r, 4,  pkg,          bg=bg, halign="center")
    set_cell(ws6, r, 5,  sys_desc,     bg=bg, halign="center")
    set_cell(ws6, r, 6,  expected_sav, bold=True, bg=bg, halign="center",
             font_color=C_DARK_GREEN)
    set_cell(ws6, r, 7,  expected_pct, bold=True, bg=bg, halign="center",
             font_color=C_DARK_GREEN)
    set_cell(ws6, r, 8,  "",           bg=C_WHITE, halign="center")
    set_cell(ws6, r, 9,  "",           bg=C_WHITE, halign="center")
    set_cell(ws6, r, 10, "",           bg=C_WHITE, halign="center")
    set_cell(ws6, r, 11, "Not Started", bg=C_NA,   halign="center")
    set_cell(ws6, r, 12, "",           bg=C_WHITE)
    set_cell(ws6, r, 13, ref,          bg=C_LIGHT_GREY, size=9, italic=True)
    ws6.row_dimensions[r].height = 45
    r += 1

add_status_dv(ws6, "K", 4, r - 1)

# ════════════════════════════════════════════════════════════════════════════════
# SHEET 8 — S7: 25-Year Savings
# ════════════════════════════════════════════════════════════════════════════════
ws7 = wb.create_sheet("S7 — 25-Year Savings")
ws7.sheet_view.showGridLines = False

COLS_S7 = {1: 5, 2: 12, 3: 18, 4: 16, 5: 22, 6: 26, 7: 26, 8: 14, 9: 14, 10: 38}
for c, w in COLS_S7.items():
    ws7.column_dimensions[get_column_letter(c)].width = w
NCOLS7 = 10

r = 1
section_header(ws7, r, NCOLS7, "SECTION 7 — 'Your Package in Detail' Page: 25-Year Savings")
ws7.row_dimensions[r].height = 22
r += 1
instruction_row(ws7, r, NCOLS7,
    "How to get there: On the Results page, click 'View details' under a package to open 'Your Package in Detail'.\n"
    "Check the LIME GREEN card labeled '25-year savings'.\n"
    "Excel reference: Proposal Feeder B30 = Your 25-Year Savings (updates when you change B14).\n"
    "Note: Savings grow ~2.5%/year because electricity rates rise 3%/year but panels degrade 0.5%/year.")
ws7.row_dimensions[r].height = 65
r += 1

for col, lbl in enumerate(["#", "Test ID", "Bill", "Package Clicked",
                            "Expected System",
                            "Expected 25-Year Savings",
                            "Actual 25-Year Savings (Website)",
                            "Result", "Notes", "Excel Reference"], 1):
    col_header(ws7, r, col, lbl)
ws7.row_dimensions[r].height = 35
r += 1

yr25_tests = [
    ("7A", "₱10,000", "Starter",     "5 kWp, no battery",  "₱1,790,836",  "Proposal Feeder B30 (B14=10000, 5kWp no battery)"),
    ("7B", "₱10,000", "Recommended", "5 kWp + 5 kWh",      "₱2,665,430",  "Proposal Feeder B30 (B14=10000, 5kWp + 1 battery)"),
    ("7C", "₱15,000", "Starter",     "5 kWp, no battery",  "₱2,498,841",  "Proposal Feeder B30 (B14=15000, 5kWp no battery)"),
    ("7D", "₱15,000", "Recommended", "5 kWp + 5 kWh",      "₱3,248,493",  "Proposal Feeder B30 (B14=15000, 5kWp + 1 battery)"),
    ("7E", "₱20,000", "Starter",     "5 kWp, no battery",  "₱2,998,609",  "Proposal Feeder B30 (B14=20000, 5kWp no battery)"),
    ("7F", "₱20,000", "Recommended", "8 kWp + 5 kWh",      "₱4,331,324",  "Proposal Feeder B30 (B14=20000, 8kWp + 1 battery)"),
    ("7G", "₱30,000", "Starter",     "6 kWp, no battery",  "₱4,081,440",  "Proposal Feeder B30 (B14=30000, 6kWp no battery)"),
    ("7H", "₱30,000", "Recommended", "10 kWp + 10 kWh",    "₱6,538,633",  "Proposal Feeder B30 (B14=30000, 10kWp + 2 batteries)"),
]

for i, (tid, bill, pkg, sys_desc, expected, ref) in enumerate(yr25_tests):
    bg = bg_by_bill.get(bill, C_LIGHT_GREY)
    set_cell(ws7, r, 1,  i + 1,    bold=True, bg=bg, halign="center")
    set_cell(ws7, r, 2,  tid,       bold=True, bg=bg, halign="center")
    set_cell(ws7, r, 3,  bill,      bold=True, bg=bg, halign="center")
    set_cell(ws7, r, 4,  pkg,       bg=bg, halign="center")
    set_cell(ws7, r, 5,  sys_desc,  bg=bg, halign="center")
    set_cell(ws7, r, 6,  expected,  bold=True, bg=bg, halign="center",
             font_color=C_DARK_GREEN)
    set_cell(ws7, r, 7,  "",        bg=C_WHITE, halign="center")
    set_cell(ws7, r, 8,  "Not Started", bg=C_NA, halign="center")
    set_cell(ws7, r, 9,  "",        bg=C_WHITE)
    set_cell(ws7, r, 10, ref,       bg=C_LIGHT_GREY, size=9, italic=True)
    ws7.row_dimensions[r].height = 40
    r += 1

add_status_dv(ws7, "H", 4, r - 1)

# ════════════════════════════════════════════════════════════════════════════════
# SHEET 9 — Ref: Quick Reference
# ════════════════════════════════════════════════════════════════════════════════
ws_ref = wb.create_sheet("Ref — Quick Reference")
ws_ref.sheet_view.showGridLines = False

COLS_REF = {1: 22, 2: 18, 3: 14, 4: 14, 5: 16, 6: 16, 7: 16, 8: 18}
for c, w in COLS_REF.items():
    ws_ref.column_dimensions[get_column_letter(c)].width = w

r = 1
section_header(ws_ref, r, 8, "Quick Reference — All Expected Values at a Glance")
ws_ref.row_dimensions[r].height = 22
r += 1

def ref_section(ws, row, bill, kwh, label):
    # Bill header
    c = ws.cell(row=row, column=1,
                value=f"{bill}/month bill  →  {kwh} kWh  ({label})")
    c.font = Font(bold=True, color=C_WHITE, size=11)
    c.fill = fill(C_BLUE)
    c.alignment = Alignment(horizontal="left", vertical="center")
    c.border = MED_BORDER
    ws.merge_cells(start_row=row, start_column=1,
                   end_row=row,   end_column=8)
    ws.row_dimensions[row].height = 22
    row += 1
    # Column headers
    for col, lbl in enumerate(["Package", "System",
                                "DP Price", "RTO/month",
                                "Monthly\nSavings", "Savings %",
                                "25-Year\nSavings", "Battery\nSize"], 1):
        col_header(ws, row, col, lbl, bg=C_GREY_HDR)
    ws.row_dimensions[row].height = 30
    row += 1
    return row

def ref_data_row(ws, row, pkg, system, dp, rto, sav, pct, yr25, batt, is_rec=False):
    bg = C_LIGHT_LIME if is_rec else C_LIGHT_GREY
    fc = C_DARK_GREEN if is_rec else "000000"
    vals = [pkg, system, dp, rto, sav, pct, yr25, batt]
    for col, val in enumerate(vals, 1):
        bold = is_rec or col in (3, 4, 5, 7)
        set_cell(ws, row, col, val, bold=bold, bg=bg,
                 font_color=fc, halign="center")
    ws.row_dimensions[row].height = 22
    return row + 1

r = ref_section(ws_ref, r, "₱10,000", "690 kWh", "Balanced User, 50% day / 50% night")
r = ref_data_row(ws_ref, r, "Starter",     "5 kWp",           "₱233,000",  "₱7,089",   "₱4,300",   "-44%", "₱1,790,836", "None")
r = ref_data_row(ws_ref, r, "Recommended", "5 kWp + 5 kWh",   "₱359,311",  "₱10,932",  "₱6,400",   "-64%", "₱2,665,430", "5 kWh", True)
r += 1

r = ref_section(ws_ref, r, "₱15,000", "1,034 kWh", "Balanced User, 50% day / 50% night")
r = ref_data_row(ws_ref, r, "Starter",     "5 kWp",           "₱233,000",  "₱7,089",   "₱6,000",   "-40%", "₱2,498,841", "None")
r = ref_data_row(ws_ref, r, "Recommended", "5 kWp + 5 kWh",   "₱359,311",  "₱10,932",  "₱7,800",   "-52%", "₱3,248,493", "5 kWh", True)
r += 1

r = ref_section(ws_ref, r, "₱20,000", "1,379 kWh", "Balanced User, 50% day / 50% night")
r = ref_data_row(ws_ref, r, "Starter",     "5 kWp",           "₱233,000",  "₱7,089",   "₱7,200",   "-36%", "₱2,998,609", "None")
r = ref_data_row(ws_ref, r, "Recommended", "8 kWp + 5 kWh",   "₱504,311",  "₱15,344",  "₱10,400",  "-52%", "₱4,331,324", "5 kWh", True)
r += 1

r = ref_section(ws_ref, r, "₱30,000", "2,069 kWh", "Balanced User, 50% day / 50% night")
r = ref_data_row(ws_ref, r, "Starter",     "6 kWp",           "₱289,000",  "₱8,793",   "₱9,800",   "-33%", "₱4,081,440", "None")
r = ref_data_row(ws_ref, r, "Recommended", "10 kWp + 10 kWh", "₱633,756",  "₱19,283",  "₱15,700",  "-52%", "₱6,538,633", "10 kWh", True)
r += 2

# Solar price table
section_header(ws_ref, r, 8, "Solar-Only Spot Cash Prices (COGS sheet, column H)")
ws_ref.row_dimensions[r].height = 22
r += 1
for col, lbl in enumerate(["kWp Label", "Panel Count",
                            "System kWp\n(actual)", "Spot Cash Price",
                            "60-mo RTO\nPayment", None, None, None], 1):
    if lbl:
        col_header(ws_ref, r, col, lbl, bg=C_GREY_HDR)
ws_ref.row_dimensions[r].height = 30
r += 1

solar_prices = [
    ("5 kWp",  "8 panels",  "5.04 kWp", "₱233,000", "₱7,089/mo"),
    ("6 kWp",  "10 panels", "6.30 kWp", "₱289,000", "₱8,793/mo"),
    ("8 kWp",  "13 panels", "8.19 kWp", "₱378,000", "₱11,501/mo"),
    ("10 kWp", "16 panels", "10.08 kWp","₱418,000", "₱12,718/mo"),
    ("13 kWp", "20 panels", "12.60 kWp","₱497,000", "₱15,122/mo"),
    ("15 kWp", "24 panels", "15.12 kWp","₱593,000", "₱18,043/mo"),
    ("20 kWp", "32 panels", "20.16 kWp","₱765,000", "₱23,276/mo"),
]
for i, row_data in enumerate(solar_prices):
    bg = C_LIGHT_GREY if i % 2 == 0 else C_WHITE
    for col, val in enumerate(row_data, 1):
        set_cell(ws_ref, r, col, val, bg=bg, halign="center")
    ws_ref.row_dimensions[r].height = 20
    r += 1

# ── Set active sheet to cover ────────────────────────────────────────────────
wb.active = ws_cover

wb.save(OUT)
print(f"✅  Saved: {OUT}")
print("   Sheets: Instructions, S1–S7, Ref — Quick Reference")
print("   Each test row has a Pass/Fail/Blocked/N/A dropdown in the Result column.")
