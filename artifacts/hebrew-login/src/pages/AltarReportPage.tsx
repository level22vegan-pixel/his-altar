import { useState } from "react";
import { useLocation } from "wouter";
import { useListAltarReports, useCreateAltarReport, useDeleteAltarReport, useListServiceReports } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const CAMPUSES = ["HALLMARK", "ARROWHEAD", "RIVERSIDE", "POMONA", "LA", "ARIZONA"];
const SERVICES = ["Sunday 8am", "Sunday 10am", "Sunday 12pm", "Wednesday 7pm", "Other"];
const RESPONSE_TYPES = ["Salvation", "Rededication", "Baptism", "Prayer Request", "Healing", "Other"];

const FIELD_STYLE = {
  background: "hsl(35 18% 11%)",
  border: "1px solid hsl(38 20% 22%)",
  color: "hsl(38 55% 70%)",
  fontFamily: "Georgia, serif",
  outline: "none",
  borderRadius: "4px",
  padding: "8px 12px",
  width: "100%",
  fontSize: "13px",
};

const LABEL_STYLE: React.CSSProperties = {
  color: "hsl(38 30% 45%)",
  fontFamily: "Georgia, serif",
  fontSize: "10px",
  letterSpacing: "0.2em",
  textTransform: "uppercase" as const,
  marginBottom: "4px",
  display: "block",
};

type FormData = {
  name: string;
  campus: string;
  service: string;
  responseType: string;
  phone: string;
  email: string;
  notes: string;
};

const EMPTY_FORM: FormData = {
  name: "", campus: "", service: "", responseType: "",
  phone: "", email: "", notes: "",
};

export default function AltarReportPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const { data, isLoading } = useListAltarReports({ query: { queryKey: ["altarReports"] } });
  const { data: srData } = useListServiceReports({}, { query: { queryKey: ["serviceReports"] } });
  const createMutation = useCreateAltarReport();
  const deleteMutation = useDeleteAltarReport();

  const reports = data?.reports ?? [];

  const setField = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = () => {
    if (!form.name.trim()) { setFormError("Name is required"); return; }
    if (!form.campus) { setFormError("Campus is required"); return; }
    if (!form.service) { setFormError("Service is required"); return; }
    if (!form.responseType) { setFormError("Response type is required"); return; }
    setFormError("");

    createMutation.mutate(
      { data: { name: form.name, campus: form.campus, service: form.service, responseType: form.responseType, phone: form.phone || undefined, email: form.email || undefined, notes: form.notes || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["altarReports"] });
          setForm(EMPTY_FORM);
          setShowForm(false);
          setSuccessMsg("Entry logged successfully");
          setTimeout(() => setSuccessMsg(""), 3000);
        },
        onError: () => setFormError("Failed to save. Please try again."),
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Remove this entry?")) return;
    deleteMutation.mutate(
      { id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["altarReports"] }) }
    );
  };

  const exportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(120, 80, 20);
    doc.text("Altar Report", 14, 16);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 80, 60);
    doc.text(`Generated: ${new Date().toLocaleDateString()}  |  Total entries: ${reports.length}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [["Date", "Name", "Campus", "Service", "Response", "Phone", "Email", "Notes"]],
      body: reports.map(r => [
        new Date(r.createdAt).toLocaleDateString(),
        r.name,
        r.campus,
        r.service,
        r.responseType,
        r.phone ?? "",
        r.email ?? "",
        r.notes ?? "",
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [90, 60, 20], textColor: [240, 210, 150], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 243, 235] },
    });

    doc.save(`altar-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = reports.map(r => ({
      Date: new Date(r.createdAt).toLocaleDateString(),
      Name: r.name,
      Campus: r.campus,
      Service: r.service,
      "Response Type": r.responseType,
      Phone: r.phone ?? "",
      Email: r.email ?? "",
      Notes: r.notes ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Altar Report");
    ws["!cols"] = [10, 20, 12, 14, 16, 14, 22, 30].map(w => ({ wch: w }));
    XLSX.writeFile(wb, `altar-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ background: "hsl(35 20% 9%)" }}>
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 40%, hsl(30 18% 5% / 0.7) 100%)" }} />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate("/admin")} className="text-xs uppercase tracking-widest opacity-40 hover:opacity-80 transition-opacity" style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif", letterSpacing: "0.2em", background: "none", border: "none", cursor: "pointer" }}>
            &larr; Admin
          </button>
          <div className="flex items-center gap-4">
            <div className="h-px w-16" style={{ background: "hsl(38 30% 25%)" }} />
            <h1 className="text-base uppercase tracking-widest" style={{ color: "hsl(38 60% 62%)", fontFamily: "Georgia, serif", letterSpacing: "0.3em" }}>Altar Report</h1>
            <div className="h-px w-16" style={{ background: "hsl(38 30% 25%)" }} />
          </div>
          <div className="flex gap-2">
            <button onClick={exportPDF} disabled={reports.length === 0} className="px-3 py-1.5 text-xs uppercase tracking-widest rounded transition-all disabled:opacity-30" style={{ background: "hsl(0 40% 25%)", color: "hsl(0 40% 80%)", border: "1px solid hsl(0 30% 35%)", fontFamily: "Georgia, serif", cursor: "pointer" }}>
              PDF
            </button>
            <button onClick={exportExcel} disabled={reports.length === 0} className="px-3 py-1.5 text-xs uppercase tracking-widest rounded transition-all disabled:opacity-30" style={{ background: "hsl(130 30% 22%)", color: "hsl(130 40% 75%)", border: "1px solid hsl(130 25% 32%)", fontFamily: "Georgia, serif", cursor: "pointer" }}>
              Excel
            </button>
          </div>
        </div>

        {/* Service Report stat buttons */}
        {(() => {
          const serviceReports = srData?.reports ?? [];
          const totals = serviceReports.reduce(
            (acc, r) => ({ totalEntries: acc.totalEntries + r.totalEntries, servants: acc.servants + r.servants, salvations: acc.salvations + r.salvations, prayers: acc.prayers + r.prayers, family: acc.family + r.family }),
            { totalEntries: 0, servants: 0, salvations: 0, prayers: 0, family: 0 }
          );
          const stats = [
            { key: "totalEntries", label: "Total Entries", value: reports.length, icon: "📋", color: "hsl(38 55% 28%)", light: "hsl(38 70% 65%)" },
            { key: "servants", label: "Servants", value: totals.servants, icon: "🙌", color: "hsl(200 40% 22%)", light: "hsl(200 60% 65%)" },
            { key: "salvations", label: "Salvations", value: totals.salvations, icon: "✝", color: "hsl(130 35% 18%)", light: "hsl(130 55% 60%)" },
            { key: "prayers", label: "Prayers", value: totals.prayers, icon: "🙏", color: "hsl(280 28% 20%)", light: "hsl(280 50% 65%)" },
            { key: "family", label: "Family", value: totals.family, icon: "👨‍👩‍👧", color: "hsl(0 30% 20%)", light: "hsl(0 55% 65%)" },
          ];
          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 24 }}>
              {stats.map(stat => (
                <button
                  key={stat.key}
                  onClick={() => navigate(`/admin/service-report?category=${stat.key}`)}
                  style={{ background: "hsl(35 20% 13%)", border: "1px solid hsl(38 18% 20%)", borderRadius: 6, padding: "10px 4px", cursor: "pointer", transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
                  onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = stat.color; }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = "hsl(35 20% 13%)"; }}
                >
                  <span style={{ fontSize: 15 }}>{stat.icon}</span>
                  <span style={{ color: stat.light, fontFamily: "Georgia, serif", fontSize: 20, fontWeight: "bold", lineHeight: 1 }}>{stat.value}</span>
                  <span style={{ color: "hsl(38 22% 38%)", fontFamily: "Georgia, serif", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1.2, textAlign: "center" }}>{stat.label}</span>
                </button>
              ))}
            </div>
          );
        })()}

        {/* Add entry button */}
        <div className="mb-5">
          <button
            onClick={() => { setShowForm(!showForm); setFormError(""); }}
            className="px-6 py-2.5 text-xs uppercase tracking-widest rounded transition-all"
            style={{ background: showForm ? "hsl(35 20% 18%)" : "hsl(38 50% 30%)", color: "hsl(38 70% 80%)", border: "1px solid hsl(38 38% 36%)", fontFamily: "Georgia, serif", letterSpacing: "0.2em", cursor: "pointer" }}
          >
            {showForm ? "Cancel" : "+ Log New Entry"}
          </button>
          {successMsg && <span className="ml-4 text-xs fade-in" style={{ color: "hsl(38 70% 58%)", fontFamily: "Georgia, serif" }}>{successMsg}</span>}
        </div>

        {/* Entry Form */}
        {showForm && (
          <div className="mb-6 p-6 rounded fade-in" style={{ background: "hsl(35 20% 13%)", border: "1px solid hsl(38 20% 22%)" }}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label style={LABEL_STYLE}>Full Name *</label>
                <input value={form.name} onChange={setField("name")} placeholder="Enter name" style={FIELD_STYLE} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Campus *</label>
                <select value={form.campus} onChange={setField("campus")} style={FIELD_STYLE}>
                  <option value="">Select campus...</option>
                  {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={LABEL_STYLE}>Service *</label>
                <select value={form.service} onChange={setField("service")} style={FIELD_STYLE}>
                  <option value="">Select service...</option>
                  {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={LABEL_STYLE}>Response Type *</label>
                <select value={form.responseType} onChange={setField("responseType")} style={FIELD_STYLE}>
                  <option value="">Select type...</option>
                  {RESPONSE_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={LABEL_STYLE}>Phone</label>
                <input value={form.phone} onChange={setField("phone")} placeholder="(optional)" style={FIELD_STYLE} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Email</label>
                <input value={form.email} onChange={setField("email")} placeholder="(optional)" style={FIELD_STYLE} />
              </div>
            </div>
            <div className="mb-4">
              <label style={LABEL_STYLE}>Notes / Prayer Request</label>
              <textarea value={form.notes} onChange={setField("notes")} rows={3} placeholder="Additional notes (optional)" style={{ ...FIELD_STYLE, resize: "vertical" }} />
            </div>
            {formError && <p className="text-xs mb-3 fade-in" style={{ color: "hsl(0 60% 55%)", fontFamily: "Georgia, serif" }}>{formError}</p>}
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="px-8 py-2.5 text-xs uppercase tracking-widest rounded disabled:opacity-50"
              style={{ background: "hsl(38 50% 30%)", color: "hsl(38 70% 82%)", border: "1px solid hsl(38 40% 38%)", fontFamily: "Georgia, serif", letterSpacing: "0.2em", cursor: "pointer" }}
            >
              {createMutation.isPending ? "Saving..." : "Save Entry"}
            </button>
          </div>
        )}

        {/* Reports table */}
        {isLoading ? (
          <p className="text-center text-xs opacity-40 mt-8" style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif" }}>Loading...</p>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 opacity-40">
            <p className="text-sm" style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif" }}>No entries yet</p>
            <p className="text-xs mt-1" style={{ color: "hsl(38 25% 40%)", fontFamily: "Georgia, serif" }}>Log a new entry above</p>
          </div>
        ) : (
          <div className="rounded overflow-hidden" style={{ border: "1px solid hsl(38 18% 20%)" }}>
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "hsl(35 22% 16%)" }}>
                  {["Date", "Name", "Campus", "Service", "Response", "Phone", "Email", "Notes", ""].map(h => (
                    <th key={h} className="text-left px-3 py-3" style={{ color: "hsl(38 40% 50%)", fontFamily: "Georgia, serif", letterSpacing: "0.15em", textTransform: "uppercase", fontSize: "9px", borderBottom: "1px solid hsl(38 18% 22%)", fontWeight: "normal" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((r, idx) => (
                  <tr key={r.id} style={{ background: idx % 2 === 0 ? "hsl(35 18% 11%)" : "hsl(35 20% 13%)", borderBottom: "1px solid hsl(38 15% 18%)" }}>
                    <td className="px-3 py-3 whitespace-nowrap" style={{ color: "hsl(38 30% 45%)" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3 font-medium" style={{ color: "hsl(38 60% 68%)" }}>{r.name}</td>
                    <td className="px-3 py-3" style={{ color: "hsl(38 40% 55%)" }}>{r.campus}</td>
                    <td className="px-3 py-3" style={{ color: "hsl(38 35% 50%)" }}>{r.service}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded text-xs" style={{ background: responseColor(r.responseType).bg, color: responseColor(r.responseType).text, fontFamily: "Georgia, serif" }}>
                        {r.responseType}
                      </span>
                    </td>
                    <td className="px-3 py-3" style={{ color: "hsl(38 30% 45%)" }}>{r.phone ?? "—"}</td>
                    <td className="px-3 py-3" style={{ color: "hsl(38 30% 45%)" }}>{r.email ?? "—"}</td>
                    <td className="px-3 py-3 max-w-xs truncate" style={{ color: "hsl(38 25% 40%)" }} title={r.notes ?? ""}>{r.notes ?? "—"}</td>
                    <td className="px-3 py-3">
                      <button onClick={() => handleDelete(r.id)} className="opacity-30 hover:opacity-80 transition-opacity text-xs" style={{ color: "hsl(0 60% 55%)", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function responseColor(type: string): { bg: string; text: string } {
  switch (type) {
    case "Salvation":      return { bg: "hsl(38 60% 20%)", text: "hsl(38 80% 72%)" };
    case "Rededication":   return { bg: "hsl(200 40% 18%)", text: "hsl(200 60% 70%)" };
    case "Baptism":        return { bg: "hsl(220 40% 18%)", text: "hsl(220 60% 72%)" };
    case "Prayer Request": return { bg: "hsl(280 30% 18%)", text: "hsl(280 50% 72%)" };
    case "Healing":        return { bg: "hsl(130 30% 16%)", text: "hsl(130 50% 65%)" };
    default:               return { bg: "hsl(35 20% 18%)", text: "hsl(38 35% 55%)" };
  }
}
