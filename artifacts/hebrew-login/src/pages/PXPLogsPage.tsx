import { useState } from "react";
import { useLocation } from "wouter";
import { useListPxpCallLogs, useListDbancContacts } from "@workspace/api-client-react";
import * as XLSX from "xlsx";

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
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

const CAMPUSES = ["HALLMARK", "ARROWHEAD", "RIVERSIDE", "POMONA", "LA", "ARIZONA"];

const CAMPUS_SERVICES: Record<string, string[]> = {
  HALLMARK:  ["Sunday 8am", "Sunday 10am", "Sunday 12pm", "Wednesday 7pm"],
  ARROWHEAD: ["Sunday 10am", "Sunday 12pm", "Wednesday 7pm"],
  RIVERSIDE: ["Sunday 10am", "Sunday 12pm"],
  POMONA:    ["Sunday 9am", "Sunday 11am", "Wednesday 7pm"],
  LA:        ["Sunday 8am", "Sunday 9am", "Wednesday 7pm"],
  ARIZONA:   ["Sunday 9am", "Sunday 11am", "Wednesday 7pm"],
};

const inputStyle = {
  padding: "9px 14px",
  borderRadius: 8,
  border: "1px solid hsl(270 30% 30%)",
  background: "hsl(270 40% 10%)",
  color: "hsl(0 0% 92%)",
  fontFamily: "Georgia, serif",
  fontSize: 12,
  outline: "none",
  appearance: "none" as const,
};

export default function PXPLogsPage() {
  const [, navigate] = useLocation();
  const { data: logsData, isLoading } = useListPxpCallLogs({});
  const { data: contactsData } = useListDbancContacts();

  const [filterCampus, setFilterCampus] = useState("");
  const [filterService, setFilterService] = useState("");
  const [filterCaller, setFilterCaller] = useState("");

  const logs = logsData?.logs ?? [];
  const contacts = contactsData?.contacts ?? [];
  const contactsMap = Object.fromEntries(contacts.map(c => [c.id, c]));

  // Collect unique caller names from logs
  const callerNames = [...new Set(logs.map(l => l.callerName).filter(Boolean))].sort();

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const contact = contactsMap[log.contactId];
    if (filterCampus && (contact?.campus ?? log.campus) !== filterCampus) return false;
    if (filterService && contact?.serviceTime !== filterService) return false;
    if (filterCaller && log.callerName !== filterCaller) return false;
    return true;
  });

  // Build one row per call log for export
  function buildRows() {
    return filteredLogs.map((log, i) => {
      const contact = contactsMap[log.contactId];
      return {
        "#": i + 1,
        "Contact Name": contact ? `${contact.firstName} ${contact.lastName}` : `Contact #${log.contactId}`,
        "Phone": contact?.phone ?? "",
        "Campus": contact?.campus ?? log.campus ?? "",
        "Service Time": contact?.serviceTime ?? "",
        "Gender": contact?.gender ?? "",
        "Carrier": contact?.carrier ?? "",
        "Caller": log.callerName,
        "Date / Time": formatDateShort(log.calledAt),
        "Outcome": log.outcome ?? "",
        "Notes": log.notes ?? "",
      };
    });
  }

  function exportExcel() {
    const rows = buildRows();
    const ws = XLSX.utils.json_to_sheet(rows);
    // Column widths
    ws["!cols"] = [
      { wch: 4 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 16 },
      { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 30 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Called Contacts");
    XLSX.writeFile(wb, `pxp-called-contacts-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportCSV() {
    const rows = buildRows();
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pxp-called-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const serviceOptions = filterCampus ? (CAMPUS_SERVICES[filterCampus] ?? []) : [];

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-start overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 20%, hsl(270 50% 14%) 0%, hsl(260 45% 8%) 100%)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, hsl(270 70% 55%), hsl(300 60% 55%), hsl(270 70% 55%))" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, hsl(270 50% 60% / 0.05) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />

      <button
        onClick={() => navigate("/admin/pxp")}
        className="absolute top-5 left-6 z-10 text-xs tracking-widest uppercase opacity-50 hover:opacity-90 transition-opacity"
        style={{ color: "hsl(270 50% 75%)", fontFamily: "Georgia, serif", background: "none", border: "none", cursor: "pointer" }}
      >
        ← PXP
      </button>

      <div className="relative z-10 w-full max-w-xl px-4 pt-14 pb-20">
        <div className="text-center mb-8">
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.4rem, 4vw, 2rem)", color: "hsl(0 0% 97%)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Call History
          </h1>
          <div style={{ width: 50, height: 2, background: "linear-gradient(90deg, transparent, hsl(270 60% 55%), transparent)", margin: "8px auto 0" }} />
        </div>

        {/* Filters */}
        <div style={{ background: "hsl(270 35% 11%)", border: "1px solid hsl(270 30% 22%)", borderRadius: 12, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ color: "hsl(270 40% 55%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 2 }}>
            Filter
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <select
              style={inputStyle}
              value={filterCampus}
              onChange={e => { setFilterCampus(e.target.value); setFilterService(""); }}
            >
              <option value="">All campuses</option>
              {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              style={{ ...inputStyle, color: filterService ? "hsl(270 70% 78%)" : undefined }}
              value={filterService}
              onChange={e => setFilterService(e.target.value)}
              disabled={!filterCampus}
            >
              <option value="">All services</option>
              {serviceOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <select
            style={inputStyle}
            value={filterCaller}
            onChange={e => setFilterCaller(e.target.value)}
          >
            <option value="">All callers</option>
            {callerNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {/* Export buttons */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <button
            onClick={exportExcel}
            disabled={filteredLogs.length === 0}
            style={{
              flex: 1, padding: "11px 0", borderRadius: 10,
              background: filteredLogs.length === 0 ? "hsl(270 25% 13%)" : "hsl(140 45% 18%)",
              color: filteredLogs.length === 0 ? "hsl(270 20% 35%)" : "hsl(140 70% 65%)",
              fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase",
              border: `1px solid ${filteredLogs.length === 0 ? "hsl(270 20% 22%)" : "hsl(140 45% 30%)"}`,
              cursor: filteredLogs.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            ↓ Excel
          </button>
          <button
            onClick={exportCSV}
            disabled={filteredLogs.length === 0}
            style={{
              flex: 1, padding: "11px 0", borderRadius: 10,
              background: filteredLogs.length === 0 ? "hsl(270 25% 13%)" : "hsl(210 45% 18%)",
              color: filteredLogs.length === 0 ? "hsl(270 20% 35%)" : "hsl(210 70% 70%)",
              fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase",
              border: `1px solid ${filteredLogs.length === 0 ? "hsl(270 20% 22%)" : "hsl(210 45% 32%)"}`,
              cursor: filteredLogs.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            ↓ CSV
          </button>
        </div>

        {/* Log list */}
        <div style={{ borderRadius: 10, border: "1px solid hsl(270 30% 20%)", background: "hsl(270 35% 10% / 0.8)", overflow: "hidden" }}>
          {isLoading ? (
            <div style={{ padding: 32, textAlign: "center", color: "hsl(270 35% 45%)", fontFamily: "Georgia, serif", fontSize: 13 }}>Loading…</div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "hsl(270 25% 38%)", fontFamily: "Georgia, serif", fontSize: 13, letterSpacing: "0.1em" }}>
              {logs.length === 0 ? "No calls logged yet" : "No results match the current filters"}
            </div>
          ) : (
            filteredLogs.map((log, i) => {
              const contact = contactsMap[log.contactId];
              return (
                <div
                  key={log.id}
                  style={{
                    padding: "16px 20px",
                    borderBottom: i < filteredLogs.length - 1 ? "1px solid hsl(270 25% 14%)" : "none",
                    background: i % 2 === 0 ? "transparent" : "hsl(270 30% 8% / 0.5)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <span style={{ color: "hsl(0 0% 92%)", fontFamily: "Georgia, serif", fontSize: 14, fontWeight: "bold" }}>
                        {contact ? `${contact.firstName} ${contact.lastName}` : `Contact #${log.contactId}`}
                      </span>
                      {contact?.serviceTime && (
                        <span style={{ marginLeft: 8, background: "hsl(270 45% 16%)", color: "hsl(270 60% 70%)", borderRadius: 4, padding: "1px 7px", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                          {contact.serviceTime}
                        </span>
                      )}
                    </div>
                    <span style={{ color: "hsl(270 30% 45%)", fontFamily: "Georgia, serif", fontSize: 11 }}>
                      {formatDate(log.calledAt)}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ background: "hsl(270 45% 18%)", color: "hsl(270 60% 70%)", borderRadius: 4, padding: "2px 8px", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      {log.callerName}
                    </span>
                    <span style={{ background: "hsl(270 30% 14%)", color: "hsl(270 40% 55%)", borderRadius: 4, padding: "2px 8px", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.1em" }}>
                      {log.campus}
                    </span>
                    {log.outcome && (
                      <span style={{ background: "hsl(270 25% 12%)", color: "hsl(270 35% 50%)", borderRadius: 4, padding: "2px 8px", fontFamily: "Georgia, serif", fontSize: 10 }}>
                        {log.outcome}
                      </span>
                    )}
                  </div>
                  {log.notes && (
                    <p style={{ color: "hsl(270 25% 48%)", fontFamily: "Georgia, serif", fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
                      {log.notes}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: 12, color: "hsl(270 25% 35%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.1em" }}>
          {filteredLogs.length} {filteredLogs.length === 1 ? "call" : "calls"}{filteredLogs.length !== logs.length ? ` of ${logs.length} total` : " logged"}
        </p>
      </div>
    </div>
  );
}
