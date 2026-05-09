import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Pencil } from "lucide-react";
import {
  useListDbancContacts,
  useDeleteDbancContact,
  useCreateActivityLog,
} from "@workspace/api-client-react";
import { getSessionUserName, getValidCampusSession, getValidAdminSession } from "@/lib/session";

const CAMPUSES = ["HALLMARK", "ARROWHEAD", "RIVERSIDE", "POMONA", "LA", "ARIZONA"];

function formatPhone(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return p;
}

const BTN = {
  background: "linear-gradient(135deg, hsl(220 65% 30%), hsl(220 60% 22%))",
  color: "hsl(0 0% 97%)",
  border: "1px solid hsl(220 50% 40%)",
  fontFamily: "Georgia, serif",
  letterSpacing: "0.15em",
  cursor: "pointer",
  borderRadius: 8,
  padding: "10px 22px",
  fontSize: 13,
  textTransform: "uppercase" as const,
};

export default function DbancPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [campusFilter, setCampusFilter] = useState("");
  const logAccess = useCreateActivityLog();

  const campusSession = getValidCampusSession();
  const isMasterAdmin = getValidAdminSession();
  const lockedCampus = campusSession?.campus ?? null;

  // Master admin uses the campusFilter state; campus users use their locked campus
  const activeCampus = lockedCampus ?? (campusFilter || undefined);

  const { data, isLoading, refetch } = useListDbancContacts(
    activeCampus ? { campus: activeCampus } : undefined
  );
  const deleteContact = useDeleteDbancContact();

  useEffect(() => {
    logAccess.mutate({ data: { tool: "dbanc", action: "page_access", userName: getSessionUserName() } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contacts = (data?.contacts ?? []).filter(c => {
    const q = search.toLowerCase();
    return (
      q === "" ||
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.campus.toLowerCase().includes(q)
    );
  });

  function handleDelete(id: number, name: string) {
    if (!confirm(`Remove ${name} from Dbanc?`)) return;
    deleteContact.mutate({ id }, { onSuccess: () => refetch() });
  }

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-start overflow-hidden"
      style={{ background: "linear-gradient(160deg, hsl(220 65% 14%) 0%, hsl(220 55% 10%) 40%, hsl(0 60% 14%) 100%)" }}
    >
      {/* Patriotic stripes */}
      <div className="absolute top-0 left-0 right-0 h-2" style={{ background: "hsl(0 72% 45%)" }} />
      <div className="absolute top-2 left-0 right-0 h-1" style={{ background: "hsl(0 0% 95%)" }} />
      <div className="absolute bottom-0 left-0 right-0 h-2" style={{ background: "hsl(0 72% 45%)" }} />
      <div className="absolute bottom-2 left-0 right-0 h-1" style={{ background: "hsl(0 0% 95%)" }} />

      {/* Stars */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, hsl(0 0% 100% / 0.4) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

      {/* Back */}
      <button
        onClick={() => navigate("/admin")}
        className="absolute top-5 left-6 z-10 text-xs tracking-widest uppercase opacity-50 hover:opacity-90 transition-opacity"
        style={{ color: "hsl(0 0% 90%)", fontFamily: "Georgia, serif", background: "none", border: "none", cursor: "pointer" }}
      >
        ← Admin
      </button>

      <div className="relative z-10 w-full max-w-2xl px-4 pt-14 pb-20">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.8rem, 5vw, 2.6rem)", color: "hsl(0 0% 97%)", letterSpacing: "0.22em", textTransform: "uppercase", textShadow: "0 2px 18px hsl(220 80% 30% / 0.7)" }}>
            Dbanc
          </h1>
          <div style={{ width: 60, height: 2, background: "linear-gradient(90deg, hsl(0 72% 50%), hsl(0 0% 95%), hsl(220 70% 50%))", margin: "8px auto 0", borderRadius: 2 }} />
          <p style={{ color: "hsl(220 40% 70%)", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.15em", marginTop: 6, textTransform: "uppercase" }}>
            Prayer Contact Database
          </p>
          {/* Campus lock badge for campus users */}
          {lockedCampus && (
            <div style={{ display: "inline-block", marginTop: 8, padding: "3px 14px", background: "hsl(220 60% 20%)", border: "1px solid hsl(220 50% 35%)", borderRadius: 20 }}>
              <span style={{ color: "hsl(220 60% 75%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                {lockedCampus} · {campusSession?.role === "lead" ? "Lead" : "Deputy Lead"}
              </span>
            </div>
          )}
        </div>

        {/* Campus filter tabs — master admin only */}
        {isMasterAdmin && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                gap: 6,
                overflowX: "auto",
                paddingBottom: 4,
                scrollbarWidth: "none",
              }}
            >
              {/* All tab */}
              <button
                onClick={() => setCampusFilter("")}
                style={{
                  flexShrink: 0,
                  padding: "6px 16px",
                  borderRadius: 20,
                  border: campusFilter === "" ? "1px solid hsl(38 60% 55%)" : "1px solid hsl(220 30% 28%)",
                  background: campusFilter === "" ? "hsl(35 45% 18%)" : "hsl(220 40% 10%)",
                  color: campusFilter === "" ? "hsl(38 70% 68%)" : "hsl(220 30% 55%)",
                  fontFamily: "Georgia, serif",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                All
              </button>
              {CAMPUSES.map(c => (
                <button
                  key={c}
                  onClick={() => setCampusFilter(campusFilter === c ? "" : c)}
                  style={{
                    flexShrink: 0,
                    padding: "6px 16px",
                    borderRadius: 20,
                    border: campusFilter === c ? "1px solid hsl(220 60% 55%)" : "1px solid hsl(220 30% 28%)",
                    background: campusFilter === c ? "hsl(220 55% 22%)" : "hsl(220 40% 10%)",
                    color: campusFilter === c ? "hsl(220 70% 78%)" : "hsl(220 30% 55%)",
                    fontFamily: "Georgia, serif",
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action bar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <button onClick={() => navigate("/admin/dbanc/new")} style={{ ...BTN, flex: 1 }}>
            + Add Contact
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder={
            lockedCampus
              ? `Search ${lockedCampus} contacts…`
              : campusFilter
              ? `Search ${campusFilter} contacts…`
              : "Search by name, phone, or campus…"
          }
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid hsl(220 40% 28%)",
            background: "hsl(220 50% 10%)",
            color: "hsl(0 0% 92%)",
            fontFamily: "Georgia, serif",
            fontSize: 13,
            letterSpacing: "0.05em",
            marginBottom: 16,
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        {/* Contact list */}
        <div style={{ borderRadius: 10, border: "1px solid hsl(220 30% 22%)", background: "hsl(220 50% 10% / 0.7)", overflow: "hidden" }}>
          {isLoading ? (
            <div style={{ padding: 32, textAlign: "center", color: "hsl(220 40% 55%)", fontFamily: "Georgia, serif", fontSize: 13 }}>Loading…</div>
          ) : contacts.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "hsl(220 30% 40%)", fontFamily: "Georgia, serif", fontSize: 13, letterSpacing: "0.1em" }}>
              {search
                ? "No contacts match your search"
                : activeCampus
                ? `No contacts for ${activeCampus} yet`
                : "No contacts yet — add the first one"}
            </div>
          ) : (
            contacts.map((c, i) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "14px 18px",
                  borderBottom: i < contacts.length - 1 ? "1px solid hsl(220 30% 16%)" : "none",
                  background: i % 2 === 0 ? "transparent" : "hsl(220 40% 8% / 0.5)",
                  gap: 12,
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  background: `linear-gradient(135deg, hsl(${(c.id * 47) % 360} 60% 35%), hsl(${(c.id * 47 + 60) % 360} 50% 22%))`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "hsl(0 0% 95%)", fontFamily: "Georgia, serif", fontSize: 15, fontWeight: "bold",
                }}>
                  {c.firstName[0]}{c.lastName[0]}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "hsl(0 0% 94%)", fontFamily: "Georgia, serif", fontSize: 14, fontWeight: "bold" }}>
                    {c.firstName} {c.lastName}
                  </div>
                  <div style={{ color: "hsl(220 40% 60%)", fontFamily: "Georgia, serif", fontSize: 11, marginTop: 2 }}>
                    {formatPhone(c.phone)}{c.carrier ? ` · ${c.carrier}` : ""}{!lockedCampus && c.campus ? ` · ${c.campus}` : ""}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => navigate(`/admin/dbanc/contacts/${c.id}`)}
                    title="Edit contact"
                    style={{ padding: "6px 10px", borderRadius: 6, background: "hsl(220 50% 22%)", border: "1px solid hsl(220 40% 32%)", color: "hsl(220 60% 75%)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Pencil size={13} />
                  </button>
                  {/* Delete only for master admin */}
                  {isMasterAdmin && (
                    <button
                      onClick={() => handleDelete(c.id, `${c.firstName} ${c.lastName}`)}
                      style={{ padding: "5px 10px", borderRadius: 6, background: "hsl(0 50% 18%)", border: "1px solid hsl(0 40% 28%)", color: "hsl(0 60% 65%)", fontFamily: "Georgia, serif", fontSize: 11, cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: 12, color: "hsl(220 30% 40%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.1em" }}>
          {contacts.length} {contacts.length === 1 ? "contact" : "contacts"}
          {activeCampus ? ` at ${activeCampus}` : ""}
        </p>
      </div>
    </div>
  );
}
