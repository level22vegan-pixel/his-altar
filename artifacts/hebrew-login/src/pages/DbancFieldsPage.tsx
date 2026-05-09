import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListDbancCustomFields,
  useCreateDbancCustomField,
  useDeleteDbancCustomField,
} from "@workspace/api-client-react";

const inputStyle = {
  padding: "9px 13px",
  borderRadius: 7,
  border: "1px solid hsl(220 40% 26%)",
  background: "hsl(220 50% 10%)",
  color: "hsl(0 0% 92%)",
  fontFamily: "Georgia, serif",
  fontSize: 13,
  outline: "none",
};

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "select", label: "Dropdown" },
  { value: "boolean", label: "Yes / No" },
];

export default function DbancFieldsPage() {
  const [, navigate] = useLocation();
  const { data, refetch } = useListDbancCustomFields();
  const createField = useCreateDbancCustomField();
  const deleteField = useDeleteDbancCustomField();

  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [optionsRaw, setOptionsRaw] = useState("");
  const [saving, setSaving] = useState(false);

  const fields = data?.fields ?? [];

  async function handleAdd() {
    if (!label.trim()) return;
    setSaving(true);
    const options = fieldType === "select"
      ? optionsRaw.split(",").map(s => s.trim()).filter(Boolean)
      : [];
    await createField.mutateAsync({
      data: { label: label.trim(), fieldType, options, sortOrder: fields.length },
    });
    setLabel("");
    setOptionsRaw("");
    setFieldType("text");
    setSaving(false);
    refetch();
  }

  async function handleDelete(id: number, lbl: string) {
    if (!confirm(`Remove "${lbl}" from custom fields? This won't delete existing contact data.`)) return;
    await deleteField.mutateAsync({ id });
    refetch();
  }

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-start overflow-hidden"
      style={{ background: "linear-gradient(160deg, hsl(220 65% 14%) 0%, hsl(220 55% 10%) 40%, hsl(0 60% 14%) 100%)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-2" style={{ background: "hsl(0 72% 45%)" }} />
      <div className="absolute top-2 left-0 right-0 h-1" style={{ background: "hsl(0 0% 95%)" }} />
      <div className="absolute bottom-0 left-0 right-0 h-2" style={{ background: "hsl(0 72% 45%)" }} />
      <div className="absolute bottom-2 left-0 right-0 h-1" style={{ background: "hsl(0 0% 95%)" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, hsl(0 0% 100% / 0.3) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

      <button
        onClick={() => navigate("/admin/dbanc")}
        className="absolute top-5 left-6 z-10 text-xs tracking-widest uppercase opacity-50 hover:opacity-90 transition-opacity"
        style={{ color: "hsl(0 0% 90%)", fontFamily: "Georgia, serif", background: "none", border: "none", cursor: "pointer" }}
      >
        ← Dbanc
      </button>

      <div className="relative z-10 w-full max-w-xl px-4 pt-14 pb-20">
        <div className="text-center mb-8">
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.4rem, 4vw, 2rem)", color: "hsl(0 0% 97%)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Custom Fields
          </h1>
          <div style={{ width: 50, height: 2, background: "linear-gradient(90deg, hsl(0 72% 50%), hsl(0 0% 95%), hsl(220 70% 50%))", margin: "8px auto 0" }} />
          <p style={{ color: "hsl(220 40% 60%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", marginTop: 6, textTransform: "uppercase" }}>
            Additional contact information fields
          </p>
        </div>

        {/* Add new field form */}
        <div style={{ background: "hsl(220 40% 10% / 0.8)", border: "1px solid hsl(220 30% 22%)", borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <p style={{ color: "hsl(220 40% 60%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14 }}>Add New Field</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
              placeholder="Field label (e.g. Salvation Date, Member Status)"
              value={label}
              onChange={e => setLabel(e.target.value)}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <select
                style={{ ...inputStyle, appearance: "none" as const }}
                value={fieldType}
                onChange={e => setFieldType(e.target.value)}
              >
                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>

              {fieldType === "select" && (
                <input
                  style={inputStyle}
                  placeholder="Options (comma-separated)"
                  value={optionsRaw}
                  onChange={e => setOptionsRaw(e.target.value)}
                />
              )}
            </div>

            <button
              onClick={handleAdd}
              disabled={saving || !label.trim()}
              style={{
                padding: "10px 0",
                borderRadius: 8,
                background: !label.trim() ? "hsl(220 25% 16%)" : "linear-gradient(135deg, hsl(220 65% 34%), hsl(220 60% 26%))",
                color: "hsl(0 0% 97%)",
                fontFamily: "Georgia, serif",
                fontSize: 12,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                border: "1px solid hsl(220 40% 32%)",
                cursor: !label.trim() ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Adding…" : "Add Field"}
            </button>
          </div>
        </div>

        {/* Existing fields */}
        <div style={{ borderRadius: 10, border: "1px solid hsl(220 30% 22%)", background: "hsl(220 50% 10% / 0.7)", overflow: "hidden" }}>
          {fields.length === 0 ? (
            <div style={{ padding: 36, textAlign: "center", color: "hsl(220 30% 40%)", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.1em" }}>
              No custom fields yet
            </div>
          ) : (
            fields.map((f, i) => (
              <div
                key={f.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "14px 18px",
                  borderBottom: i < fields.length - 1 ? "1px solid hsl(220 30% 16%)" : "none",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ color: "hsl(0 0% 92%)", fontFamily: "Georgia, serif", fontSize: 14 }}>{f.label}</div>
                  <div style={{ color: "hsl(220 35% 50%)", fontFamily: "Georgia, serif", fontSize: 11, marginTop: 2 }}>
                    {FIELD_TYPES.find(t => t.value === f.fieldType)?.label ?? f.fieldType}
                    {f.fieldType === "select" && (f.options as string[]).length > 0 && (
                      <span> · {(f.options as string[]).join(", ")}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(f.id, f.label)}
                  style={{ padding: "5px 10px", borderRadius: 6, background: "hsl(0 50% 18%)", border: "1px solid hsl(0 40% 28%)", color: "hsl(0 60% 65%)", fontFamily: "Georgia, serif", fontSize: 11, cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
