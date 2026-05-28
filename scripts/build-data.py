"""Build data/sessions.json from AFFC Excel schedule. Run from repo root: py scripts/build-data.py"""
import json
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
XLSX = Path(r"c:\Users\fitdesk\Downloads\High School Swim Calendar @AFFC.xlsx")
SHEET = "2025-2026 HS swim schedule"

SLOT_COLUMNS = {
    4: ("Regular", "AM", "AM session 1", "11:00am - 1:00pm", 2.0),
    5: ("Regular", "AM", "AM session 2", "1:00pm - 3:00pm", 2.0),
    6: ("Wednesday Block", "AM", "Wed block 1", "11:30am - 12:30pm", 1.0),
    7: ("Wednesday Block", "AM", "Wed block 2", "12:30pm - 1:30pm", 1.0),
    8: ("Wednesday Block", "AM", "Wed block 3", "1:30pm - 3:00pm", 1.5),
    9: ("Regular", "PM", "PM Group 1", "8:00pm - 9:00pm", 1.0),
    10: ("Regular", "PM", "PM Group 2", "8:00pm - 9:00pm", 1.0),
    11: ("Holiday", "AM", "Saturday", "10:00am - 11:30am", 1.5),
    12: ("Holiday", "PM", "Jan PM only", "7:00pm - 8:00pm", 1.0),
    14: ("Holiday", "AM", "Holiday A", "8:00am - 9:15am", 1.25),
    15: ("Holiday", "AM", "Holiday B", "9:15am - 10:30am", 1.25),
    16: ("Holiday", "AM", "Holiday C", "10:30am - 11:45am", 1.25),
    17: ("Holiday", "AM", "Holiday D", "11:45am - 1:00pm", 1.25),
}


def norm_school(v):
    s = str(v).strip().upper()
    if s in ("AFHS", "LPHS", "PGHS"):
        return s
    if s in ("SKYR", "SKYRIDGE"):
        return "SKYR"
    return None


def day_bucket(dt: pd.Timestamp) -> str:
    wd = dt.dayofweek  # Mon=0 … Sun=6
    if wd == 2:
        return "Wednesday"
    if wd in (5, 6):
        return "Weekend"
    if wd in (0, 1, 3, 4):  # Mon, Tue, Thu, Fri
        return "Mon-Tue-Thu-Fri"
    return "Other"


def course_type(dt, lanes: str, meet_val, slot_cat: str) -> str:
    if pd.notna(meet_val) and "LONG COURSE" in str(meet_val).upper():
        return "Long Course"
    if slot_cat == "Holiday" and "2 long course" in lanes.lower() and "short" not in lanes.lower():
        return "Long Course"
    if dt.dayofweek in (5, 6):  # Sat, Sun
        return "Long Course"
    if dt.dayofweek in (1, 3):  # Tue, Thu → long course
        return "Long Course"
    return "Short Course"  # Mon, Wed, Fri


def invoice_section(slot_cat: str, slot_name: str, meet_val) -> str:
    if slot_cat == "Holiday":
        return "Holiday & Special"
    return "Regular"


def noteworthy_flags(dt, slot_cat, slot_name, meet_val, weekday_name) -> list[str]:
    flags = []
    if pd.notna(meet_val) and str(meet_val).strip() and str(meet_val).strip() not in (
        " ",
    ):
        if "LONG COURSE" in str(meet_val).upper():
            flags.append("Long course season day")
        elif "HAST" in str(meet_val).upper() or "MEET" in str(meet_val).upper():
            flags.append("Meet / event on calendar")
    if slot_cat == "Holiday":
        flags.append("Holiday or special slot")
    if slot_cat == "Wednesday Block":
        flags.append("Wednesday block column")
    if slot_name == "Jan PM only":
        flags.append("January-only PM slot")
    if dt.dayofweek == 5:
        flags.append("Saturday")
    return flags


def main():
    if not XLSX.exists():
        print(f"Missing schedule file: {XLSX}", file=sys.stderr)
        sys.exit(1)
    df = pd.read_excel(XLSX, sheet_name=SHEET, header=None)
    sessions = []
    excluded = []
    for r in range(7, len(df)):
        date_val = df.iloc[r, 1]
        if pd.isna(date_val):
            continue
        dt = pd.to_datetime(date_val)
        date_str = dt.strftime("%Y-%m-%d")
        weekday = str(df.iloc[r, 0]) if pd.notna(df.iloc[r, 0]) else ""
        meet_val = df.iloc[r, 3]
        for col, (slot_cat, ampm, slot_name, time_str, hours) in SLOT_COLUMNS.items():
            if col >= df.shape[1]:
                continue
            cell = df.iloc[r, col]
            if pd.isna(cell):
                continue
            school = norm_school(cell)
            if not school:
                excluded.append(
                    {"date": date_str, "slot": slot_name, "value": str(cell).strip()}
                )
                continue
            lanes = (
                "2 long course"
                if slot_cat == "Holiday" and "Saturday" in slot_name
                else "7 short course and/or 3 long course"
            )
            ct = course_type(dt, lanes, meet_val, slot_cat)
            db = day_bucket(dt)
            section = invoice_section(slot_cat, slot_name, meet_val)
            flags = noteworthy_flags(dt, slot_cat, slot_name, meet_val, weekday)
            sessions.append(
                {
                    "date": date_str,
                    "weekday": weekday,
                    "school": school,
                    "course": ct,
                    "day_group": db,
                    "am_pm": ampm,
                    "slot_category": slot_cat,
                    "slot": slot_name,
                    "time": time_str,
                    "hours": hours,
                    "section": section,
                    "flags": flags,
                }
            )

    out = {
        "meta": {
            "season": "2025-2026",
            "source": str(XLSX),
            "sheet": SHEET,
            "total_sessions": len(sessions),
            "excluded_cells": excluded,
        },
        "sessions": sessions,
    }
    path = ROOT / "data" / "sessions.json"
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"OK: {len(sessions)} sessions, {len(excluded)} excluded -> {path}")


if __name__ == "__main__":
    main()
