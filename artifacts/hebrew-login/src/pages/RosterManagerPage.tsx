import { useState, useRef, useCallback } from "react";
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
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function RosterManagerPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Category>("master");
  const [search, setSearch] = useState("");
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

  const { data: masterData, isLoading: masterLoading } = useListWorkers({ category: "master" }, { query: { queryKey: ["workers-master"] } });
  const { data: altData, isLoading: altLoading } = useListWorkers({ category: "alt" }, { query: { queryKey: ["workers-alt"] } });
  const createWorker = useCreateWorker();
  const deleteWorker = useDeleteWorker();

  const allMaster = masterData?.workers ?? [];
  const allAlt = altData?.workers ?? [];
  const isLoading = masterLoading || altLoading;

  const q = search.trim().toLowerCase();

  // When searching, show combined results across both tabs
  const searching = q.length > 0;
  const filteredMaster = allMaster.filter(w => w.name.toLowerCase().includes(q));
  const filteredAlt = allAlt.filter(w => w.name.toLowerCase().includes(q));
  const tabWorkers = tab === "master" ? allMaster : allAlt;

  const handleCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setPhotoUrl(compressed);
      setPhotoPreview(compressed);
      setCameraOpen(false);
    } catch {
      setError("Could not process photo");
    }
    e.target.value = "";
  }, []);

  const handleAdd = () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setError("");
    createWorker.mutate(
      { data: { name: name.trim(), role: role.trim() || undefined, category: tab, photoUrl: photoUrl || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["workers-master"] });
          queryClient.invalidateQueries({ queryKey: ["workers-alt"] });
          setName(""); setRole(""); setPhotoUrl(""); setPhotoPreview("");
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
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["workers-master"] }); queryClient.invalidateQueries({ queryKey: ["workers-alt"] }); } }
    );
  };

  const WorkerRow = ({ w, badge }: { w: typeof allMaster[0]; badge?: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: "hsl(35 18% 12%)", border: "1px solid hsl(38 15% 20%)", borderRadius: 6, padding: "10px 14px" }}>
      <Avatar name={w.name} photoUrl={w.photoUrl} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "hsl(38 60% 68%)", fontFamily: "Georgia, serif", fontSize: 13, fontWeight: "bold" }}>{w.name}</span>
          {badge && (
            <span style={{ background: w.category === "master" ? "hsl(38 35% 20%)" : "hsl(200 30% 20%)", color: w.category === "master" ? "hsl(38 60% 60%)" : "hsl(200 55% 65%)", borderRadius: 4, padding: "1px 6px", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "Georgia, serif" }}>
              {w.category}
            </span>
          )}
        </div>
        {w.role && <div style={{ color: "hsl(38 25% 42%)", fontFamily: "Georgia, serif", fontSize: 11 }}>{w.role}</div>}
      </div>
      <button onClick={() => handleDelete(w.id)} style={{ color: "hsl(0 50% 50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, opacity: 0.5, transition: "opacity 0.2s", flexShrink: 0 }} onMouseOver={e => (e.currentTarget.style.opacity = "1")} onMouseOut={e => (e.currentTarget.style.opacity = "0.5")}>✕</button>
    </div>
  );

  return (
    <div className="relative min-h-screen w-full" style={{ background: "hsl(35 20% 9%)" }}>
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 40%, hsl(30 18% 5% / 0.7) 100%)" }} />

      {/* Hidden file inputs */}
      <input ref={frontCamRef} type="file" accept="image/*" capture="user" style={{ display: "none" }} onChange={handleCapture} />
      <input ref={backCamRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleCapture} />
      <input ref={libraryRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleCapture} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">
        <button onClick={() => navigate("/admin")} style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.2em", background: "none", border: "none", cursor: "pointer", textTransform: "uppercase", opacity: 0.5, marginBottom: 28, display: "block" }}>← Admin</button>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ color: "hsl(38 60% 62%)", fontFamily: "Georgia, serif", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase" }}>Roster Manager</h1>
        </div>

        {/* Search box */}
        <div style={{ position: "relative", marginBottom: 20 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "hsl(38 28% 38%)", fontSize: 13, pointerEvents: "none" }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search all roster workers by name..."
            style={{ ...INPUT, paddingLeft: 32, paddingRight: search ? 32 : 10, borderRadius: 6 }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "hsl(38 25% 42%)", fontSize: 14, lineHeight: 1 }}>✕</button>
          )}
        </div>

        {/* Category tabs (hidden while searching) */}
        {!searching && (
          <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid hsl(38 18% 20%)" }}>
            {(["master", "alt"] as Category[]).map(c => (
              <button key={c} onClick={() => setTab(c)} style={{ flex: 1, paddingBottom: 10, paddingTop: 8, fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", color: tab === c ? "hsl(38 70% 65%)" : "hsl(38 25% 40%)", borderBottom: tab === c ? "2px solid hsl(38 65% 50%)" : "2px solid transparent", marginBottom: -1, transition: "all 0.2s" }}>
                {c === "master" ? "Master Roster" : "Alt Roster"}
              </button>
            ))}
          </div>
        )}

        {/* Search results across both tabs */}
        {searching ? (
          <div>
            {filteredMaster.length === 0 && filteredAlt.length === 0 ? (
              <p style={{ color: "hsl(38 30% 40%)", fontFamily: "Georgia, serif", fontSize: 13, textAlign: "center", opacity: 0.4, paddingTop: 24 }}>No workers match "{search}"</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[...filteredMaster, ...filteredAlt].map(w => <WorkerRow key={w.id} w={w} badge="show" />)}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Add form */}
            <div style={{ background: "hsl(35 20% 13%)", border: "1px solid hsl(38 18% 22%)", borderRadius: 6, padding: 16, marginBottom: 20 }}>
              <p style={{ ...LABEL, marginBottom: 12, fontSize: 11 }}>Add Worker to {tab === "master" ? "Master Roster" : "Alt Roster"}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div><label style={LABEL}>Full Name *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Name" style={INPUT} /></div>
                <div><label style={LABEL}>Role / Title</label><input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Altar Worker" style={INPUT} /></div>
              </div>

              {/* Photo section */}
              <div style={{ marginBottom: 12 }}>
                <label style={LABEL}>Photo</label>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  {/* Preview */}
                  {photoPreview ? (
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <img src={photoPreview} alt="preview" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "1px solid hsl(38 25% 28%)" }} />
                      <button onClick={() => { setPhotoUrl(""); setPhotoPreview(""); }} style={{ position: "absolute", top: -4, right: -4, background: "hsl(0 40% 22%)", border: "1px solid hsl(0 30% 30%)", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(0 60% 70%)", fontSize: 10, lineHeight: 1 }}>✕</button>
                    </div>
                  ) : null}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    {/* Camera buttons */}
                    {!cameraOpen ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setCameraOpen(true)} style={{ flex: 1, background: "hsl(35 22% 16%)", border: "1px solid hsl(38 20% 24%)", color: "hsl(38 50% 58%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.12em", padding: "7px 10px", borderRadius: 4, cursor: "pointer" }}>
                          📷 Camera
                        </button>
                        <button onClick={() => libraryRef.current?.click()} style={{ flex: 1, background: "hsl(38 28% 16%)", border: "1px solid hsl(38 22% 24%)", color: "hsl(38 55% 60%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.12em", padding: "7px 10px", borderRadius: 4, cursor: "pointer" }}>
                          🖼️ Library
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { setCameraOpen(false); frontCamRef.current?.click(); }} style={{ flex: 1, background: "hsl(200 28% 16%)", border: "1px solid hsl(200 22% 24%)", color: "hsl(200 60% 65%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.1em", padding: "7px 8px", borderRadius: 4, cursor: "pointer" }}>
                          🤳 Front
                        </button>
                        <button onClick={() => { setCameraOpen(false); backCamRef.current?.click(); }} style={{ flex: 1, background: "hsl(280 22% 16%)", border: "1px solid hsl(280 18% 24%)", color: "hsl(280 55% 68%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.1em", padding: "7px 8px", borderRadius: 4, cursor: "pointer" }}>
                          📸 Back
                        </button>
                        <button onClick={() => setCameraOpen(false)} style={{ background: "none", border: "1px solid hsl(38 15% 22%)", color: "hsl(38 25% 40%)", fontFamily: "Georgia, serif", fontSize: 11, padding: "7px 8px", borderRadius: 4, cursor: "pointer" }}>✕</button>
                      </div>
                    )}
                    {/* Or URL fallback */}
                    {!photoPreview && (
                      <input value={photoUrl.startsWith("data:") ? "" : photoUrl} onChange={e => { setPhotoUrl(e.target.value); setPhotoPreview(""); }} placeholder="or paste photo URL..." style={{ ...INPUT, fontSize: 11 }} />
                    )}
                  </div>
                </div>
              </div>

              {error && <p style={{ color: "hsl(0 60% 55%)", fontFamily: "Georgia, serif", fontSize: 12, marginBottom: 10 }}>{error}</p>}
              {success && <p style={{ color: "hsl(38 70% 58%)", fontFamily: "Georgia, serif", fontSize: 12, marginBottom: 10 }}>{success}</p>}
              <button onClick={handleAdd} disabled={createWorker.isPending} style={{ background: "hsl(38 50% 28%)", color: "hsl(38 70% 80%)", border: "1px solid hsl(38 38% 35%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", padding: "8px 20px", borderRadius: 4, cursor: "pointer", opacity: createWorker.isPending ? 0.5 : 1 }}>
                {createWorker.isPending ? "Adding..." : "+ Add Worker"}
              </button>
            </div>

            {/* Worker list for active tab */}
            {isLoading ? (
              <p style={{ color: "hsl(38 30% 40%)", fontFamily: "Georgia, serif", fontSize: 13, textAlign: "center", opacity: 0.5, paddingTop: 24 }}>Loading...</p>
            ) : tabWorkers.length === 0 ? (
              <p style={{ color: "hsl(38 30% 40%)", fontFamily: "Georgia, serif", fontSize: 13, textAlign: "center", opacity: 0.4, paddingTop: 24 }}>No workers yet — add one above</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tabWorkers.map(w => <WorkerRow key={w.id} w={w} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
