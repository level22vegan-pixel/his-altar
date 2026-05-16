import { useEffect, useState, useRef } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import {
  useCreateDbancContact,
  useUpdateDbancContact,
  useGetDbancContact,
  useListDbancContacts,
  useListDbancCustomFields,
  useListWorkers,
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
  border: "1px solid hsl(215 30% 68%)",
  background: "hsl(215 30% 97%)",
  color: "hsl(215 55% 25%)",
  fontFamily: "Georgia, serif",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box" as const,
};

const labelStyle = {
  display: "block" as const,
  color: "hsl(215 45% 38%)",
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
  prayedForBy: string;
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
    prayedForBy: "",
    notes: "",
    customData: {},
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Worker search for "Prayed For By" field
  const [workerQuery, setWorkerQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const workerInputRef = useRef<HTMLInputElement>(null);

  const { data: masterData } = useListWorkers(
    { category: "master", campus: form.campus || undefined },
    { query: { enabled: !!form.campus, queryKey: ["workers-master", form.campus] } }
  );
  const { data: contactsData } = useListDbancContacts(
    { campus: form.campus || undefined },
    { query: { enabled: !!form.campus, queryKey: ["dbanc-contacts-campus", form.campus] } }
  );

  const allWorkerNames: string[] = [
    ...(masterData?.workers ?? []).map(w => w.name),
    ...(contactsData?.contacts ?? []).map(c => c.prayedForBy).filter((n): n is string => !!n),
  ].filter((n, i, a) => a.indexOf(n) === i).sort();

  const filteredWorkers = workerQuery.trim()
    ? allWorkerNames.filter(n => n.toLowerCase().includes(workerQuery.toLowerCase()))
    : allWorkerNames;

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
        prayedForBy: existingData.prayedForBy ?? "",
        notes: existingData.notes,
        customData: (existingData.customData as Record<string, string>) ?? {},
      });
      setWorkerQuery(existingData.prayedForBy ?? "");
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
      style={{ background: "linear-gradient(160deg, hsl(215 28% 90%) 0%, hsl(215 22% 84%) 60%, hsl(220 20% 88%) 100%)" }}
    >
      {!isPublic && (
        <button
          onClick={() => navigate("/admin/dbanc")}
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
          ← Dbanc
        </button>
      )}

      <div className="relative z-10 w-full max-w-xl px-4 pt-14 pb-20">
        <div className="text-center mb-8">
          <h1 style={{
            fontFamily: "Georgia, serif", fontSize: "clamp(1.4rem, 4vw, 2rem)",
            letterSpacing: "0.2em", textTransform: "uppercase",
            background: "linear-gradient(135deg, hsl(215 70% 38%), hsl(225 65% 52%))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            {isEdit ? "Edit Contact" : "New Contact"}
          </h1>
          <div style={{ width: 50, height: 2, background: "linear-gradient(90deg, hsl(215 65% 45%), hsl(225 70% 58%))", margin: "8px auto 0" }} />
          <p style={{ color: "hsl(215 42% 42%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", marginTop: 6, textTransform: "uppercase" }}>
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
                  <span style={{ color: "hsl(215 60% 30%)" }}>{lockedCampus}</span>
                  <span style={{ color: "hsl(215 35% 50%)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>Locked</span>
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
                borderColor: !form.serviceTime ? "hsl(215 55% 50%)" : "hsl(215 30% 68%)",
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

          {/* Altar Worker */}
          <div>
            <label style={labelStyle}>Altar Worker</label>
            <input
              ref={workerInputRef}
              style={{
                ...inputStyle,
                borderRadius: showSuggestions && filteredWorkers.length > 0 ? "8px 8px 0 0" : 8,
              }}
              value={workerQuery}
              onChange={e => {
                setWorkerQuery(e.target.value);
                setField("prayedForBy", e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder={form.campus ? "Search roster or type a name…" : "Select campus first to see roster suggestions…"}
              autoComplete="off"
            />
            {showSuggestions && filteredWorkers.length > 0 && (
              <div style={{
                background: "hsl(215 30% 97%)",
                border: "1px solid hsl(215 30% 68%)",
                borderTop: "none",
                borderRadius: "0 0 8px 8px",
                maxHeight: 200,
                overflowY: "auto",
              }}>
                {filteredWorkers.map(name => (
                  <button
                    key={name}
                    type="button"
                    onMouseDown={() => {
                      setWorkerQuery(name);
                      setField("prayedForBy", name);
                      setShowSuggestions(false);
                    }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "10px 14px", background: "none", border: "none",
                      color: "hsl(215 55% 28%)", fontFamily: "Georgia, serif", fontSize: 13,
                      cursor: "pointer", borderBottom: "1px solid hsl(215 28% 80%)",
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = "hsl(215 40% 88%)"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "none"; }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
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
            <div style={{ borderTop: "1px solid hsl(215 28% 72%)", paddingTop: 18 }}>
              <p style={{ ...labelStyle, marginBottom: 14, color: "hsl(215 42% 42%)" }}>Additional Information</p>
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
                background: saving ? "hsl(215 30% 72%)" : "linear-gradient(135deg, hsl(215 60% 40%), hsl(215 55% 30%))",
                color: "hsl(0 0% 100%)",
                fontFamily: "Georgia, serif",
                fontSize: 13,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                border: "1px solid hsl(215 50% 48%)",
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
