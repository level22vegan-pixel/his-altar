import { useState } from "react";
import { useLocation } from "wouter";
import { useListWorkers, useCreateWorker, useDeleteWorker } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type Category = "master" | "alt";

function Avatar({ name, photoUrl, size = 44 }: { name: string; photoUrl?: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = [
    ["hsl(38 55% 28%)", "hsl(38 75% 72%)"],
    ["hsl(200 45% 22%)", "hsl(200 65% 72%)"],
    ["hsl(280 30% 22%)", "hsl(280 50% 72%)"],
    ["hsl(130 30% 18%)", "hsl(130 50% 65%)"],
    ["hsl(0 35% 22%)", "hsl(0 55% 72%)"],
    ["hsl(220 40% 20%)", "hsl(220 60% 72%)"],
  ];
  const [bg, fg] = colors[name.charCodeAt(0) % colors.length];
  if (photoUrl) {
    return <img src={photoUrl} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "1px solid hsl(38 25% 28%)", flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", fontSize: size * 0.33, fontWeight: "bold", border: "1px solid hsl(38 25% 28%)", flexShrink: 0 }}>
      {initials}
    </div>
  );
}

const INPUT = {
  background: "hsl(35 18% 11%)",
  border: "1px solid hsl(38 20% 22%)",
  color: "hsl(38 55% 70%)",
  fontFamily: "Georgia, serif",
  borderRadius: 4, padding: "7px 10px", width: "100%", fontSize: 13, outline: "none",
} as React.CSSProperties;

const LABEL = {
  color: "hsl(38 28% 42%)", fontFamily: "Georgia, serif", fontSize: 10,
  letterSpacing: "0.18em", textTransform: "uppercase" as const, display: "block", marginBottom: 4,
};

export default function RosterManagerPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Category>("master");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { data: masterData, isLoading: masterLoading } = useListWorkers({ category: "master" }, { query: { queryKey: ["workers-master"] } });
  const { data: altData, isLoading: altLoading } = useListWorkers({ category: "alt" }, { query: { queryKey: ["workers-alt"] } });
  const createWorker = useCreateWorker();
  const deleteWorker = useDeleteWorker();

  const workers = tab === "master" ? (masterData?.workers ?? []) : (altData?.workers ?? []);
  const isLoading = tab === "master" ? masterLoading : altLoading;
  const keys = ["workers-master", "workers-alt"];

  const handleAdd = () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setError("");
    createWorker.mutate(
      { data: { name: name.trim(), role: role.trim() || undefined, category: tab, photoUrl: photoUrl.trim() || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [`workers-${tab}`] });
          setName(""); setRole(""); setPhotoUrl("");
          setSuccess("Worker added");
          setTimeout(() => setSuccess(""), 2500);
        },
        onError: () => setError("Failed to add worker"),
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Remove this worker?")) return;
    deleteWorker.mutate(
      { id },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`workers-master`] }); queryClient.invalidateQueries({ queryKey: [`workers-alt`] }); } }
    );
  };

  return (
    <div className="relative min-h-screen w-full" style={{ background: "hsl(35 20% 9%)" }}>
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 40%, hsl(30 18% 5% / 0.7) 100%)" }} />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">
        <button onClick={() => navigate("/admin")} style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.2em", background: "none", border: "none", cursor: "pointer", textTransform: "uppercase", opacity: 0.5, marginBottom: 28, display: "block" }}>← Admin</button>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ color: "hsl(38 60% 62%)", fontFamily: "Georgia, serif", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase" }}>Roster Manager</h1>
        </div>

        {/* Category tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid hsl(38 18% 20%)" }}>
          {(["master", "alt"] as Category[]).map(c => (
            <button key={c} onClick={() => setTab(c)} style={{ flex: 1, paddingBottom: 10, paddingTop: 8, fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", color: tab === c ? "hsl(38 70% 65%)" : "hsl(38 25% 40%)", borderBottom: tab === c ? "2px solid hsl(38 65% 50%)" : "2px solid transparent", marginBottom: -1, transition: "all 0.2s" }}>
              {c === "master" ? "Master Roster" : "Alt Roster"}
            </button>
          ))}
        </div>

        {/* Add form */}
        <div style={{ background: "hsl(35 20% 13%)", border: "1px solid hsl(38 18% 22%)", borderRadius: 6, padding: 16, marginBottom: 20 }}>
          <p style={{ ...LABEL, marginBottom: 12, fontSize: 11 }}>Add Worker to {tab === "master" ? "Master Roster" : "Alt Roster"}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><label style={LABEL}>Full Name *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Name" style={INPUT} /></div>
            <div><label style={LABEL}>Role / Title</label><input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Altar Worker" style={INPUT} /></div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={LABEL}>Photo URL (optional)</label>
            <input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://..." style={INPUT} />
          </div>
          {error && <p style={{ color: "hsl(0 60% 55%)", fontFamily: "Georgia, serif", fontSize: 12, marginBottom: 10 }}>{error}</p>}
          {success && <p style={{ color: "hsl(38 70% 58%)", fontFamily: "Georgia, serif", fontSize: 12, marginBottom: 10 }}>{success}</p>}
          <button onClick={handleAdd} disabled={createWorker.isPending} style={{ background: "hsl(38 50% 28%)", color: "hsl(38 70% 80%)", border: "1px solid hsl(38 38% 35%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", padding: "8px 20px", borderRadius: 4, cursor: "pointer", opacity: createWorker.isPending ? 0.5 : 1 }}>
            {createWorker.isPending ? "Adding..." : "+ Add Worker"}
          </button>
        </div>

        {/* Worker list */}
        {isLoading ? (
          <p style={{ color: "hsl(38 30% 40%)", fontFamily: "Georgia, serif", fontSize: 13, textAlign: "center", opacity: 0.5, paddingTop: 24 }}>Loading...</p>
        ) : workers.length === 0 ? (
          <p style={{ color: "hsl(38 30% 40%)", fontFamily: "Georgia, serif", fontSize: 13, textAlign: "center", opacity: 0.4, paddingTop: 24 }}>No workers yet — add one above</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {workers.map(w => (
              <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "hsl(35 18% 12%)", border: "1px solid hsl(38 15% 20%)", borderRadius: 6, padding: "10px 14px" }}>
                <Avatar name={w.name} photoUrl={w.photoUrl} size={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: "hsl(38 60% 68%)", fontFamily: "Georgia, serif", fontSize: 13, fontWeight: "bold" }}>{w.name}</div>
                  {w.role && <div style={{ color: "hsl(38 25% 42%)", fontFamily: "Georgia, serif", fontSize: 11 }}>{w.role}</div>}
                </div>
                <button onClick={() => handleDelete(w.id)} style={{ color: "hsl(0 50% 50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, opacity: 0.5, transition: "opacity 0.2s" }} onMouseOver={e => (e.currentTarget.style.opacity = "1")} onMouseOut={e => (e.currentTarget.style.opacity = "0.5")}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
