import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { getValidCampusSession } from "@/lib/session";
import {
  useListDailyAltarReports,
  useUpsertDailyAltarReport,
  useDeleteDailyAltarReport,
  useSaveServiceNotes,
  getGetServiceNotesQueryOptions,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery, useQueries } from "@tanstack/react-query";
import type { DailyAltarReport } from "@workspace/api-client-react";
import { jsPDF } from "jspdf";

const CAMPUSES = ["HALLMARK", "ARROWHEAD", "RIVERSIDE", "POMONA", "LA", "ARIZONA"];
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// Per-campus service times — Sunday and Wednesday
const CAMPUS_SERVICES: Record<string, { sunday: string[]; wednesday: string[] }> = {
  HALLMARK:  { sunday: ["8am", "10am", "12pm"], wednesday: ["7pm"] },
  ARROWHEAD: { sunday: ["10am", "12pm"],        wednesday: ["7pm"] },
  RIVERSIDE: { sunday: ["10am", "12pm"],        wednesday: [] },
  POMONA:    { sunday: ["9am", "11am"],         wednesday: ["7pm"] },
  LA:        { sunday: ["8am", "9am"],          wednesday: ["7pm"] },
  ARIZONA:   { sunday: ["9am", "11am"],         wednesday: ["7pm"] },
};

// Ordered union of all campus Sunday times
const SUNDAY_SERVICES = ["8am", "9am", "10am", "11am", "12pm"];
const WEDNESDAY_SERVICES = ["7pm"];

// Which campuses hold each service slot
function campusesForSlot(service: string): string[] {
  if (service === "7pm") {
    return CAMPUSES.filter(c => CAMPUS_SERVICES[c]?.wednesday.includes(service));
  }
  return CAMPUSES.filter(c => CAMPUS_SERVICES[c]?.sunday.includes(service));
}

// Full check-in service name (as stored in DB from campus pages)
function checkInServiceName(slot: string): string {
  return slot === "7pm" ? "Wednesday 7pm" : `Sunday ${slot}`;
}

function getDayServices(date: Date, campus?: string | null): string[] | null {
  const dow = date.getDay();
  if (dow === 0) {
    if (campus) {
      const s = CAMPUS_SERVICES[campus]?.sunday ?? [];
      return s.length > 0 ? s : null;
    }
    return SUNDAY_SERVICES;
  }
  if (dow === 3) {
    if (campus) {
      const s = CAMPUS_SERVICES[campus]?.wednesday ?? [];
      return s.length > 0 ? s : null;
    }
    return WEDNESDAY_SERVICES;
  }
  return null;
}

function parseServiceHour(service: string): number {
  const m = service.match(/^(\d+)(am|pm)$/i);
  if (!m) return 999;
  let h = parseInt(m[1]);
  if (m[2].toLowerCase() === "pm" && h !== 12) h += 12;
  if (m[2].toLowerCase() === "am" && h === 12) h = 0;
  return h;
}

function pad2(n: number) { return String(n).padStart(2, "0"); }
function toDateStr(y: number, m: number, d: number) { return `${y}-${pad2(m + 1)}-${pad2(d)}`; }
function todayStr() {
  const t = new Date();
  return toDateStr(t.getFullYear(), t.getMonth(), t.getDate());
}

const GOLD = "hsl(38 60% 62%)";
const GOLD_DIM = "hsl(38 28% 42%)";
const GOLD_BRIGHT = "hsl(38 75% 72%)";
const BG = "hsl(35 20% 9%)";
const SURFACE = "hsl(35 20% 13%)";
const BORDER = "hsl(38 18% 20%)";

const INPUT_STYLE: React.CSSProperties = {
  background: "hsl(35 18% 11%)",
  border: "1px solid hsl(38 20% 24%)",
  color: GOLD_BRIGHT,
  fontFamily: "Georgia, serif",
  borderRadius: 5,
  padding: "8px 12px",
  width: "100%",
  fontSize: 14,
  outline: "none",
  textAlign: "center",
};

const LABEL_STYLE: React.CSSProperties = {
  color: GOLD_DIM,
  fontFamily: "Georgia, serif",
  fontSize: 10,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: 5,
  textAlign: "center",
};

type DayServiceKey = string;
type DayMap = Record<string, DailyAltarReport[]>;

function buildDayMap(reports: DailyAltarReport[]): DayMap {
  const map: DayMap = {};
  for (const r of reports) {
    const key = `${r.date}__${r.service}`;
    if (!map[key]) map[key] = [];
    map[key].push(r);
  }
  return map;
}

function buildDatesWithData(reports: DailyAltarReport[]): Set<string> {
  return new Set(reports.map(r => r.date));
}

// ── PDF export helpers ─────────────────────────────────────────────────────────
const PDF_BG = [28, 22, 14] as const;
const PDF_GOLD = [180, 140, 80] as const;
const PDF_GOLD_DIM = [120, 90, 50] as const;
const PDF_WHITE = [220, 205, 175] as const;
const PDF_ROW_ALT = [36, 28, 18] as const;
const PDF_HEADER_ROW = [45, 34, 20] as const;

function buildPDF(title: string, subtitle: string, rows: string[][], extraNote?: string): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(...PDF_BG);
  doc.rect(0, 0, W, doc.internal.pageSize.getHeight(), "F");
  doc.setDrawColor(...PDF_GOLD);
  doc.setLineWidth(0.8);
  doc.line(14, 18, W - 14, 18);
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...PDF_GOLD);
  doc.text(title, W / 2, 14, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...PDF_GOLD_DIM);
  doc.text(subtitle, W / 2, 24, { align: "center" });
  doc.setDrawColor(...PDF_GOLD_DIM);
  doc.setLineWidth(0.3);
  doc.line(14, 27, W - 14, 27);

  let y = 36;

  const cols = ["Date", "Service", "Campus", "Salvations", "Prayers", "Altar Members"];
  const colW = [28, 20, 30, 26, 22, 32];
  const startX = 14;
  const rowH = 8;

  doc.setFillColor(...PDF_HEADER_ROW);
  doc.rect(startX, y - 5.5, W - 28, rowH, "F");
  doc.setFont("times", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_GOLD);
  let x = startX + 2;
  cols.forEach((col, i) => { doc.text(col.toUpperCase(), x, y); x += colW[i]; });
  y += rowH;

  doc.setFont("times", "normal");
  doc.setFontSize(9);
  rows.forEach((row, ri) => {
    if (y > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      doc.setFillColor(...PDF_BG);
      doc.rect(0, 0, W, doc.internal.pageSize.getHeight(), "F");
      y = 20;
    }
    if (ri % 2 === 0) {
      doc.setFillColor(...PDF_ROW_ALT);
      doc.rect(startX, y - 5.5, W - 28, rowH, "F");
    }
    doc.setTextColor(...PDF_WHITE);
    x = startX + 2;
    row.forEach((cell, i) => { doc.text(String(cell), x, y); x += colW[i]; });
    y += rowH;
  });

  if (extraNote) {
    y += 1;
    doc.setFont("times", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_GOLD_DIM);
    doc.text("Notes:", startX + 2, y);
    doc.setTextColor(...PDF_WHITE);
    const noteLines = doc.splitTextToSize(extraNote, W - 28 - 18);
    doc.text(noteLines, startX + 18, y);
    y += Math.max(noteLines.length * 5, 6) + 2;
  }

  if (rows.length > 0) {
    const totSalv = rows.reduce((s, r) => s + (parseInt(r[3]) || 0), 0);
    const totPray = rows.reduce((s, r) => s + (parseInt(r[4]) || 0), 0);
    const totAltar = rows.reduce((s, r) => s + (parseInt(r[5]) || 0), 0);
    y += 2;
    doc.setDrawColor(...PDF_GOLD_DIM);
    doc.setLineWidth(0.3);
    doc.line(startX, y - 4, W - 14, y - 4);
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_GOLD);
    doc.text("TOTALS", startX + 2, y);
    x = startX + 2 + colW[0] + colW[1] + colW[2];
    doc.text(String(totSalv), x, y); x += colW[3];
    doc.text(String(totPray), x, y); x += colW[4];
    doc.text(String(totAltar), x, y);
    y += rowH;
  }

  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...PDF_GOLD_DIM);
  doc.setLineWidth(0.3);
  doc.line(14, pageH - 12, W - 14, pageH - 12);
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_GOLD_DIM);
  doc.text("Altar Report — Confidential", W / 2, pageH - 7, { align: "center" });

  return doc;
}

function exportMonthData(
  reports: DailyAltarReport[],
  month: number,
  year: number,
  notesMap: Record<string, string> = {},
  campus?: string | null,
) {
  const sorted = [...reports].sort((a, b) =>
    a.date.localeCompare(b.date) ||
    parseServiceHour(a.service) - parseServiceHour(b.service) ||
    a.campus.localeCompare(b.campus)
  );

  // Build date order and per-date service order
  const dateOrder = [...new Set(sorted.map(r => r.date))];
  const grouped: Record<string, Record<string, DailyAltarReport[]>> = {};
  for (const r of sorted) {
    if (!grouped[r.date]) grouped[r.date] = {};
    if (!grouped[r.date][r.service]) grouped[r.date][r.service] = [];
    grouped[r.date][r.service].push(r);
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const startX = 14;
  const rowH = 8;
  const cols = ["Date", "Service", "Campus", "Salvations", "Prayers", "Altar Members"];
  const colW = [28, 20, 30, 26, 22, 32];

  doc.setFillColor(...PDF_BG);
  doc.rect(0, 0, W, doc.internal.pageSize.getHeight(), "F");
  doc.setDrawColor(...PDF_GOLD);
  doc.setLineWidth(0.8);
  doc.line(14, 18, W - 14, 18);
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...PDF_GOLD);
  doc.text("Altar Report", W / 2, 14, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...PDF_GOLD_DIM);
  doc.text(`${MONTH_NAMES[month - 1]} ${year} — ${campus || "All Campuses"}`, W / 2, 24, { align: "center" });
  doc.setDrawColor(...PDF_GOLD_DIM);
  doc.setLineWidth(0.3);
  doc.line(14, 27, W - 14, 27);

  let y = 36;

  // Column headers
  doc.setFillColor(...PDF_HEADER_ROW);
  doc.rect(startX, y - 5.5, W - 28, rowH, "F");
  doc.setFont("times", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_GOLD);
  let x = startX + 2;
  cols.forEach((col, i) => { doc.text(col.toUpperCase(), x, y); x += colW[i]; });
  y += rowH;

  let totalSalv = 0, totalPray = 0, totalAltar = 0;
  let rowIndex = 0;

  for (const dateStr of dateOrder) {
    const svcOrder = Object.keys(grouped[dateStr])
      .sort((a, b) => parseServiceHour(a) - parseServiceHour(b));

    for (const svc of svcOrder) {
      for (const r of grouped[dateStr][svc]) {
        if (y > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          doc.setFillColor(...PDF_BG);
          doc.rect(0, 0, W, doc.internal.pageSize.getHeight(), "F");
          y = 20;
        }
        if (rowIndex % 2 === 0) {
          doc.setFillColor(...PDF_ROW_ALT);
          doc.rect(startX, y - 5.5, W - 28, rowH, "F");
        }
        doc.setFont("times", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...PDF_WHITE);
        x = startX + 2;
        [r.date, r.service, r.campus, String(r.salvations), String(r.prayers), String(r.altarMembers)]
          .forEach((cell, i) => { doc.text(cell, x, y); x += colW[i]; });
        totalSalv += r.salvations;
        totalPray += r.prayers;
        totalAltar += r.altarMembers;
        y += rowH;
        rowIndex++;
      }

      const note = notesMap[`${dateStr}__${svc}`];
      if (note?.trim()) {
        y += 1;
        doc.setFont("times", "italic");
        doc.setFontSize(9);
        doc.setTextColor(...PDF_GOLD_DIM);
        doc.text(`${svc} Notes:`, startX + 2, y);
        doc.setTextColor(...PDF_WHITE);
        const noteLines = doc.splitTextToSize(note, W - 28 - 22);
        doc.text(noteLines, startX + 22, y);
        y += Math.max(noteLines.length * 5, 6) + 3;
      }
    }
  }

  if (sorted.length > 0) {
    y += 2;
    doc.setDrawColor(...PDF_GOLD_DIM);
    doc.setLineWidth(0.3);
    doc.line(startX, y - 4, W - 14, y - 4);
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_GOLD);
    doc.text("TOTALS", startX + 2, y);
    x = startX + 2 + colW[0] + colW[1] + colW[2];
    doc.text(String(totalSalv), x, y); x += colW[3];
    doc.text(String(totalPray), x, y); x += colW[4];
    doc.text(String(totalAltar), x, y);
  }

  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...PDF_GOLD_DIM);
  doc.setLineWidth(0.3);
  doc.line(14, pageH - 12, W - 14, pageH - 12);
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_GOLD_DIM);
  doc.text("Altar Report — Confidential", W / 2, pageH - 7, { align: "center" });

  doc.save(`altar-report-${year}-${pad2(month)}.pdf`);
}

function exportDayData(reports: DailyAltarReport[], dateStr: string, notesMap: Record<string, string> = {}, campus?: string | null) {
  const dayReports = [...reports].filter(r => r.date === dateStr);
  const date = new Date(dateStr + "T12:00:00");
  const label = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) + (campus ? ` — ${campus}` : "");

  // Group and sort by service time (chronological), then campus
  const serviceOrder = [...new Set(dayReports.map(r => r.service))]
    .sort((a, b) => parseServiceHour(a) - parseServiceHour(b));
  const grouped: Record<string, DailyAltarReport[]> = {};
  for (const r of dayReports) {
    if (!grouped[r.service]) grouped[r.service] = [];
    grouped[r.service].push(r);
  }
  for (const svc of serviceOrder) {
    grouped[svc].sort((a, b) => a.campus.localeCompare(b.campus));
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const startX = 14;
  const rowH = 8;
  const cols = ["Date", "Service", "Campus", "Salvations", "Prayers", "Altar Members"];
  const colW = [28, 20, 30, 26, 22, 32];

  // Page background + header
  doc.setFillColor(...PDF_BG);
  doc.rect(0, 0, W, doc.internal.pageSize.getHeight(), "F");
  doc.setDrawColor(...PDF_GOLD);
  doc.setLineWidth(0.8);
  doc.line(14, 18, W - 14, 18);
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...PDF_GOLD);
  doc.text("Altar Report", W / 2, 14, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...PDF_GOLD_DIM);
  doc.text(label, W / 2, 24, { align: "center" });
  doc.setDrawColor(...PDF_GOLD_DIM);
  doc.setLineWidth(0.3);
  doc.line(14, 27, W - 14, 27);

  let y = 36;

  // Column header row
  doc.setFillColor(...PDF_HEADER_ROW);
  doc.rect(startX, y - 5.5, W - 28, rowH, "F");
  doc.setFont("times", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_GOLD);
  let x = startX + 2;
  cols.forEach((col, i) => { doc.text(col.toUpperCase(), x, y); x += colW[i]; });
  y += rowH;

  let totalSalv = 0, totalPray = 0, totalAltar = 0;
  let rowIndex = 0;

  for (const svc of serviceOrder) {
    const svcReports = grouped[svc];

    for (const r of svcReports) {
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        doc.setFillColor(...PDF_BG);
        doc.rect(0, 0, W, doc.internal.pageSize.getHeight(), "F");
        y = 20;
      }
      if (rowIndex % 2 === 0) {
        doc.setFillColor(...PDF_ROW_ALT);
        doc.rect(startX, y - 5.5, W - 28, rowH, "F");
      }
      doc.setFont("times", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...PDF_WHITE);
      x = startX + 2;
      [r.date, r.service, r.campus, String(r.salvations), String(r.prayers), String(r.altarMembers)]
        .forEach((cell, i) => { doc.text(cell, x, y); x += colW[i]; });
      totalSalv += r.salvations;
      totalPray += r.prayers;
      totalAltar += r.altarMembers;
      y += rowH;
      rowIndex++;
    }

    // Notes directly under this service's rows
    const note = notesMap[svc];
    if (note?.trim()) {
      y += 1;
      doc.setFont("times", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...PDF_GOLD_DIM);
      doc.text(`${svc} Notes:`, startX + 2, y);
      doc.setTextColor(...PDF_WHITE);
      const noteLines = doc.splitTextToSize(note, W - 28 - 22);
      doc.text(noteLines, startX + 22, y);
      y += Math.max(noteLines.length * 5, 6) + 3;
    }
  }

  // Totals
  if (dayReports.length > 0) {
    y += 2;
    doc.setDrawColor(...PDF_GOLD_DIM);
    doc.setLineWidth(0.3);
    doc.line(startX, y - 4, W - 14, y - 4);
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_GOLD);
    doc.text("TOTALS", startX + 2, y);
    x = startX + 2 + colW[0] + colW[1] + colW[2];
    doc.text(String(totalSalv), x, y); x += colW[3];
    doc.text(String(totalPray), x, y); x += colW[4];
    doc.text(String(totalAltar), x, y);
  }

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...PDF_GOLD_DIM);
  doc.setLineWidth(0.3);
  doc.line(14, pageH - 12, W - 14, pageH - 12);
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_GOLD_DIM);
  doc.text("Altar Report — Confidential", W / 2, pageH - 7, { align: "center" });

  doc.save(`altar-report-${dateStr}.pdf`);
}

function exportServiceData(reports: DailyAltarReport[], dateStr: string, service: string, notes: string, campus?: string | null) {
  const sorted = [...reports].filter(r => r.date === dateStr && r.service === service)
    .sort((a, b) => a.campus.localeCompare(b.campus));
  const rows = sorted.map(r => [r.date, r.service, r.campus, String(r.salvations), String(r.prayers), String(r.altarMembers)]);
  const date = new Date(dateStr + "T12:00:00");
  const label = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const subtitle = campus ? `${label} — ${service} — ${campus}` : `${label} — ${service}`;
  buildPDF("Altar Report", subtitle, rows, notes || undefined).save(`altar-report-${dateStr}-${service}.pdf`);
}

// ── Stat input row ─────────────────────────────────────────────────────────────
function StatFields({
  salvations, prayers, altarMembers,
  onChange,
}: {
  salvations: string; prayers: string; altarMembers: string;
  onChange: (field: "salvations" | "prayers" | "altarMembers", val: string) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
      <div>
        <label style={LABEL_STYLE}>Salvations</label>
        <input type="number" min="0" value={salvations} onChange={e => onChange("salvations", e.target.value)} onFocus={e => e.target.select()} style={INPUT_STYLE} />
      </div>
      <div>
        <label style={LABEL_STYLE}>Prayers</label>
        <input type="number" min="0" value={prayers} onChange={e => onChange("prayers", e.target.value)} onFocus={e => e.target.select()} style={INPUT_STYLE} />
      </div>
      <div>
        <label style={LABEL_STYLE}>Altar Members</label>
        <input type="number" min="0" value={altarMembers} onChange={e => onChange("altarMembers", e.target.value)} onFocus={e => e.target.select()} style={INPUT_STYLE} />
      </div>
    </div>
  );
}

// ── Day Entry Card (view + inline edit) ───────────────────────────────────────
function DayEntry({
  report, onDelete, onSave,
}: {
  report: DailyAltarReport;
  onDelete: (id: number) => void;
  onSave: (id: number, data: { salvations: number; prayers: number; altarMembers: number }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [salvations, setSalvations] = useState(String(report.salvations));
  const [prayers, setPrayers] = useState(String(report.prayers));
  const [altarMembers, setAltarMembers] = useState(String(report.altarMembers));

  useEffect(() => {
    setSalvations(String(report.salvations));
    setPrayers(String(report.prayers));
    setAltarMembers(String(report.altarMembers));
  }, [report.salvations, report.prayers, report.altarMembers]);

  const handleSave = () => {
    onSave(report.id, { salvations: parseInt(salvations) || 0, prayers: parseInt(prayers) || 0, altarMembers: parseInt(altarMembers) || 0 });
    setEditing(false);
  };

  const statColors = [
    { label: "Salvations", value: report.salvations, color: "hsl(130 55% 52%)" },
    { label: "Prayers", value: report.prayers, color: "hsl(200 60% 62%)" },
    { label: "Altar Members", value: report.altarMembers, color: GOLD },
  ];

  return (
    <div style={{ background: "hsl(35 18% 16%)", border: `1px solid ${editing ? "hsl(38 28% 28%)" : BORDER}`, borderRadius: 8, overflow: "hidden", transition: "border-color 0.2s" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px" }}>
        <span style={{ color: GOLD, fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.15em" }}>{report.campus}</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setEditing(e => !e)} style={{ color: editing ? GOLD_BRIGHT : GOLD_DIM, background: editing ? "hsl(38 35% 20%)" : "none", border: `1px solid ${editing ? "hsl(38 35% 28%)" : BORDER}`, borderRadius: 4, padding: "3px 10px", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.12em", transition: "all 0.15s" }}>
            {editing ? "Close" : "✏️"}
          </button>
          <button onClick={() => { if (confirm("Remove this entry?")) onDelete(report.id); }} style={{ color: "hsl(0 50% 50%)", background: "none", border: "none", cursor: "pointer", fontSize: 15, opacity: 0.4, transition: "opacity 0.2s" }} onMouseOver={e => (e.currentTarget.style.opacity = "1")} onMouseOut={e => (e.currentTarget.style.opacity = "0.4")}>✕</button>
        </div>
      </div>
      {!editing && (
        <div style={{ padding: "0 14px 12px" }}>
          <div style={{ display: "flex", gap: 20 }}>
            {statColors.map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ color: s.color, fontFamily: "Georgia, serif", fontSize: 20, fontWeight: "bold", lineHeight: 1 }}>{s.value}</div>
                <div style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {editing && (
        <div style={{ padding: "0 14px 14px" }}>
          <StatFields salvations={salvations} prayers={prayers} altarMembers={altarMembers} onChange={(field, val) => { if (field === "salvations") setSalvations(val); else if (field === "prayers") setPrayers(val); else setAltarMembers(val); }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={handleSave} style={{ flex: 1, background: "hsl(38 50% 28%)", color: GOLD_BRIGHT, border: "1px solid hsl(38 38% 35%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", padding: "8px 0", borderRadius: 5, cursor: "pointer" }}>Save Changes</button>
            <button onClick={() => setEditing(false)} style={{ background: "none", color: GOLD_DIM, border: `1px solid ${BORDER}`, fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", padding: "8px 14px", borderRadius: 5, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add Entry Form — auto-populates altar members from check-ins or active roster ─
function AddEntryForm({
  existingCampuses, service, dateStr, activeCampus,
  onSave, onCancel,
}: {
  existingCampuses: string[];
  service: string;
  dateStr: string;
  activeCampus: string | null;
  onSave: (data: { campus: string; salvations: number; prayers: number; altarMembers: number }) => void;
  onCancel: () => void;
}) {
  const slotCampuses = campusesForSlot(service);
  const available = slotCampuses.filter(c => !existingCampuses.includes(c));
  // If a campus is active (locked), use it; otherwise fall back to dropdown
  const lockedCampus = activeCampus ?? null;
  const [campus, setCampus] = useState(lockedCampus ?? available[0] ?? "");
  const [salvations, setSalvations] = useState("0");
  const [prayers, setPrayers] = useState("0");
  const [altarMembers, setAltarMembers] = useState("0");
  const [altarSource, setAltarSource] = useState<"checkins" | null>(null);

  // Auto-fill altar members from check-ins
  const fullServiceName = checkInServiceName(service);
  useEffect(() => {
    if (!campus) return;
    setAltarSource(null);
    fetch(`/api/check-ins?campus=${encodeURIComponent(campus)}&service=${encodeURIComponent(fullServiceName)}&serviceDate=${encodeURIComponent(dateStr)}`)
      .then(r => r.json())
      .then(data => {
        const count = data?.checkIns?.length ?? 0;
        setAltarMembers(String(count));
        setAltarSource(count > 0 ? "checkins" : null);
      })
      .catch(() => {});
  }, [campus, fullServiceName, dateStr]);

  if (!lockedCampus && available.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "14px 0", opacity: 0.4 }}>
        <p style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 12 }}>All campuses have entries for this service</p>
        <button onClick={onCancel} style={{ marginTop: 6, color: GOLD_DIM, background: "none", border: "none", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase" }}>Close</button>
      </div>
    );
  }

  return (
    <div style={{ background: "hsl(35 18% 15%)", border: `1px solid hsl(38 25% 26%)`, borderRadius: 8, padding: "14px" }}>
      {altarSource === "checkins" && (
        <div style={{ marginBottom: 10, padding: "5px 10px", background: "hsl(38 30% 14%)", border: `1px solid hsl(38 28% 22%)`, borderRadius: 5 }}>
          <span style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.12em" }}>
            Altar members pre-filled from service check-ins — edit as needed
          </span>
        </div>
      )}

      {/* Campus — locked label when active, dropdown otherwise */}
      <div style={{ marginBottom: 12 }}>
        <label style={LABEL_STYLE}>Campus</label>
        {lockedCampus ? (
          <div style={{ ...INPUT_STYLE, display: "flex", alignItems: "center", opacity: 0.75, cursor: "default", userSelect: "none" }}>
            {lockedCampus}
          </div>
        ) : (
          <select value={campus} onChange={e => setCampus(e.target.value)} style={{ ...INPUT_STYLE, textAlign: "left" }}>
            {available.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      <StatFields salvations={salvations} prayers={prayers} altarMembers={altarMembers} onChange={(field, val) => { if (field === "salvations") setSalvations(val); else if (field === "prayers") setPrayers(val); else setAltarMembers(val); }} />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={() => onSave({ campus, salvations: parseInt(salvations) || 0, prayers: parseInt(prayers) || 0, altarMembers: parseInt(altarMembers) || 0 })} style={{ flex: 1, background: "hsl(38 50% 28%)", color: GOLD_BRIGHT, border: "1px solid hsl(38 38% 35%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", padding: "9px 0", borderRadius: 5, cursor: "pointer" }}>Save Entry</button>
        <button onClick={onCancel} style={{ background: "none", color: GOLD_DIM, border: `1px solid ${BORDER}`, fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", padding: "9px 14px", borderRadius: 5, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Sticky Note Icon ───────────────────────────────────────────────────────────
function StickyNoteIcon({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <rect x="1" y="1" width="11" height="14" rx="1.5" fill="#f5d020" />
      <path d="M12 10 L12 15 L7 10 Z" fill="#d4a800" />
      <rect x="3" y="4" width="7" height="1.2" rx="0.6" fill="#b8920a" opacity="0.7" />
      <rect x="3" y="6.5" width="5.5" height="1.2" rx="0.6" fill="#b8920a" opacity="0.7" />
      <rect x="3" y="9" width="4" height="1.2" rx="0.6" fill="#b8920a" opacity="0.7" />
    </svg>
  );
}

// ── Service Notes Panel ────────────────────────────────────────────────────────
function ServiceNotesPanel({
  dateStr, service, onClose,
}: {
  dateStr: string;
  service: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const notesKey = ["service-notes", dateStr, service];
  const { data } = useQuery({
    ...getGetServiceNotesQueryOptions({ date: dateStr, service }),
    queryKey: notesKey,
  });
  const saveMut = useSaveServiceNotes();
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (data?.notes !== undefined) setText(data.notes);
  }, [data?.notes]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSave = () => {
    saveMut.mutate(
      { data: { date: dateStr, service, notes: text } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: notesKey });
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        },
      }
    );
  };

  return (
    <div style={{ background: "hsl(35 18% 14%)", border: `1px solid hsl(38 28% 26%)`, borderRadius: 8, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ color: GOLD, fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase" }}>Service Notes — {service}</span>
        <button onClick={onClose} style={{ color: GOLD_DIM, background: "none", border: "none", cursor: "pointer", fontSize: 14, opacity: 0.5 }}>✕</button>
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Add notes for this service..."
        rows={4}
        style={{
          width: "100%", background: "hsl(35 18% 10%)", border: `1px solid hsl(38 20% 22%)`,
          color: GOLD_BRIGHT, fontFamily: "Georgia, serif", fontSize: 13, borderRadius: 5,
          padding: "8px 10px", outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.5,
        }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          onClick={handleSave}
          style={{ flex: 1, background: saved ? "hsl(130 40% 22%)" : "hsl(38 50% 28%)", color: saved ? "hsl(130 60% 72%)" : GOLD_BRIGHT, border: `1px solid ${saved ? "hsl(130 40% 30%)" : "hsl(38 38% 35%)"}`, fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", padding: "8px 0", borderRadius: 5, cursor: "pointer", transition: "all 0.2s" }}
        >
          {saved ? "✓ Saved" : "Save Notes"}
        </button>
        <button onClick={onClose} style={{ background: "none", color: GOLD_DIM, border: `1px solid ${BORDER}`, fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", padding: "8px 12px", borderRadius: 5, cursor: "pointer" }}>Close</button>
      </div>
    </div>
  );
}

// ── Single Service Section ─────────────────────────────────────────────────────
function ServiceSection({
  service, dateStr, dayMap, allReports, activeCampus,
  onSave, onEdit, onDelete,
}: {
  service: string;
  dateStr: string;
  dayMap: DayMap;
  allReports: DailyAltarReport[];
  activeCampus: string | null;
  onSave: (service: string, data: { campus: string; salvations: number; prayers: number; altarMembers: number }) => void;
  onEdit: (id: number, service: string, data: { salvations: number; prayers: number; altarMembers: number }) => void;
  onDelete: (id: number) => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const notesQueryKey = ["service-notes", dateStr, service];
  const { data: notesData } = useQuery({
    ...getGetServiceNotesQueryOptions({ date: dateStr, service }),
    queryKey: notesQueryKey,
  });
  const savedNotes = notesData?.notes ?? "";

  const key: DayServiceKey = `${dateStr}__${service}`;
  const serviceReports = dayMap[key] ?? [];
  const existingCampuses = serviceReports.map(r => r.campus);
  const hasServiceData = serviceReports.length > 0;

  // When a campus is locked, the add button is only available if that campus hasn't entered yet
  const canAdd = activeCampus
    ? !existingCampuses.includes(activeCampus)
    : existingCampuses.length < campusesForSlot(service).length;

  // Single fetch for all Dbanc data for this service/date (all campuses)
  type DbancSummary = { salvations: number; recommitments: number; cameForPrayer: number; totalPrayers: number; byCampus: Record<string, { salvations: number; recommitments: number; cameForPrayer: number; totalPrayers: number }> };
  const { data: dbancData } = useQuery<DbancSummary>({
    queryKey: ["dbanc-prayer-summary", service, dateStr],
    queryFn: () =>
      fetch(`/api/dbanc/contacts/prayer-summary?service=${encodeURIComponent(service)}&date=${encodeURIComponent(dateStr)}`)
        .then(r => r.json()),
    staleTime: 60000,
  });

  const dbancByCampus = dbancData?.byCampus ?? {};
  const dbancHasData = (dbancData?.totalPrayers ?? 0) > 0;

  const manualTotals = serviceReports.reduce(
    (a, r) => ({ salvations: a.salvations + r.salvations, prayers: a.prayers + r.prayers, altarMembers: a.altarMembers + r.altarMembers }),
    { salvations: 0, prayers: 0, altarMembers: 0 }
  );

  const totals = {
    salvations: manualTotals.salvations + (dbancData?.salvations ?? 0),
    prayers: manualTotals.prayers + (dbancData?.totalPrayers ?? 0),
    altarMembers: manualTotals.altarMembers,
  };

  return (
    <div style={{ marginBottom: 8 }}>
      {/* Service time header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${BORDER}` }}>
        {/* Time badge */}
        <div style={{ background: "hsl(38 45% 22%)", border: "1px solid hsl(38 42% 32%)", borderRadius: 6, padding: "5px 14px", color: GOLD_BRIGHT, fontFamily: "Georgia, serif", fontSize: 14, letterSpacing: "0.12em", fontWeight: "bold", flexShrink: 0 }}>
          {service}
        </div>

        {/* Inline totals — shown whenever any data exists */}
        {(hasServiceData || dbancHasData) && (
          <div style={{ display: "flex", gap: 12, flex: 1 }}>
            <span style={{ color: "hsl(130 55% 52%)", fontFamily: "Georgia, serif", fontSize: 12, fontWeight: "bold" }}>{totals.salvations}<span style={{ color: GOLD_DIM, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginLeft: 3 }}>Salv</span></span>
            <span style={{ color: "hsl(200 60% 62%)", fontFamily: "Georgia, serif", fontSize: 12, fontWeight: "bold" }}>{totals.prayers}<span style={{ color: GOLD_DIM, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginLeft: 3 }}>Prayer</span></span>
            {hasServiceData && <span style={{ color: GOLD, fontFamily: "Georgia, serif", fontSize: 12, fontWeight: "bold" }}>{totals.altarMembers}<span style={{ color: GOLD_DIM, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginLeft: 3 }}>Altar</span></span>}
          </div>
        )}

        {/* Notes + Export buttons */}
        <div style={{ display: "flex", gap: 5, marginLeft: "auto", flexShrink: 0 }}>
          <button
            onClick={() => setShowNotes(n => !n)}
            title="Service notes"
            style={{ background: showNotes ? "hsl(38 35% 20%)" : "hsl(35 18% 12%)", border: `1px solid ${showNotes ? "hsl(38 40% 30%)" : BORDER}`, borderRadius: 5, padding: "4px 8px", cursor: "pointer", lineHeight: 1, display: "flex", alignItems: "center", transition: "all 0.15s", opacity: showNotes ? 1 : 0.75 }}
          ><StickyNoteIcon size={15} /></button>
          {hasServiceData && (
            <button
              onClick={() => exportServiceData(allReports, dateStr, service, savedNotes, activeCampus)}
              title="Export this service as PDF"
              style={{ color: GOLD_DIM, background: "hsl(38 30% 14%)", border: `1px solid hsl(38 25% 22%)`, borderRadius: 5, padding: "4px 8px", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", transition: "all 0.15s", whiteSpace: "nowrap" }}
              onMouseOver={e => { e.currentTarget.style.color = GOLD; }}
              onMouseOut={e => { e.currentTarget.style.color = GOLD_DIM; }}
            >
              ↓ PDF
            </button>
          )}
        </div>
      </div>

      {/* Notes editor panel */}
      {showNotes && (
        <ServiceNotesPanel dateStr={dateStr} service={service} onClose={() => setShowNotes(false)} />
      )}

      {/* Campus entries */}
      {serviceReports.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          {serviceReports.map(r => (
            <DayEntry
              key={r.id}
              report={r}
              onDelete={onDelete}
              onSave={(id, data) => onEdit(id, service, data)}
            />
          ))}
        </div>
      )}

      {/* Saved notes read-only preview — sits below entries, inside the service block */}
      {savedNotes && !showNotes && (
        <div
          onClick={() => setShowNotes(true)}
          title="Click to edit notes"
          style={{
            background: "hsl(35 18% 13%)",
            border: `1px solid hsl(38 22% 22%)`,
            borderRadius: 6,
            padding: "8px 12px",
            marginBottom: 8,
            cursor: "pointer",
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <StickyNoteIcon size={15} style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{
            color: GOLD_DIM,
            fontFamily: "Georgia, serif",
            fontSize: 12,
            lineHeight: 1.5,
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>
            {savedNotes}
          </p>
        </div>
      )}

      {/* Add campus entry */}
      {showAddForm ? (
        <AddEntryForm
          existingCampuses={existingCampuses}
          service={service}
          dateStr={dateStr}
          activeCampus={activeCampus}
          onSave={(data) => { onSave(service, data); setShowAddForm(false); }}
          onCancel={() => setShowAddForm(false)}
        />
      ) : canAdd ? (
        <button
          onClick={() => setShowAddForm(true)}
          style={{ width: "100%", background: SURFACE, color: GOLD_DIM, border: `1px dashed hsl(38 22% 26%)`, fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", padding: "9px 0", borderRadius: 6, cursor: "pointer", transition: "all 0.2s" }}
          onMouseOver={e => { e.currentTarget.style.color = GOLD; e.currentTarget.style.borderColor = "hsl(38 35% 36%)"; }}
          onMouseOut={e => { e.currentTarget.style.color = GOLD_DIM; e.currentTarget.style.borderColor = "hsl(38 22% 26%)"; }}
        >
          + Add Entry
        </button>
      ) : (
        <div style={{ textAlign: "center", padding: "6px 0", opacity: 0.35 }}>
          <span style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.12em" }}>
            {activeCampus ? "Entry recorded" : "All campuses entered"}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Day Detail Panel ───────────────────────────────────────────────────────────
function DayDetail({
  dateStr, dayServices, dayMap, allReports, activeCampus,
  onClose, onSave, onEdit, onDelete,
}: {
  dateStr: string;
  dayServices: string[];
  dayMap: DayMap;
  allReports: DailyAltarReport[];
  activeCampus: string | null;
  onClose: () => void;
  onSave: (service: string, data: { campus: string; salvations: number; prayers: number; altarMembers: number }) => void;
  onEdit: (id: number, service: string, data: { salvations: number; prayers: number; altarMembers: number }) => void;
  onDelete: (id: number) => void;
}) {
  const date = new Date(dateStr + "T12:00:00");
  const dayLabel = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const isWednesday = date.getDay() === 3;
  const dayReports = allReports.filter(r => r.date === dateStr);
  const hasDayData = dayReports.length > 0;

  const notesResults = useQueries({
    queries: dayServices.map(service => ({
      ...getGetServiceNotesQueryOptions({ date: dateStr, service }),
      queryKey: ["service-notes", dateStr, service],
    })),
  });
  const notesMap: Record<string, string> = {};
  dayServices.forEach((service, i) => {
    const n = notesResults[i]?.data?.notes;
    if (n) notesMap[service] = n;
  });

  // Day-level totals: manual entries + Dbanc (React Query deduplicates fetches shared with ServiceSection)
  const dbancDayResults = useQueries({
    queries: dayServices.map(service => ({
      queryKey: ["dbanc-prayer-summary", service, dateStr],
      queryFn: () =>
        fetch(`/api/dbanc/contacts/prayer-summary?service=${encodeURIComponent(service)}&date=${encodeURIComponent(dateStr)}`)
          .then(r => r.json()) as Promise<{ salvations: number; totalPrayers: number }>,
      staleTime: 60000,
    })),
  });

  const manualDayTotals = dayReports.reduce(
    (a, r) => ({ salvations: a.salvations + r.salvations, prayers: a.prayers + r.prayers, altarMembers: a.altarMembers + r.altarMembers }),
    { salvations: 0, prayers: 0, altarMembers: 0 }
  );
  const dbancDayTotals = dbancDayResults.reduce(
    (a, q) => ({ salvations: a.salvations + (q.data?.salvations ?? 0), prayers: a.prayers + (q.data?.totalPrayers ?? 0) }),
    { salvations: 0, prayers: 0 }
  );
  const dayTotals = {
    salvations: manualDayTotals.salvations + dbancDayTotals.salvations,
    prayers: manualDayTotals.prayers + dbancDayTotals.prayers,
    altarMembers: manualDayTotals.altarMembers,
  };
  const hasDayTotals = dayTotals.salvations > 0 || dayTotals.prayers > 0 || dayTotals.altarMembers > 0;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "hsl(30 18% 5% / 0.75)", backdropFilter: "blur(2px)" }} />
      <div
        style={{ position: "relative", background: "hsl(35 22% 11%)", borderRadius: "16px 16px 0 0", border: `1px solid hsl(38 22% 22%)`, borderBottom: "none", maxHeight: "88vh", overflowY: "auto", paddingBottom: 40 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 2 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "hsl(38 18% 28%)" }} />
        </div>
        <div style={{ padding: "10px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <h2 style={{ color: GOLD_BRIGHT, fontFamily: "Georgia, serif", fontSize: 17, letterSpacing: "0.06em", margin: 0 }}>{dayLabel}</h2>
              <div style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 11, marginTop: 3, letterSpacing: "0.1em" }}>
                {isWednesday ? "Wednesday Evening Service" : "Sunday Services"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {hasDayData && (
                <button
                  onClick={() => exportDayData(allReports, dateStr, notesMap, activeCampus)}
                  style={{ color: GOLD_DIM, background: "hsl(38 30% 16%)", border: `1px solid hsl(38 28% 26%)`, borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", whiteSpace: "nowrap" }}
                  title="Export this day as PDF"
                >
                  ↓ Export Day
                </button>
              )}
              <button onClick={onClose} style={{ color: GOLD_DIM, background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 18, lineHeight: 1, opacity: 0.6 }}>✕</button>
            </div>
          </div>

          {/* Day total summary row */}
          {hasDayTotals && (
            <div style={{ display: "flex", gap: 24, alignItems: "center", padding: "10px 16px", marginBottom: 14, background: "hsl(38 30% 13%)", border: `1px solid hsl(38 28% 22%)`, borderRadius: 8 }}>
              <span style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", marginRight: 4 }}>Day Total</span>
              <span style={{ color: "hsl(130 55% 52%)", fontFamily: "Georgia, serif", fontSize: 18, fontWeight: "bold", lineHeight: 1 }}>{dayTotals.salvations}<span style={{ color: GOLD_DIM, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginLeft: 4 }}>Salv</span></span>
              <span style={{ color: "hsl(200 60% 62%)", fontFamily: "Georgia, serif", fontSize: 18, fontWeight: "bold", lineHeight: 1 }}>{dayTotals.prayers}<span style={{ color: GOLD_DIM, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginLeft: 4 }}>Prayer</span></span>
              {dayTotals.altarMembers > 0 && <span style={{ color: GOLD, fontFamily: "Georgia, serif", fontSize: 18, fontWeight: "bold", lineHeight: 1 }}>{dayTotals.altarMembers}<span style={{ color: GOLD_DIM, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginLeft: 4 }}>Altar</span></span>}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {dayServices.map(service => (
              <ServiceSection
                key={service}
                service={service}
                dateStr={dateStr}
                dayMap={dayMap}
                allReports={allReports}
                activeCampus={activeCampus}
                onSave={onSave}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AltarReportPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Read campus from session (campus leads are scoped to their campus)
  const sessionCampus = getValidCampusSession()?.campus ?? null;

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // Admin campus filter (only used when no sessionCampus)
  const [adminCampus, setAdminCampus] = useState<string>("");

  // The effective campus driving the calendar view
  const activeCampus = sessionCampus ?? (adminCampus || null);

  const queryKey = ["daily-altar-reports", viewYear, viewMonth + 1];

  const { data, isLoading } = useListDailyAltarReports(
    { month: viewMonth + 1, year: viewYear },
    { query: { queryKey } }
  );

  const upsert = useUpsertDailyAltarReport();
  const deleteMut = useDeleteDailyAltarReport();

  const reports = data?.reports ?? [];
  // When a campus is selected, filter reports for totals/dots; keep full map for day detail
  const filteredReports = activeCampus ? reports.filter(r => r.campus === activeCampus) : reports;

  // Fetch notes for every unique date+service in the current month for the export
  const uniqueDateServices = [...new Set(reports.map(r => `${r.date}__${r.service}`))];
  const monthNotesResults = useQueries({
    queries: uniqueDateServices.map(key => {
      const [date, service] = key.split("__");
      return {
        ...getGetServiceNotesQueryOptions({ date, service }),
        queryKey: ["service-notes", date, service],
      };
    }),
  });
  const monthNotesMap: Record<string, string> = {};
  uniqueDateServices.forEach((key, i) => {
    const n = monthNotesResults[i]?.data?.notes;
    if (n) monthNotesMap[key] = n;
  });
  const dayMap = buildDayMap(reports);
  const datesWithData = buildDatesWithData(filteredReports);

  const goMonth = useCallback((delta: number) => {
    setSelectedDate(null);
    setViewMonth(prev => {
      const next = prev + delta;
      if (next < 0) { setViewYear(y => y - 1); return 11; }
      if (next > 11) { setViewYear(y => y + 1); return 0; }
      return next;
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goMonth(-1);
      if (e.key === "ArrowRight") goMonth(1);
      if (e.key === "Escape") setSelectedDate(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goMonth]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const currentTodayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const handleSave = (service: string, entryData: { campus: string; salvations: number; prayers: number; altarMembers: number }) => {
    if (!selectedDate) return;
    upsert.mutate({ data: { date: selectedDate, service, ...entryData } }, { onSuccess: invalidate });
  };

  const handleEdit = (id: number, service: string, entryData: { salvations: number; prayers: number; altarMembers: number }) => {
    if (!selectedDate) return;
    const report = reports.find(r => r.id === id);
    if (!report) return;
    upsert.mutate({ data: { date: selectedDate, service, campus: report.campus, ...entryData } }, { onSuccess: invalidate });
  };

  const handleDelete = (id: number) => {
    deleteMut.mutate({ id }, { onSuccess: invalidate });
  };

  const monthTotals = filteredReports.reduce(
    (a, r) => ({ salvations: a.salvations + r.salvations, prayers: a.prayers + r.prayers, altarMembers: a.altarMembers + r.altarMembers }),
    { salvations: 0, prayers: 0, altarMembers: 0 }
  );

  const selectedDayDate = selectedDate ? new Date(selectedDate + "T12:00:00") : null;
  const selectedDayServices = selectedDayDate ? getDayServices(selectedDayDate, activeCampus) : null;

  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 80% 60% at 50% 10%, hsl(38 30% 12% / 0.5) 0%, transparent 70%)" }} />

      <div style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", flexDirection: "column", maxWidth: 700, width: "100%", margin: "0 auto", padding: "16px 16px 24px" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: !sessionCampus ? 12 : 18 }}>
          <button onClick={() => navigate("/admin")} style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", opacity: 0.5 }}>← Admin</button>
          <h1 style={{ color: GOLD, fontFamily: "Georgia, serif", fontSize: 14, letterSpacing: "0.3em", textTransform: "uppercase", margin: 0 }}>Altar Report</h1>
          <div style={{ width: 60 }} />
        </div>

        {/* Campus dropdown — admin only */}
        {!sessionCampus && (
          <div style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Campus</label>
            <select
              value={adminCampus}
              onChange={e => { setAdminCampus(e.target.value); setSelectedDate(null); }}
              style={{
                flex: 1, background: "hsl(35 20% 13%)", border: `1px solid ${BORDER}`,
                color: adminCampus ? GOLD_BRIGHT : GOLD_DIM,
                fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.12em",
                borderRadius: 6, padding: "7px 12px", outline: "none", cursor: "pointer",
                appearance: "none", WebkitAppearance: "none",
              }}
            >
              <option value="">All Campuses</option>
              {CAMPUSES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {adminCampus && (
              <button
                onClick={() => { setAdminCampus(""); setSelectedDate(null); }}
                style={{ color: GOLD_DIM, background: "none", border: `1px solid ${BORDER}`, borderRadius: 5, padding: "5px 10px", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.1em", whiteSpace: "nowrap" }}
              >
                All
              </button>
            )}
          </div>
        )}

        {/* Month totals */}
        {reports.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 16, padding: "10px 0", borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
            {[
              { label: "Salvations", value: monthTotals.salvations, color: "hsl(130 55% 52%)" },
              { label: "Prayers", value: monthTotals.prayers, color: "hsl(200 60% 62%)" },
              { label: "Altar Members", value: monthTotals.altarMembers, color: GOLD },
            ].map((s, i, arr) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 28 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: s.color, fontFamily: "Georgia, serif", fontSize: 22, fontWeight: "bold", lineHeight: 1 }}>{s.value}</div>
                  <div style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 3 }}>{s.label}</div>
                </div>
                {i < arr.length - 1 && <div style={{ width: 1, height: 28, background: BORDER }} />}
              </div>
            ))}
          </div>
        )}

        {/* Month nav with export */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "0 4px" }}>
          <button onClick={() => goMonth(-1)} style={{ color: GOLD_DIM, background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, width: 36, height: 36, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseOver={e => { e.currentTarget.style.color = GOLD; }} onMouseOut={e => { e.currentTarget.style.color = GOLD_DIM; }}>‹</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ textAlign: "center" }}>
              <span style={{ color: GOLD_BRIGHT, fontFamily: "Georgia, serif", fontSize: 18, letterSpacing: "0.1em" }}>{MONTH_NAMES[viewMonth]}</span>
              <span style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 14, marginLeft: 8 }}>{viewYear}</span>
            </div>
            {reports.length > 0 && (
              <button onClick={() => exportMonthData(reports, viewMonth + 1, viewYear, monthNotesMap, activeCampus)} style={{ color: GOLD_DIM, background: "hsl(38 30% 14%)", border: `1px solid hsl(38 25% 24%)`, borderRadius: 5, padding: "4px 9px", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", whiteSpace: "nowrap", transition: "all 0.15s" }} onMouseOver={e => { e.currentTarget.style.color = GOLD; }} onMouseOut={e => { e.currentTarget.style.color = GOLD_DIM; }} title="Export this month as PDF">↓ Export</button>
            )}
          </div>
          <button onClick={() => goMonth(1)} style={{ color: GOLD_DIM, background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, width: 36, height: 36, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseOver={e => { e.currentTarget.style.color = GOLD; }} onMouseOut={e => { e.currentTarget.style.color = GOLD_DIM; }}>›</button>
        </div>

        {/* Day-of-week headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
          {DAYS_OF_WEEK.map((d, i) => (
            <div key={d} style={{ textAlign: "center", color: (i === 0 || i === 3) ? GOLD_DIM : "hsl(38 15% 28%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", paddingBottom: 6, fontWeight: (i === 0 || i === 3) ? "bold" : "normal" }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        {isLoading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 60, opacity: 0.4 }}>
            <span style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 13 }}>Loading...</span>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dateStr = toDateStr(viewYear, viewMonth, day);
              const dateObj = new Date(viewYear, viewMonth, day);
              const services = getDayServices(dateObj, activeCampus);
              const isClickable = services !== null;
              const hasData = datesWithData.has(dateStr);
              const isToday = dateStr === currentTodayStr;
              const isSelected = dateStr === selectedDate;
              const isSunday = dateObj.getDay() === 0;
              const isWed = dateObj.getDay() === 3;

              return (
                <button
                  key={day}
                  onClick={() => isClickable ? setSelectedDate(isSelected ? null : dateStr) : undefined}
                  disabled={!isClickable}
                  style={{
                    position: "relative", aspectRatio: "1", borderRadius: 8,
                    border: isSelected ? "2px solid hsl(38 55% 45%)" : isToday ? "1px solid hsl(38 35% 32%)" : hasData ? "1px solid hsl(38 22% 22%)" : isClickable ? "1px solid hsl(38 16% 18%)" : "1px solid hsl(38 8% 13%)",
                    background: isSelected ? "hsl(38 40% 18%)" : hasData ? "hsl(35 22% 15%)" : isClickable ? "hsl(35 18% 12%)" : "hsl(35 14% 10%)",
                    cursor: isClickable ? "pointer" : "default", opacity: isClickable ? 1 : 0.3,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, transition: "all 0.15s", padding: 0,
                  }}
                  onMouseOver={e => { if (isClickable && !isSelected) { e.currentTarget.style.background = "hsl(35 22% 17%)"; e.currentTarget.style.borderColor = "hsl(38 28% 28%)"; } }}
                  onMouseOut={e => { if (!isSelected) { e.currentTarget.style.background = hasData ? "hsl(35 22% 15%)" : isClickable ? "hsl(35 18% 12%)" : "hsl(35 14% 10%)"; e.currentTarget.style.borderColor = isToday ? "hsl(38 35% 32%)" : hasData ? "hsl(38 22% 22%)" : isClickable ? "hsl(38 16% 18%)" : "hsl(38 8% 13%)"; } }}
                >
                  <span style={{ fontFamily: "Georgia, serif", fontSize: 13, fontWeight: isToday || isSunday || isWed ? "bold" : "normal", color: isSelected ? GOLD_BRIGHT : isToday ? GOLD : isSunday ? "hsl(38 50% 60%)" : isWed ? "hsl(200 50% 60%)" : "hsl(38 15% 30%)", lineHeight: 1 }}>
                    {day}
                  </span>
                  {hasData && (
                    <div style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
                      {Array.from({ length: Math.min((dayMap[`${dateStr}__${SUNDAY_SERVICES[0]}`] ?? dayMap[Object.keys(dayMap).find(k => k.startsWith(dateStr)) ?? ""] ?? []).length || 1, 3) }).map((_, i) => (
                        <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? GOLD_BRIGHT : GOLD }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 20, justifyContent: "center", opacity: 0.4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, border: "1px solid hsl(38 16% 18%)", background: "hsl(35 18% 12%)" }} />
            <span style={{ color: "hsl(38 50% 60%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.1em" }}>Sun</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, border: "1px solid hsl(38 16% 18%)", background: "hsl(35 18% 12%)" }} />
            <span style={{ color: "hsl(200 50% 60%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.1em" }}>Wed</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD }} />
            <span style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.1em" }}>Has entries</span>
          </div>
        </div>
      </div>

      {/* Day detail bottom sheet */}
      {selectedDate && selectedDayServices && (
        <DayDetail
          dateStr={selectedDate}
          dayServices={selectedDayServices}
          dayMap={dayMap}
          allReports={reports}
          activeCampus={activeCampus}
          onClose={() => setSelectedDate(null)}
          onSave={handleSave}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
