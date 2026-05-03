import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { getValidCampusSession } from "@/lib/session";
import { useListWorkers, useCreateWorker, useDeleteWorker, useUpdateWorker } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Worker } from "@workspace/api-client-react";

type Category = "master" | "alt";

const CAMPUSES = ["HALLMARK", "ARROWHEAD", "RIVERSIDE", "POMONA", "LA", "ARIZONA"];

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

const LABEL: React.CSSProperties = {
  color: "hsl(38 28% 42%)", fontFamily: "Georgia, serif", fontSize: 10,
  letterSpacing: "0.18em", textTransform: "uppercase", display: "block", marginBottom: 4,
};

function compressImage(file: File, maxSize = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function EditForm({ worker, onSave, onCancel, onToggleHold }: { worker: Worker; onSave: (data: { name: string; role: string; photoUrl: string }) => void; onCancel: () => void; onToggleHold: () => void }) {
  const [name, setName] = useState(worker.name);
  const [role, setRole] = useState(worker.role ?? "");
  const [photoUrl, setPhotoUrl] = useState(worker.photoUrl ?? "");
  const [photoPreview, setPhotoPreview] = useState(worker.photoUrl ?? "");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState("");
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  const handleCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const c = await compressImage(file); setPhotoUrl(c); setPhotoPreview(c); setCameraOpen(false); } catch { setError("Could not process photo"); }
    e.target.value = "";
  }, []);

  return (
    <div style={{ background: "hsl(35 20% 14%)", border: "1px solid hsl(38 25% 26%)", borderRadius: 6, padding: 14, marginTop: 6 }}>
      <input ref={frontRef} type="file" accept="image/*" capture="user" style={{ display: "none" }} onChange={handleCapture} />
      <input ref={backRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleCapture} />
      <input ref={libraryRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleCapture} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div><label style={LABEL}>Full Name *</label><input value={name} onChange={e => setName(e.target.value)} style={INPUT} /></div>
        <div><label style={LABEL}>Role / Title</label><input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Altar Worker" style={INPUT} /></div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={LABEL}>Photo</label>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          {photoPreview && (
            <div style={{ position: "relative", flexShrink: 0 }}>
              <img src={photoPreview} alt="preview" style={{ width: 50, height: 50, borderRadius: "50%", objectFit: "cover", border: "1px solid hsl(38 25% 28%)" }} />
              <button onClick={() => { setPhotoUrl(""); setPhotoPreview(""); }} style={{ position: "absolute", top: -4, right: -4, background: "hsl(0 40% 22%)", border: "1px solid hsl(0 30% 30%)", borderRadius: "50%", width: 16, height: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(0 60% 70%)", fontSize: 9 }}>✕</button>
            </div>
          )}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            {!cameraOpen ? (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setCameraOpen(true)} style={{ flex: 1, background: "hsl(35 22% 16%)", border: "1px solid hsl(38 20% 24%)", color: "hsl(38 50% 58%)", fontFamily: "Georgia, serif", fontSize: 11, padding: "6px 8px", borderRadius: 4, cursor: "pointer" }}>📷 Camera</button>
                <button onClick={() => libraryRef.current?.click()} style={{ flex: 1, background: "hsl(38 28% 16%)", border: "1px solid hsl(38 22% 24%)", color: "hsl(38 55% 60%)", fontFamily: "Georgia, serif", fontSize: 11, padding: "6px 8px", borderRadius: 4, cursor: "pointer" }}>🖼️ Library</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { setCameraOpen(false); frontRef.current?.click(); }} style={{ flex: 1, background: "hsl(200 28% 16%)", border: "1px solid hsl(200 22% 24%)", color: "hsl(200 60% 65%)", fontFamily: "Georgia, serif", fontSize: 11, padding: "6px 8px", borderRadius: 4, cursor: "pointer" }}>🤳 Front</button>
                <button onClick={() => { setCameraOpen(false); backRef.current?.click(); }} style={{ flex: 1, background: "hsl(280 22% 16%)", border: "1px solid hsl(280 18% 24%)", color: "hsl(280 55% 68%)", fontFamily: "Georgia, serif", fontSize: 11, padding: "6px 8px", borderRadius: 4, cursor: "pointer" }}>📸 Back</button>
                <button onClick={() => setCameraOpen(false)} style={{ background: "none", border: "1px solid hsl(38 15% 22%)", color: "hsl(38 25% 40%)", fontFamily: "Georgia, serif", fontSize: 11, padding: "6px 8px", borderRadius: 4, cursor: "pointer" }}>✕</button>
              </div>
            )}
            {!photoPreview && <input value={photoUrl.startsWith("data:") ? "" : photoUrl} onChange={e => { setPhotoUrl(e.target.value); setPhotoPreview(""); }} placeholder="or paste photo URL..." style={{ ...INPUT, fontSize: 11 }} />}
          </div>
        </div>
      </div>
      {error && <p style={{ color: "hsl(0 60% 55%)", fontFamily: "Georgia, serif", fontSize: 12, marginBottom: 8 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => { if (!name.trim()) { setError("Name is required"); return; } onSave({ name: name.trim(), role, photoUrl }); }} style={{ background: "hsl(38 50% 28%)", color: "hsl(38 70% 80%)", border: "1px solid hsl(38 38% 35%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", padding: "7px 18px", borderRadius: 4, cursor: "pointer" }}>Save</button>
        <button onClick={onCancel} style={{ background: "none", color: "hsl(38 28% 42%)", border: "1px solid hsl(38 15% 22%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", padding: "7px 14px", borderRadius: 4, cursor: "pointer" }}>Cancel</button>
        <div style={{ flex: 1 }} />
        <button
          onClick={onToggleHold}
          style={{ background: worker.onHold ? "hsl(0 35% 18%)" : "none", color: worker.onHold ? "hsl(0 55% 58%)" : "hsl(38 22% 36%)", border: `1px solid ${worker.onHold ? "hsl(0 35% 26%)" : "hsl(38 15% 22%)"}`, fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", padding: "7px 12px", borderRadius: 4, cursor: "pointer", transition: "all 0.15s" }}
        >
          {worker.onHold ? "⏸ Remove Hold" : "⏸ Place on Hold"}
        </button>
      </div>
    </div>
  );
}

export default function RosterManagerPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Category>("master");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  // If a campus session is active, lock to that campus
  const sessionCampus = getValidCampusSession()?.campus ?? null;

  // Campus selector — persisted in localStorage, but overridden by session
  const [campus, setCampus] = useState<string>(() => sessionCampus ?? localStorage.getItem("rosterCampus") ?? "");

  useEffect(() => { if (campus && !sessionCampus) localStorage.setItem("rosterCampus", campus); }, [campus, sessionCampus]);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);

  const frontCamRef = useRef<HTMLInputElement>(null);
  const backCamRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  const masterKey = ["workers-master", campus];
  const altKey = ["workers-alt", campus];

  const { data: masterData, isLoading: masterLoading } = useListWorkers(
    { category: "master", campus: campus || undefined },
    { query: { queryKey: masterKey, enabled: !!campus } }
  );
  const { data: altData, isLoading: altLoading } = useListWorkers(
    { category: "alt", campus: campus || undefined },
    { query: { queryKey: altKey, enabled: !!campus } }
  );

  const createWorker = useCreateWorker();
  const updateWorker = useUpdateWorker();
  const deleteWorker = useDeleteWorker();

  const allMaster = masterData?.workers ?? [];
  const allAlt = altData?.workers ?? [];
  const isLoading = masterLoading || altLoading;

  const q = search.trim().toLowerCase();
  const searching = q.length > 0;
  const filteredMaster = allMaster.filter(w => w.name.toLowerCase().includes(q));
  const filteredAlt = allAlt.filter(w => w.name.toLowerCase().includes(q));
  const tabWorkers = tab === "master" ? allMaster : allAlt;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: masterKey });
    queryClient.invalidateQueries({ queryKey: altKey });
  };

  const handleCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const c = await compressImage(file); setPhotoUrl(c); setPhotoPreview(c); setCameraOpen(false); } catch { setError("Could not process photo"); }
    e.target.value = "";
  }, []);

  const handleAdd = () => {
    if (!name.trim()) { setError("Name is required"); return; }
    if (!campus) { setError("Select a campus first"); return; }
    setError("");
    createWorker.mutate(
      { data: { name: name.trim(), role: role.trim() || undefined, category: tab, campus, photoUrl: photoUrl || undefined } },
      {
        onSuccess: () => { invalidate(); setName(""); setRole(""); setPhotoUrl(""); setPhotoPreview(""); setSuccess("Worker added"); setTimeout(() => setSuccess(""), 2500); },
        onError: () => setError("Failed to add worker"),
      }
    );
  };

  const handleUpdate = (id: number, data: { name: string; role: string; photoUrl: string }) => {
    updateWorker.mutate(
      { id, data: { name: data.name, role: data.role || undefined, photoUrl: data.photoUrl || undefined } },
      { onSuccess: () => { invalidate(); setEditingId(null); }, onError: () => alert("Failed to save changes") }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Remove this worker?")) return;
    deleteWorker.mutate({ id }, { onSuccess: invalidate });
  };

  const handleToggleHold = (w: Worker) => {
    updateWorker.mutate(
      { id: w.id, data: { onHold: !w.onHold } },
      { onSuccess: invalidate }
    );
  };

  const WorkerRow = ({ w, badge }: { w: Worker; badge?: boolean }) => (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: w.onHold ? "hsl(35 18% 11%)" : editingId === w.id ? "hsl(35 22% 15%)" : "hsl(35 18% 12%)", border: `1px solid ${w.onHold ? "hsl(0 28% 22%)" : editingId === w.id ? "hsl(38 28% 28%)" : "hsl(38 15% 20%)"}`, borderRadius: editingId === w.id ? "6px 6px 0 0" : 6, padding: "10px 14px", transition: "all 0.15s", opacity: w.onHold ? 0.65 : 1 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <Avatar name={w.name} photoUrl={w.photoUrl} size={44} />
          {w.onHold && (
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "hsl(0 60% 14% / 0.68)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid hsl(0 45% 32%)" }}>
              <span style={{ fontSize: 15, lineHeight: 1 }}>⏸</span>
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: w.onHold ? "hsl(38 30% 44%)" : "hsl(38 60% 68%)", fontFamily: "Georgia, serif", fontSize: 13, fontWeight: "bold" }}>{w.name}</span>
            {badge && (
              <span style={{ background: w.category === "master" ? "hsl(38 35% 20%)" : "hsl(200 30% 20%)", color: w.category === "master" ? "hsl(38 60% 60%)" : "hsl(200 55% 65%)", borderRadius: 4, padding: "1px 6px", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" as const, fontFamily: "Georgia, serif" }}>
                {w.category}
              </span>
            )}
            {w.onHold && (
              <span style={{ background: "hsl(0 40% 18%)", color: "hsl(0 55% 58%)", borderRadius: 4, padding: "1px 6px", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" as const, fontFamily: "Georgia, serif", border: "1px solid hsl(0 35% 26%)" }}>
                On Hold
              </span>
            )}
          </div>
          {w.role && <div style={{ color: "hsl(38 25% 42%)", fontFamily: "Georgia, serif", fontSize: 11 }}>{w.role}</div>}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button onClick={() => setEditingId(editingId === w.id ? null : w.id)} style={{ color: editingId === w.id ? "hsl(38 65% 58%)" : "hsl(38 35% 45%)", background: editingId === w.id ? "hsl(38 35% 20%)" : "none", border: `1px solid ${editingId === w.id ? "hsl(38 35% 28%)" : "hsl(38 15% 24%)"}`, borderRadius: 4, padding: "3px 9px", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.12em", transition: "all 0.15s" }}>
            {editingId === w.id ? "Close" : "Edit"}
          </button>
          <button onClick={() => handleDelete(w.id)} style={{ color: "hsl(0 50% 50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, opacity: 0.5, transition: "opacity 0.2s" }} onMouseOver={e => (e.currentTarget.style.opacity = "1")} onMouseOut={e => (e.currentTarget.style.opacity = "0.5")}>✕</button>
        </div>
      </div>
      {editingId === w.id && (
        <div style={{ border: "1px solid hsl(38 25% 26%)", borderTop: "none", borderRadius: "0 0 6px 6px", overflow: "hidden" }}>
          <EditForm worker={w} onSave={(data) => handleUpdate(w.id, data)} onCancel={() => setEditingId(null)} onToggleHold={() => handleToggleHold(w)} />
        </div>
      )}
    </div>
  );

  return (
    <div className="relative min-h-screen w-full" style={{ background: "hsl(35 20% 9%)" }}>
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 40%, hsl(30 18% 5% / 0.7) 100%)" }} />

      <input ref={frontCamRef} type="file" accept="image/*" capture="user" style={{ display: "none" }} onChange={handleCapture} />
      <input ref={backCamRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleCapture} />
      <input ref={libraryRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleCapture} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">
        <button onClick={() => navigate("/admin")} style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.2em", background: "none", border: "none", cursor: "pointer", textTransform: "uppercase", opacity: 0.5, marginBottom: 28, display: "block" }}>← Admin</button>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ color: "hsl(38 60% 62%)", fontFamily: "Georgia, serif", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase" }}>Roster Manager</h1>
        </div>

        {/* Campus selector — locked for campus leads, full grid for admin */}
        {sessionCampus ? (
          <div style={{ marginBottom: 20, padding: "12px 16px", background: "hsl(38 45% 24%)", border: "1px solid hsl(38 45% 36%)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "hsl(38 28% 46%)", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase" }}>Campus Roster</span>
            <span style={{ color: "hsl(38 70% 72%)", fontFamily: "Georgia, serif", fontSize: 13, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: "bold" }}>{sessionCampus}</span>
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <label style={{ ...LABEL, marginBottom: 6, fontSize: 11 }}>Campus Roster</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {CAMPUSES.map(c => (
                <button
                  key={c}
                  onClick={() => { setCampus(c); setSearch(""); setEditingId(null); }}
                  style={{
                    padding: "10px 6px",
                    fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase",
                    cursor: "pointer", borderRadius: 6, transition: "all 0.2s",
                    background: campus === c ? "hsl(38 45% 24%)" : "hsl(35 18% 13%)",
                    color: campus === c ? "hsl(38 70% 72%)" : "hsl(38 28% 42%)",
                    border: campus === c ? "1px solid hsl(38 45% 36%)" : "1px solid hsl(38 15% 20%)",
                    boxShadow: campus === c ? "0 0 12px hsl(38 40% 18% / 0.6)" : "none",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {!campus ? (
          <div style={{ textAlign: "center", paddingTop: 40, opacity: 0.4 }}>
            <p style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif", fontSize: 13 }}>Select a campus above to manage its roster</p>
          </div>
        ) : (
          <>
            {/* Search */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "hsl(38 28% 38%)", fontSize: 13, pointerEvents: "none" }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${campus} roster...`} style={{ ...INPUT, paddingLeft: 32, paddingRight: search ? 32 : 10, borderRadius: 6 }} />
              {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "hsl(38 25% 42%)", fontSize: 14, lineHeight: 1 }}>✕</button>}
            </div>

            {/* Tabs */}
            {!searching && (
              <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid hsl(38 18% 20%)" }}>
                {(["master", "alt"] as Category[]).map(c => (
                  <button key={c} onClick={() => setTab(c)} style={{ flex: 1, paddingBottom: 10, paddingTop: 8, fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", color: tab === c ? "hsl(38 70% 65%)" : "hsl(38 25% 40%)", borderBottom: tab === c ? "2px solid hsl(38 65% 50%)" : "2px solid transparent", marginBottom: -1, transition: "all 0.2s" }}>
                    {c === "master" ? "Master Roster" : "Alt Roster"}
                  </button>
                ))}
              </div>
            )}

            {/* Search results */}
            {searching ? (
              <div style={{ marginBottom: 20 }}>
                {filteredMaster.length === 0 && filteredAlt.length === 0 ? (
                  <p style={{ color: "hsl(38 30% 40%)", fontFamily: "Georgia, serif", fontSize: 13, textAlign: "center", opacity: 0.4, paddingTop: 16 }}>No workers match "{search}"</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[...filteredMaster, ...filteredAlt].map(w => <WorkerRow key={w.id} w={w} badge />)}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Add form */}
                <div style={{ background: "hsl(35 20% 13%)", border: "1px solid hsl(38 18% 22%)", borderRadius: 6, padding: 16, marginBottom: 20 }}>
                  <p style={{ ...LABEL, marginBottom: 12, fontSize: 11 }}>Add Worker — {campus} {tab === "master" ? "Master" : "Alt"} Roster</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div><label style={LABEL}>Full Name *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Name" style={INPUT} /></div>
                    <div><label style={LABEL}>Role / Title</label><input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Altar Worker" style={INPUT} /></div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={LABEL}>Photo</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      {photoPreview && (
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          <img src={photoPreview} alt="preview" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "1px solid hsl(38 25% 28%)" }} />
                          <button onClick={() => { setPhotoUrl(""); setPhotoPreview(""); }} style={{ position: "absolute", top: -4, right: -4, background: "hsl(0 40% 22%)", border: "1px solid hsl(0 30% 30%)", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(0 60% 70%)", fontSize: 10 }}>✕</button>
                        </div>
                      )}
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                        {!cameraOpen ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => setCameraOpen(true)} style={{ flex: 1, background: "hsl(35 22% 16%)", border: "1px solid hsl(38 20% 24%)", color: "hsl(38 50% 58%)", fontFamily: "Georgia, serif", fontSize: 11, padding: "7px 10px", borderRadius: 4, cursor: "pointer" }}>📷 Camera</button>
                            <button onClick={() => libraryRef.current?.click()} style={{ flex: 1, background: "hsl(38 28% 16%)", border: "1px solid hsl(38 22% 24%)", color: "hsl(38 55% 60%)", fontFamily: "Georgia, serif", fontSize: 11, padding: "7px 10px", borderRadius: 4, cursor: "pointer" }}>🖼️ Library</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => { setCameraOpen(false); frontCamRef.current?.click(); }} style={{ flex: 1, background: "hsl(200 28% 16%)", border: "1px solid hsl(200 22% 24%)", color: "hsl(200 60% 65%)", fontFamily: "Georgia, serif", fontSize: 11, padding: "7px 8px", borderRadius: 4, cursor: "pointer" }}>🤳 Front</button>
                            <button onClick={() => { setCameraOpen(false); backCamRef.current?.click(); }} style={{ flex: 1, background: "hsl(280 22% 16%)", border: "1px solid hsl(280 18% 24%)", color: "hsl(280 55% 68%)", fontFamily: "Georgia, serif", fontSize: 11, padding: "7px 8px", borderRadius: 4, cursor: "pointer" }}>📸 Back</button>
                            <button onClick={() => setCameraOpen(false)} style={{ background: "none", border: "1px solid hsl(38 15% 22%)", color: "hsl(38 25% 40%)", fontFamily: "Georgia, serif", fontSize: 11, padding: "7px 8px", borderRadius: 4, cursor: "pointer" }}>✕</button>
                          </div>
                        )}
                        {!photoPreview && <input value={photoUrl.startsWith("data:") ? "" : photoUrl} onChange={e => { setPhotoUrl(e.target.value); setPhotoPreview(""); }} placeholder="or paste photo URL..." style={{ ...INPUT, fontSize: 11 }} />}
                      </div>
                    </div>
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
                ) : tabWorkers.length === 0 ? (
                  <p style={{ color: "hsl(38 30% 40%)", fontFamily: "Georgia, serif", fontSize: 13, textAlign: "center", opacity: 0.4, paddingTop: 24 }}>
                    No workers in {campus} {tab === "master" ? "Master" : "Alt"} roster yet
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {tabWorkers.map(w => <WorkerRow key={w.id} w={w} />)}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
