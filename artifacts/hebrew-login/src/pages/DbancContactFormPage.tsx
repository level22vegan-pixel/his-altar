import { useEffect, useState } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import {
  useCreateDbancContact,
  useUpdateDbancContact,
  useGetDbancContact,
  useListDbancCustomFields,
} from "@workspace/api-client-react";
import { getValidCampusSession } from "@/lib/session";

const CAMPUSES = ["HALLMARK", "ARROWHEAD", "RIVERSIDE", "POMONA", "LA", "ARIZONA"];
const CARRIERS = ["AT&T", "Verizon", "T-Mobile", "Metro PCS", "Boost", "Cricket", "Other"];
const GENDERS = ["Male", "Female", "Prefer not to say"];
const PRAYER_TYPES = ["Salvation", "Recommitment", "Came for Prayer"];

const CAMPUS_SERVICES: Record<string, string[]> = {
  HALLMARK:  ["Sunday 8am", "Sunday 10am", "Sunday 12pm", "Wednesday 7pm"],
  ARROWHEAD: ["Sunday 10am", "Sunday 12pm", "Wednesday 7pm"],
  RIVERSIDE: ["Sunday 10am", "Sunday 12pm"],
  POMONA:    ["Sunday 9am", "Sunday 11am", "Wednesday 7pm"],
  LA:        ["Sunday 8am", "Sunday 9am", "Wednesday 7pm"],
  ARIZONA:   ["Sunday 9am", "Sunday 11am", "Wednesday 7pm"],
};

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid hsl(220 40% 26%)",
  background: "hsl(220 50% 10%)",
  color: "hsl(0 0% 92%)",
  fontFamily: "Georgia, serif",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box" as const,
};

const labelStyle = {
  display: "block" as const,
  color: "hsl(220 40% 65%)",
  fontFamily: "Georgia, serif",
  fontSize: 11,
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  marginBottom: 6,
};

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  carrier: string;
  gender: string;
  campus: string;
  serviceTime: string;
  prayerType: string;
  serviceDate: string;
  notes: string;
  customData: Record<string, string>;
}

function localDateStr(d?: Date): string {
  const date = d ?? new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Auto-compute the nearest service date for a given service time string.
// "Sunday *" → nearest Sunday (today if Sunday, else next Sunday)
// "Wednesday *" → nearest Wednesday (today if Wed, else next)
// fallback → today
function serviceDateForTime(serviceTime: string): string {
  const d = new Date();
  const dow = d.getDay(); // 0=Sun, 3=Wed
  if (serviceTime.toLowerCase().startsWith("sunday")) {
    const diff = dow === 0 ? 0 : 7 - dow;
    const target = new Date(d);
    target.setDate(d.getDate() + diff);
    return localDateStr(target);
  }
  if (serviceTime.toLowerCase().startsWith("wednesday")) {
    const diff = dow <= 3 ? 3 - dow : 10 - dow;
    const target = new Date(d);
    target.setDate(d.getDate() + diff);
    return localDateStr(target);
  }
  return localDateStr(d);
}

export default function DbancContactFormPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isEdit = !!params.id;

  const search        = useSearch();
  const campusSession = getValidCampusSession();
  const lockedCampus  = campusSession?.campus ?? null;
  const isPublic      = new URLSearchParams(search).get("public") === "1";

  const { data: existingData } = useGetDbancContact(
    parseInt(params.id ?? "0"),
    { query: { enabled: isEdit, queryKey: [`/api/dbanc/contacts/${params.id}`] } }
  );
  const { data: fieldsData } = useListDbancCustomFields();
  const createContact = useCreateDbancContact();
  const updateContact = useUpdateDbancContact();

  const [form, setForm] = useState<FormData>({
    firstName: "",
    lastName: "",
    phone: "",
    carrier: "",
    gender: "",
    campus: lockedCampus ?? "",
    serviceTime: "",
    prayerType: "",
    serviceDate: localDateStr(),
    notes: "",
    customData: {},
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (existingData) {
      setForm({
        firstName: existingData.firstName,
        lastName: existingData.lastName,
        phone: existingData.phone,
        carrier: existingData.carrier,
        gender: existingData.gender,
        campus: existingData.campus,
        serviceTime: existingData.serviceTime ?? "",
        prayerType: existingData.prayerType ?? "",
        serviceDate: (existingData as unknown as Record<string, unknown>).serviceDate as string ?? localDateStr(),
        notes: existingData.notes,
        customData: (existingData.customData as Record<string, string>) ?? {},
      });
    }
  }, [existingData]);

  const customFields = fieldsData?.fields ?? [];

  function setField(key: keyof Omit<FormData, "customData">, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function setCustomField(key: string, val: string) {
    setForm(f => ({ ...f, customData: { ...f.customData, [key]: val } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || !form.serviceTime || !form.prayerType) {
      setError("First name, last name, phone, service time, and prayer type are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (isEdit) {
        await updateContact.mutateAsync({ id: parseInt(params.id!), data: form });
      } else {
        await createContact.mutateAsync({ data: form });
      }
      navigate(isPublic ? "/" : "/admin/dbanc");
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
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

      {!isPublic && (
        <button
          onClick={() => navigate("/admin/dbanc")}
          className="absolute top-5 left-6 z-20 text-xs tracking-widest uppercase opacity-50 hover:opacity-90 transition-opacity"
          style={{ color: "hsl(0 0% 90%)", fontFamily: "Georgia, serif", background: "none", border: "none", cursor: "pointer" }}
        >
          ← Dbanc
        </button>
      )}

      <div className="relative z-10 w-full max-w-xl px-4 pt-14 pb-20">
        <div className="text-center mb-8">
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.4rem, 4vw, 2rem)", color: "hsl(0 0% 97%)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            {isEdit ? "Edit Contact" : "New Contact"}
          </h1>
          <div style={{ width: 50, height: 2, background: "linear-gradient(90deg, hsl(0 72% 50%), hsl(0 0% 95%), hsl(220 70% 50%))", margin: "8px auto 0" }} />
          <p style={{ color: "hsl(220 40% 60%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", marginTop: 6, textTransform: "uppercase" }}>
            Prayer Contact Information
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Name row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>First Name *</label>
              <input style={inputStyle} value={form.firstName} onChange={e => setField("firstName", e.target.value)} placeholder="First name" />
            </div>
            <div>
              <label style={labelStyle}>Last Name *</label>
              <input style={inputStyle} value={form.lastName} onChange={e => setField("lastName", e.target.value)} placeholder="Last name" />
            </div>
          </div>

          {/* Phone + Carrier */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Phone *</label>
              <input style={inputStyle} value={form.phone} onChange={e => setField("phone", e.target.value)} placeholder="(555) 000-0000" type="tel" />
            </div>
            <div>
              <label style={labelStyle}>Mobile Carrier</label>
              <select
                style={{ ...inputStyle, appearance: "none" as const }}
                value={form.carrier}
                onChange={e => setField("carrier", e.target.value)}
              >
                <option value="">Select carrier…</option>
                {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Gender + Campus */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Gender</label>
              <select style={{ ...inputStyle, appearance: "none" as const }} value={form.gender} onChange={e => setField("gender", e.target.value)}>
                <option value="">Select…</option>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Campus</label>
              {lockedCampus ? (
                <div style={{ ...inputStyle, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: 0.8 }}>
                  <span style={{ color: "hsl(220 60% 78%)" }}>{lockedCampus}</span>
                  <span style={{ color: "hsl(220 30% 48%)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>Locked</span>
                </div>
              ) : (
                <select
                  style={{ ...inputStyle, appearance: "none" as const }}
                  value={form.campus}
                  onChange={e => { setField("campus", e.target.value); setField("serviceTime", ""); }}
                >
                  <option value="">Select campus…</option>
                  {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Service Time */}
          <div>
            <label style={labelStyle}>Service Time *</label>
            <select
              style={{
                ...inputStyle,
                appearance: "none" as const,
                borderColor: !form.serviceTime ? "hsl(220 55% 38%)" : "hsl(220 40% 26%)",
              }}
              value={form.serviceTime}
              onChange={e => { setField("serviceTime", e.target.value); if (e.target.value) setField("serviceDate", serviceDateForTime(e.target.value)); }}
            >
              <option value="">Select service time…</option>
              {(CAMPUS_SERVICES[form.campus] ?? Object.values(CAMPUS_SERVICES).flat().filter((v, i, a) => a.indexOf(v) === i).sort()).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Prayer Type */}
          <div>
            <label style={labelStyle}>
              Prayer Type *
            </label>
            <select
              style={{
                ...inputStyle,
                appearance: "none" as const,
              }}
              value={form.prayerType}
              onChange={e => setField("prayerType", e.target.value)}
            >
              <option value="">Select prayer type…</option>
              {PRAYER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Prayer Notes</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" as const }}
              value={form.notes}
              onChange={e => setField("notes", e.target.value)}
              placeholder="Optional"
            />
          </div>

          {/* Custom fields */}
          {customFields.length > 0 && (
            <div style={{ borderTop: "1px solid hsl(220 30% 20%)", paddingTop: 18 }}>
              <p style={{ ...labelStyle, marginBottom: 14, color: "hsl(220 40% 50%)" }}>Additional Information</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {customFields.map(field => (
                  <div key={field.id}>
                    <label style={labelStyle}>{field.label}</label>
                    {field.fieldType === "select" ? (
                      <select
                        style={{ ...inputStyle, appearance: "none" as const }}
                        value={form.customData[field.label] ?? ""}
                        onChange={e => setCustomField(field.label, e.target.value)}
                      >
                        <option value="">Select…</option>
                        {(field.options as string[]).map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.fieldType === "boolean" ? (
                      <select
                        style={{ ...inputStyle, appearance: "none" as const }}
                        value={form.customData[field.label] ?? ""}
                        onChange={e => setCustomField(field.label, e.target.value)}
                      >
                        <option value="">Select…</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    ) : (
                      <input
                        style={inputStyle}
                        value={form.customData[field.label] ?? ""}
                        onChange={e => setCustomField(field.label, e.target.value)}
                        placeholder={field.label}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p style={{ color: "hsl(0 65% 62%)", fontFamily: "Georgia, serif", fontSize: 12, textAlign: "center" }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            {isEdit && (
              <button
                type="button"
                onClick={() => navigate("/admin/dbanc")}
                style={{
                  flex: "0 0 auto",
                  padding: "13px 20px",
                  borderRadius: 10,
                  background: "none",
                  color: "hsl(0 0% 65%)",
                  fontFamily: "Georgia, serif",
                  fontSize: 13,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  border: "1px solid hsl(0 0% 28%)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: "13px 0",
                borderRadius: 10,
                background: saving ? "hsl(220 30% 18%)" : "linear-gradient(135deg, hsl(220 65% 34%), hsl(220 60% 26%))",
                color: "hsl(0 0% 97%)",
                fontFamily: "Georgia, serif",
                fontSize: 13,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                border: "1px solid hsl(220 50% 40%)",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
