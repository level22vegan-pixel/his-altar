import { useState } from "react";
import { useLocation } from "wouter";
import { useListPxpCallLogs, useListDbancContacts } from "@workspace/api-client-react";
import { getValidCallerSession, getValidCampusSession } from "@/lib/session";
import { getOrgCampuses, getOrgServiceTimes } from "@/lib/useOrgConfig";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";

function formatDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  );
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  );
}

const PDF_BG         = [5, 3, 10]    as const;
const PDF_PURPLE     = [160, 100, 230] as const;
const PDF_PURPLE_DIM = [110, 65, 175] as const;
const PDF_WHITE      = [210, 195, 230] as const;
const PDF_ROW_ALT    = [18, 12, 30]  as const;
const PDF_HEADER_ROW = [40, 22, 65]  as const;

const inputStyle = {
  padding: "9px 14px",
  borderRadius: 8,
  border: "1px solid hsl(270 25% 22%)",
  background: "hsl(270 10% 4%)",
  color: "hsl(270 40% 88%)",
  fontFamily: "Georgia, serif",
  fontSize: 12,
  outline: "none",
  appearance: "none" as const,
};

export default function PXPLogsPage() {
  const [, navigate] = useLocation();
  const CAMPUSES = getOrgCampuses();
  const CAMPUS_SERVICES = getOrgServiceTimes();

  const callerSession = getValidCallerSession();
  const campusSession = getValidCampusSession();
  const lockedCampus  = callerSession?.campus ?? campusSession?.campus ?? null;

  const { data: logsData, isLoading } = useListPxpCallLogs({});
  const { data: contactsData } = useListDbancContacts();

  const [filterService, setFilterService] = useState("");
  const [filterCaller, setFilterCaller]   = useState("");
  const [filterCampus, setFilterCampus]   = useState(lockedCampus ?? "");

  const logs     = logsData?.logs ?? [];
  const contacts = contactsData?.contacts ?? [];
  const contactsMap = Object.fromEntries(contacts.map(c => [c.id, c]));
  const callerNames = [...new Set(logs.map(l => l.callerName).filter(Boolean))].sort();

  const filteredLogs = logs.filter(log => {
    const contact = contactsMap[log.contactId];
    if (filterCampus  && (contact?.campus ?? log.campus) !== filterCampus) return false;
    if (filterService && contact?.serviceTime !== filterService)            return false;
    if (filterCaller  && log.callerName !== filterCaller)                  return false;
    return true;
  });

  const uniqueContacts = new Set(filteredLogs.map(l => l.contactId)).size;
  const uniqueCallers  = new Set(filteredLogs.map(l => l.callerName)).size;

  const outcomeCounts: Record<string, number> = {};
  for (const log of filteredLogs) {
    const key = log.outcome?.trim() || "No outcome";
    outcomeCounts[key] = (outcomeCounts[key] ?? 0) + 1;
  }
  const topOutcomes = Object.entries(outcomeCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  function buildRows() {
    return filteredLogs.map((log, i) => {
      const c = contactsMap[log.contactId];
      return {
        "#": i + 1,
        "Contact Name":  c ? `${c.firstName} ${c.lastName}` : `Contact #${log.contactId}`,
        "Phone":         c?.phone ?? "",
        "Campus":        c?.campus ?? log.campus ?? "",
        "Service Time":  c?.serviceTime ?? "",
        "Gender":        c?.gender ?? "",
        "Carrier":       c?.carrier ?? "",
        "Caller":        log.callerName,
        "Date / Time":   formatDateShort(log.calledAt),
        "Outcome":       log.outcome ?? "",
        "Notes":         log.notes ?? "",
      };
    });
  }

  function exportExcel() {
    const rows = buildRows();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 4 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Called Contacts");
    XLSX.writeFile(wb, `pxp-called-contacts-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportCSV() {
    const rows = buildRows();
    const ws  = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `pxp-called-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
    const W   = doc.internal.pageSize.getWidth();
    const H   = doc.internal.pageSize.getHeight();

    doc.setFillColor(...PDF_BG);
    doc.rect(0, 0, W, H, "F");

    doc.setDrawColor(...PDF_PURPLE);
    doc.setLineWidth(0.8);
    doc.line(14, 18, W - 14, 18);
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...PDF_PURPLE);

    const subtitle = [
      filterCampus  ? filterCampus  : "All Campuses",
      filterService ? filterService : null,
      filterCaller  ? `· ${filterCaller}` : null,
    ].filter(Boolean).join(" · ");

    doc.text("PXP — CALL HISTORY", W / 2, 13, { align: "center" });
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...PDF_PURPLE_DIM);
    doc.text(subtitle, W / 2, 23, { align: "center" });
    doc.setDrawColor(...PDF_PURPLE_DIM);
    doc.setLineWidth(0.3);
    doc.line(14, 26, W - 14, 26);

    doc.setFont("times", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_WHITE);
    doc.text(`${filteredLogs.length} calls · ${uniqueContacts} contacts · ${uniqueCallers} callers`, W / 2, 32, { align: "center" });

    const cols = ["Contact Name", "Phone", "Campus", "Service", "Caller", "Date / Time", "Outcome", "Notes"];
    const colW = [42, 26, 22, 26, 28, 36, 30, 50];
    const startX = 14;
    const rowH   = 7;
    let y = 40;

    doc.setFillColor(...PDF_HEADER_ROW);
    doc.rect(startX, y - 5, W - 28, rowH, "F");
    doc.setFont("times", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_PURPLE);
    let x = startX + 2;
    cols.forEach((col, i) => { doc.text(col.toUpperCase(), x, y); x += colW[i]; });
    y += rowH;

    doc.setFont("times", "normal");
    doc.setFontSize(8);

    filteredLogs.forEach((log, ri) => {
      if (y > H - 20) {
        doc.addPage();
        doc.setFillColor(...PDF_BG);
        doc.rect(0, 0, W, H, "F");
        y = 20;
      }
      if (ri % 2 === 0) {
        doc.setFillColor(...PDF_ROW_ALT);
        doc.rect(startX, y - 5, W - 28, rowH, "F");
      }
      const c = contactsMap[log.contactId];
      const cells = [
        c ? `${c.firstName} ${c.lastName}` : `Contact #${log.contactId}`,
        c?.phone ?? "",
        c?.campus ?? log.campus ?? "",
        c?.serviceTime ?? "",
        log.callerName,
        formatDateShort(log.calledAt),
        log.outcome ?? "",
        log.notes ?? "",
      ];
      doc.setTextColor(...PDF_WHITE);
      x = startX + 2;
      cells.forEach((cell, i) => {
        const maxChars = Math.floor(colW[i] / 2.1);
        const truncated = cell.length > maxChars ? cell.slice(0, maxChars - 1) + "…" : cell;
        doc.text(truncated, x, y);
        x += colW[i];
      });
      y += rowH;
    });

    if (filteredLogs.length > 0) {
      y += 2;
      doc.setDrawColor(...PDF_PURPLE_DIM);
      doc.setLineWidth(0.3);
      doc.line(startX, y - 4, W - 14, y - 4);
      doc.setFont("times", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...PDF_PURPLE);
      doc.text(`TOTAL CALLS: ${filteredLogs.length}   UNIQUE CONTACTS: ${uniqueContacts}   UNIQUE CALLERS: ${uniqueCallers}`, startX + 2, y);
    }

    doc.setDrawColor(...PDF_PURPLE_DIM);
    doc.setLineWidth(0.3);
    doc.line(14, H - 12, W - 14, H - 12);
    doc.setFont("times", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_PURPLE_DIM);
    doc.text("PXP Call History — Confidential", W / 2, H - 7, { align: "center" });

    doc.save(`pxp-call-history-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  const serviceOptions = filterCampus ? (CAMPUS_SERVICES[filterCampus] ?? []) : [];
  const canExport = filteredLogs.length > 0;

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-start overflow-hidden"
      style={{ background: "hsl(270 8% 3%)" }}
    >
      <button
        onClick={() => navigate(callerSession ? "/admin/pxp" : "/admin")}
        className="fixed top-5 left-6 z-50"
        style={{
          color: "hsl(270 45% 68%)",
          fontFamily: "Georgia, serif",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          background: "hsl(270 20% 9%)",
          border: "1px solid hsl(270 30% 22%)",
          borderRadius: 6,
          padding: "5px 12px",
          cursor: "pointer",
        }}
      >
        {callerSession ? "← PXP" : "← Admin"}
      </button>

      <div className="relative z-10 w-full max-w-xl px-4 pt-14 pb-20">
        <div className="text-center mb-6">
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.4rem, 4vw, 2rem)", color: "hsl(270 55% 88%)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Call History
          </h1>
          <div style={{ width: 50, height: 2, background: "linear-gradient(90deg, transparent, hsl(270 60% 55%), transparent)", margin: "8px auto 0" }} />
        </div>

        {logs.length > 0 && (
          <div style={{ background: "hsl(270 12% 7%)", border: "1px solid hsl(270 25% 18%)", borderRadius: 12, padding: "14px 18px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 12 }}>
              {[
                { label: "Total Calls", value: filteredLogs.length, color: "hsl(270 65% 72%)" },
                { label: "Contacts",    value: uniqueContacts,       color: "hsl(270 55% 68%)" },
                { label: "Callers",     value: uniqueCallers,        color: "hsl(270 50% 65%)" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ color, fontFamily: "Georgia, serif", fontSize: "clamp(1.4rem, 5vw, 2rem)", fontWeight: "bold", lineHeight: 1 }}>{value}</div>
                  <div style={{ color: "hsl(270 20% 44%)", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>
            {topOutcomes.length > 0 && (
              <>
                <div style={{ height: 1, background: "hsl(270 20% 14%)", marginBottom: 10 }} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                  {topOutcomes.map(([outcome, count]) => (
                    <div key={outcome} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", background: "hsl(270 12% 5%)", border: "1px solid hsl(270 20% 14%)", borderRadius: 20 }}>
                      <span style={{ color: "hsl(270 65% 70%)", fontFamily: "Georgia, serif", fontSize: 13, fontWeight: "bold" }}>{count}</span>
                      <span style={{ color: "hsl(270 20% 48%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.08em" }}>{outcome}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div style={{ background: "hsl(270 12% 7%)", border: "1px solid hsl(270 25% 18%)", borderRadius: 12, padding: 16, marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ color: "hsl(270 35% 58%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 0 }}>Filter</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {lockedCampus ? (
              <div style={{ ...inputStyle, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: 0.75 }}>
                <span style={{ color: "hsl(270 60% 72%)" }}>{lockedCampus}</span>
                <span style={{ color: "hsl(270 20% 42%)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" }}>Locked</span>
              </div>
            ) : (
              <select style={inputStyle} value={filterCampus} onChange={e => { setFilterCampus(e.target.value); setFilterService(""); }}>
                <option value="">All campuses</option>
                {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <select
              style={{ ...inputStyle, color: filterService ? "hsl(270 65% 75%)" : undefined }}
              value={filterService}
              onChange={e => setFilterService(e.target.value)}
              disabled={!filterCampus}
            >
              <option value="">All services</option>
              {serviceOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <select style={inputStyle} value={filterCaller} onChange={e => setFilterCaller(e.target.value)}>
            <option value="">All callers</option>
            {callerNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            { label: "↓ PDF",   onClick: exportPDF,   bg: "hsl(270 40% 12%)", color: "hsl(270 65% 72%)", border: "hsl(270 40% 26%)" },
            { label: "↓ Excel", onClick: exportExcel, bg: "hsl(140 40% 10%)", color: "hsl(140 60% 58%)", border: "hsl(140 38% 22%)" },
            { label: "↓ CSV",   onClick: exportCSV,   bg: "hsl(270 30% 10%)", color: "hsl(270 50% 65%)", border: "hsl(270 30% 22%)" },
          ].map(({ label, onClick, bg, color, border }) => (
            <button
              key={label}
              onClick={onClick}
              disabled={!canExport}
              style={{
                flex: 1, padding: "11px 0", borderRadius: 10,
                background: canExport ? bg : "hsl(270 10% 6%)",
                color: canExport ? color : "hsl(270 10% 30%)",
                fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase",
                border: `1px solid ${canExport ? border : "hsl(270 15% 12%)"}`,
                cursor: canExport ? "pointer" : "not-allowed", transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ borderRadius: 10, border: "1px solid hsl(270 20% 12%)", background: "hsl(270 12% 5% / 0.8)", overflow: "hidden" }}>
          {isLoading ? (
            <div style={{ padding: 32, textAlign: "center", color: "hsl(270 20% 42%)", fontFamily: "Georgia, serif", fontSize: 13 }}>Loading…</div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "hsl(270 15% 36%)", fontFamily: "Georgia, serif", fontSize: 13, letterSpacing: "0.1em" }}>
              {logs.length === 0 ? "No calls logged yet" : "No results match the current filters"}
            </div>
          ) : (
            filteredLogs.map((log, i) => {
              const contact = contactsMap[log.contactId];
              return (
                <div key={log.id} style={{ padding: "14px 18px", borderBottom: i < filteredLogs.length - 1 ? "1px solid hsl(270 15% 9%)" : "none", background: i % 2 === 0 ? "transparent" : "hsl(270 10% 5% / 0.5)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ color: "hsl(270 30% 85%)", fontFamily: "Georgia, serif", fontSize: 14, fontWeight: "bold" }}>
                        {contact ? `${contact.firstName} ${contact.lastName}` : `Contact #${log.contactId}`}
                      </span>
                      {contact?.serviceTime && (
                        <span style={{ background: "hsl(270 40% 12%)", color: "hsl(270 65% 72%)", borderRadius: 4, padding: "1px 7px", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                          {contact.serviceTime}
                        </span>
                      )}
                    </div>
                    <span style={{ color: "hsl(270 15% 42%)", fontFamily: "Georgia, serif", fontSize: 11, flexShrink: 0, marginLeft: 8 }}>
                      {formatDate(log.calledAt)}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ background: "hsl(270 40% 12%)", color: "hsl(270 65% 72%)", borderRadius: 4, padding: "2px 8px", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      {log.callerName}
                    </span>
                    <span style={{ background: "hsl(270 12% 7%)", color: "hsl(270 20% 52%)", borderRadius: 4, padding: "2px 8px", fontFamily: "Georgia, serif", fontSize: 10 }}>
                      {log.campus}
                    </span>
                    {log.outcome && (
                      <span style={{ background: "hsl(270 12% 6%)", color: "hsl(270 20% 50%)", borderRadius: 4, padding: "2px 8px", fontFamily: "Georgia, serif", fontSize: 10 }}>
                        {log.outcome}
                      </span>
                    )}
                  </div>
                  {log.notes && (
                    <p style={{ color: "hsl(270 15% 46%)", fontFamily: "Georgia, serif", fontSize: 11, marginTop: 5, lineHeight: 1.5 }}>{log.notes}</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: 10, color: "hsl(270 15% 34%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.1em" }}>
          {filteredLogs.length} {filteredLogs.length === 1 ? "call" : "calls"}{filteredLogs.length !== logs.length ? ` of ${logs.length} total` : " logged"}
        </p>
      </div>
    </div>
  );
}
