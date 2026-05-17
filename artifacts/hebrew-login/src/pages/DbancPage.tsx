import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Pencil } from "lucide-react";
import {
  useListDbancContacts,
  useDeleteDbancContact,
  useCreateActivityLog,
} from "@workspace/api-client-react";
import { getSessionUserName, getValidCampusSession, getValidAdminSession } from "@/lib/session";
import { getOrgCampuses } from "@/lib/useOrgConfig";

function formatPhone(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return p;
}

const BTN = {
  background: "linear-gradient(135deg, hsl(215 60% 38%), hsl(215 55% 28%))",
  color: "hsl(215 90% 96%)",
  border: "1px solid hsl(215 50% 50%)",
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
  const CAMPUSES = getOrgCampuses();
  const [search, setSearch] = useState("");
  const [campusFilter, setCampusFilter] = useState(() => CAMPUSES[0] ?? "HALLMARK");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const logAccess = useCreateActivityLog();

  const campusSession = getValidCampusSession();
  const isMasterAdmin = getValidAdminSession();
  const isLead = campusSession?.role === "lead";
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

  const contacts = [...(data?.contacts ?? [])]
    .sort((a, b) => sortOrder === "newest" ? b.id - a.id : a.id - b.id)
    .filter(c => {
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
      style={{ background: "linear-gradient(160deg, hsl(215 28% 90%) 0%, hsl(215 22% 84%) 60%, hsl(220 20% 88%) 100%)" }}
    >
      {/* Back */}
      <button
        onClick={() => navigate("/admin")}
        className="absolute top-5 left-6 z-20"
        style={{
          color: "hsl(215 65% 36%)",
          fontFamily: "Georgia, serif",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          background: "hsl(215 40% 88%)",
          border: "1px solid hsl(215 38% 70%)",
          borderRadius: 6,
          padding: "5px 12px",
          cursor: "pointer",
        }}
      >
        ← Admin
      </button>

      <div className="relative z-10 w-full max-w-2xl px-4 pt-14 pb-20">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 style={{
            fontFamily: "Georgia, serif", fontSize: "clamp(1.8rem, 5vw, 2.6rem)",
            letterSpacing: "0.22em", textTransform: "uppercase",
            background: "linear-gradient(135deg, hsl(215 70% 38%), hsl(225 65% 52%))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            Dbanc
          </h1>
          <div style={{ width: 60, height: 2, background: "linear-gradient(90deg, hsl(215 65% 45%), hsl(225 70% 58%))", margin: "8px auto 0", borderRadius: 2 }} />
          <p style={{ color: "hsl(215 45% 42%)", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.15em", marginTop: 6, textTransform: "uppercase" }}>
            Prayer Contact Database
          </p>
          {lockedCampus && (
            <div style={{ display: "inline-block", marginTop: 8, padding: "3px 14px", background: "hsl(215 50% 82%)", border: "1px solid hsl(215 50% 65%)", borderRadius: 20 }}>
              <span style={{ color: "hsl(215 60% 28%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                {lockedCampus} · {campusSession?.role === "lead" ? "Lead" : "Deputy Lead"}
              </span>
            </div>
          )}
        </div>

        {/* Campus filter tabs — master admin only */}
        {isMasterAdmin && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
              <button
                onClick={() => setCampusFilter("")}
                style={{
                  flexShrink: 0, padding: "6px 16px", borderRadius: 20,
                  border: campusFilter === "" ? "1px solid hsl(215 55% 48%)" : "1px solid hsl(215 30% 68%)",
                  background: campusFilter === "" ? "hsl(215 55% 48%)" : "hsl(215 25% 92%)",
                  color: campusFilter === "" ? "hsl(0 0% 100%)" : "hsl(215 35% 45%)",
                  fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.18em",
                  textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s",
                }}
              >
                All
              </button>
              {CAMPUSES.map(c => (
                <button
                  key={c}
                  onClick={() => setCampusFilter(campusFilter === c ? "" : c)}
                  style={{
                    flexShrink: 0, padding: "6px 16px", borderRadius: 20,
                    border: campusFilter === c ? "1px solid hsl(215 55% 48%)" : "1px solid hsl(215 30% 68%)",
                    background: campusFilter === c ? "hsl(215 55% 48%)" : "hsl(215 25% 92%)",
                    color: campusFilter === c ? "hsl(0 0% 100%)" : "hsl(215 35% 45%)",
                    fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.18em",
                    textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s",
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

        {/* Sort toggle */}
        <div style={{ display: "flex", background: "hsl(215 25% 82%)", borderRadius: 8, padding: 3, marginBottom: 10, gap: 3 }}>
          {(["newest", "oldest"] as const).map(opt => (
            <button
              key={opt}
              onClick={() => setSortOrder(opt)}
              style={{
                flex: 1, padding: "6px 0", borderRadius: 6,
                background: sortOrder === opt ? "hsl(215 55% 48%)" : "transparent",
                color: sortOrder === opt ? "hsl(0 0% 100%)" : "hsl(215 40% 38%)",
                fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase",
                border: sortOrder === opt ? "1px solid hsl(215 50% 42%)" : "1px solid transparent",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {opt === "newest" ? "Newest First" : "Oldest First"}
            </button>
          ))}
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
            width: "100%", padding: "10px 16px", borderRadius: 8,
            border: "1px solid hsl(215 30% 68%)", background: "hsl(215 30% 97%)",
            color: "hsl(215 55% 25%)", fontFamily: "Georgia, serif", fontSize: 13,
            letterSpacing: "0.05em", marginBottom: 16, outline: "none", boxSizing: "border-box",
          }}
        />

        {/* Contact list */}
        <div style={{ borderRadius: 10, border: "1px solid hsl(215 28% 72%)", background: "hsl(215 25% 95% / 0.85)", overflow: "hidden" }}>
          {isLoading ? (
            <div style={{ padding: 32, textAlign: "center", color: "hsl(215 40% 45%)", fontFamily: "Georgia, serif", fontSize: 13 }}>Loading…</div>
          ) : contacts.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "hsl(215 30% 48%)", fontFamily: "Georgia, serif", fontSize: 13, letterSpacing: "0.1em" }}>
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
                  display: "flex", alignItems: "center", padding: "14px 18px",
                  borderBottom: i < contacts.length - 1 ? "1px solid hsl(215 28% 80%)" : "none",
                  background: i % 2 === 0 ? "transparent" : "hsl(215 25% 90% / 0.5)",
                  gap: 12,
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  background: `linear-gradient(135deg, hsl(${200 + (c.id * 23) % 40} 55% 45%), hsl(${215 + (c.id * 17) % 30} 50% 35%))`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "hsl(0 0% 100%)", fontFamily: "Georgia, serif", fontSize: 15, fontWeight: "bold",
                }}>
                  {c.firstName[0]}{c.lastName[0]}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "hsl(215 60% 28%)", fontFamily: "Georgia, serif", fontSize: 14, fontWeight: "bold" }}>
                    {c.firstName} {c.lastName}
                  </div>
                  <div style={{ color: "hsl(215 38% 46%)", fontFamily: "Georgia, serif", fontSize: 11, marginTop: 2 }}>
                    {formatPhone(c.phone)}{c.carrier ? ` · ${c.carrier}` : ""}{!lockedCampus && c.campus ? ` · ${c.campus}` : ""}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => navigate(`/admin/dbanc/contacts/${c.id}`)}
                    title="Edit contact"
                    style={{ padding: "6px 10px", borderRadius: 6, background: "hsl(215 52% 52%)", border: "1px solid hsl(215 48% 44%)", color: "hsl(0 0% 100%)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Pencil size={13} />
                  </button>
                  {(isMasterAdmin || isLead) && (
                    <button
                      onClick={() => handleDelete(c.id, `${c.firstName} ${c.lastName}`)}
                      style={{ padding: "5px 10px", borderRadius: 6, background: "hsl(0 55% 82%)", border: "1px solid hsl(0 45% 65%)", color: "hsl(0 65% 35%)", fontFamily: "Georgia, serif", fontSize: 11, cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: 12, color: "hsl(215 32% 44%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.1em" }}>
          {contacts.length} {contacts.length === 1 ? "contact" : "contacts"}
          {activeCampus ? ` at ${activeCampus}` : ""}
        </p>
      </div>
    </div>
  );
}
