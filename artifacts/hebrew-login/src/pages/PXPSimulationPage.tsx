import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useGetPxpConfig, useUpdatePxpConfig } from "@workspace/api-client-react";

type SimResponse = { label: string; nextId: string };
type SimNode = {
  id: string;
  title: string;
  text: string;
  isSpine?: boolean;
  spineIndex?: number;
  responses: SimResponse[];
  isTerminal?: boolean;
};
type SimTree = {
  nodes: Record<string, SimNode>;
  startId: string;
  spine: string[];
};

const SPINE_LABELS = ["Greeting", "Visit", "Check-In", "Affirm", "Next Steps", "Prayer", "Close"];

const DEFAULT_TREE: SimTree = {
  startId: "warm-opening",
  spine: ["warm-opening", "reference-moment", "check-in", "affirm", "next-steps", "offer-pray", "close"],
  nodes: {
    "warm-opening": {
      id: "warm-opening", title: "Greeting", isSpine: true, spineIndex: 0,
      text: `"Hi, may I speak with {contact_name}? … Hi {contact_name}! My name is {caller_name}, and I'm a part of the care team at [Church Name]. How are you doing today?"

[If they ask who's calling:]
→ Tap "They ask who's calling" below.`,
      responses: [
        { label: "They answered — doing well", nextId: "reference-moment" },
        { label: "They ask who's calling", nextId: "who-calling" },
        { label: "No answer — leave voicemail", nextId: "voicemail" },
      ],
    },
    "who-calling": {
      id: "who-calling", title: "Who's Calling?", isSpine: false,
      text: `"I'm a volunteer from our church — we just wanted to reach out personally and see how you're doing. Do you have just a couple of minutes?"`,
      responses: [
        { label: "Yes, they have time", nextId: "reference-moment" },
        { label: "They'd rather not talk", nextId: "still-resistant" },
      ],
    },
    "reference-moment": {
      id: "reference-moment", title: "Visit", isSpine: true, spineIndex: 1,
      text: `"We noticed that you came forward during our service on Sunday, and we just want you to know — that step you took was a big deal. We're really glad you were there.

Coming forward takes courage, and it means a lot to our whole church family that you did."`,
      responses: [
        { label: "They remember and are open", nextId: "check-in" },
        { label: "They don't remember coming forward", nextId: "no-remember" },
      ],
    },
    "check-in": {
      id: "check-in", title: "Check-In", isSpine: true, spineIndex: 2,
      text: `"I'd love to hear — how have you been feeling since Sunday? Has anything stood out to you?"`,
      responses: [
        { label: "They share openly", nextId: "affirm" },
        { label: "They're quiet or unsure", nextId: "quiet-prompt" },
        { label: "They're going through something hard", nextId: "crisis" },
        { label: "They're excited & on fire", nextId: "excited" },
      ],
    },
    "quiet-prompt": {
      id: "quiet-prompt", title: "Gentle Prompt", isSpine: false,
      text: `"Sometimes after a moment like that, people feel a mix of things — peace, excitement, maybe even some questions. Is any of that resonating with you?"`,
      responses: [
        { label: "They open up", nextId: "affirm" },
        { label: "Still quiet — move forward", nextId: "affirm" },
      ],
    },
    "affirm": {
      id: "affirm", title: "Affirm", isSpine: true, spineIndex: 3,
      text: `"What you did on Sunday — giving your life to Jesus — that is the most important decision anyone can ever make. Heaven is celebrating you right now. Literally.

This is just the beginning of an incredible journey, and you don't have to figure it out alone. That's exactly why we wanted to call."`,
      responses: [
        { label: "Continue", nextId: "next-steps" },
      ],
    },
    "excited": {
      id: "excited", title: "Excited", isSpine: false,
      text: `"I love that! That joy you're feeling — that's real. That's the Holy Spirit. Let's make sure we keep that momentum going. Can I get you connected with some things that will really help you grow?"`,
      responses: [
        { label: "Yes, they want more!", nextId: "next-steps" },
      ],
    },
    "next-steps": {
      id: "next-steps", title: "Next Steps", isSpine: true, spineIndex: 4,
      text: `"We have a few things we'd love to share with you.

[New Believers Class:] We have a free class that's just for people in your exact shoes. It's super casual, no pressure — just a great way to get some foundations. Would that be something you'd be open to?

[Connect to Community:] We'd also love to connect you with someone who can just be a friend and answer any questions you have along the way. Is that something you'd want?

[Invite Back:] And of course, we'd love to see you back this Sunday. Is there anything that would make it easier for you to come?"`,
      responses: [
        { label: "They're interested — continue to prayer", nextId: "offer-pray" },
        { label: "They're not ready — still continue", nextId: "offer-pray" },
      ],
    },
    "offer-pray": {
      id: "offer-pray", title: "Prayer", isSpine: true, spineIndex: 5,
      text: `"Before I let you go — would it be alright if I said a quick prayer for you right now over the phone? It'll only take a minute."`,
      responses: [
        { label: "Yes — new believer prayer", nextId: "prayer-new-believer" },
        { label: "Yes — prayer for someone in pain", nextId: "prayer-pain" },
        { label: "Yes — general prayer", nextId: "prayer-general" },
        { label: "No thanks", nextId: "close" },
      ],
    },
    "prayer-new-believer": {
      id: "prayer-new-believer", title: "New Believer Prayer", isSpine: false,
      text: `"Father, we come to You right now just so grateful for {contact_name}. Lord, You knew them before they were born, and You drew them to Yourself on Sunday — and we thank You for that. We pray that the decision they made becomes a foundation that nothing can shake. Fill them with Your peace, Your joy, and Your presence. When questions come, let them feel You close. Surround them with people who will love them well and walk alongside them. And Lord, let this be the beginning of the most incredible story. In Jesus' name, amen."`,
      responses: [{ label: "Amen — wrap up", nextId: "close" }],
    },
    "prayer-pain": {
      id: "prayer-pain", title: "Prayer for Pain", isSpine: false,
      text: `"Lord, right now I lift {contact_name} to You. You see every single thing they're carrying, and You care about every piece of it. I pray that right now, in this moment, they feel Your hand on them — that they know they are not alone, not forgotten, and not without hope. Give them supernatural strength for what's ahead. Send them the right people, the right help, and the right words at exactly the right time. You are a good Father, and I trust You with {contact_name}. In Jesus' name, amen."`,
      responses: [{ label: "Amen — wrap up", nextId: "close" }],
    },
    "prayer-general": {
      id: "prayer-general", title: "General Prayer", isSpine: false,
      text: `"Lord, thank You for {contact_name}. I pray right now that wherever they are, whatever they're facing, they feel Your love surrounding them. Keep them close to You. Guide their steps. And let what happened on Sunday be something they carry with them for the rest of their life. In Jesus' name, amen."`,
      responses: [{ label: "Amen — wrap up", nextId: "close" }],
    },
    "close": {
      id: "close", title: "Close", isSpine: true, spineIndex: 6, isTerminal: true,
      text: `"{contact_name}, it was so good talking to you today. You matter to us, and you matter to God. Please don't hesitate to reach out if you ever need anything — we're here for you.

I'll follow up with info on [next step mentioned]. We're rooting for you!"`,
      responses: [],
    },
    "no-remember": {
      id: "no-remember", title: "Doesn't Remember", isSpine: false,
      text: `"No worries at all! We just like to reach out to anyone who visited or connected with us. We're glad you came. Is there anything we can do for you or pray about with you today?"`,
      responses: [
        { label: "They have a need or question", nextId: "offer-pray" },
        { label: "They're all good — wrap up", nextId: "close" },
      ],
    },
    "crisis": {
      id: "crisis", title: "In Crisis", isSpine: false,
      text: `"I'm so glad you shared that with me. That sounds really hard, and I don't want to rush past it. Can you tell me a little more about what's been going on?"`,
      responses: [
        { label: "They share more", nextId: "crisis-escalate" },
        { label: "They'd rather not say", nextId: "offer-pray" },
      ],
    },
    "crisis-escalate": {
      id: "crisis-escalate", title: "Escalate", isSpine: false,
      text: `"I want to make sure you get the right support. Would it be okay if I connected you with one of our pastors? They're really great and would love to talk with you personally."`,
      responses: [
        { label: "Yes, connect them to a pastor", nextId: "offer-pray" },
        { label: "No — they just want prayer", nextId: "offer-pray" },
      ],
    },
    "still-resistant": {
      id: "still-resistant", title: "Ended Early", isSpine: false, isTerminal: true,
      text: `"That's completely okay. I'll let you go — but I do want you to know our doors are always open, and you're always welcome."`,
      responses: [],
    },
    "voicemail": {
      id: "voicemail", title: "Voicemail", isSpine: false, isTerminal: true,
      text: `"Hi {contact_name}, this is {caller_name} calling from [Church Name]. I just wanted to reach out personally and say how glad we are that you were with us on Sunday. You matter to us and we're thinking of you. Feel free to call or text me back anytime — no pressure at all. Hope to connect with you soon. God bless!"`,
      responses: [],
    },
  },
};

function fillPlaceholders(text: string): React.ReactNode {
  const parts = text.split(/(\{[^}]+\})/g);
  return parts.map((part, i) =>
    part.startsWith("{") && part.endsWith("}") ? (
      <span key={i} style={{ color: "hsl(270 70% 72%)", fontStyle: "italic" }}>
        {part.replace("{contact_name}", "[Contact Name]")
          .replace("{caller_name}", "[Caller Name]")
          .replace("{campus}", "[Campus]")}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function PXPSimulationPage() {
  const [, navigate] = useLocation();
  const { data: configData } = useGetPxpConfig();
  const updateConfig = useUpdatePxpConfig();

  const [tree, setTree] = useState<SimTree | null>(null);
  const [history, setHistory] = useState<string[]>(["warm-opening"]);
  const [activeSpineIndex, setActiveSpineIndex] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  const currentId = history[history.length - 1];

  useEffect(() => {
    if (!configData) return;
    const raw = configData.scriptTree as any;
    if (raw?.nodes && raw?.startId && raw?.spine) {
      setTree(raw as SimTree);
    } else {
      setTree(DEFAULT_TREE);
      updateConfig.mutate({ data: { scriptTree: DEFAULT_TREE as unknown as Record<string, unknown> } });
    }
  }, [configData]);

  useEffect(() => {
    if (!tree) return;
    const node = tree.nodes[currentId];
    if (node?.isSpine && node.spineIndex !== undefined) {
      setActiveSpineIndex(node.spineIndex);
    }
  }, [currentId, tree]);

  useEffect(() => {
    if (progressRef.current) {
      const active = progressRef.current.querySelector("[data-active='true']") as HTMLElement;
      active?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeSpineIndex]);

  function navigate_to(nextId: string) {
    setHistory(h => [...h, nextId]);
    setEditingId(null);
    setSaved(false);
  }

  function goBack() {
    if (history.length <= 1) return;
    setHistory(h => h.slice(0, -1));
    setEditingId(null);
    setSaved(false);
  }

  function restart() {
    if (!tree) return;
    setHistory([tree.startId]);
    setActiveSpineIndex(0);
    setEditingId(null);
    setSaved(false);
  }

  function startEdit(node: SimNode) {
    setEditingId(node.id);
    setEditText(node.text);
    setSaved(false);
  }

  async function saveEdit() {
    if (!tree || !editingId) return;
    setSaving(true);
    const updated: SimTree = {
      ...tree,
      nodes: {
        ...tree.nodes,
        [editingId]: { ...tree.nodes[editingId], text: editText },
      },
    };
    setTree(updated);
    await updateConfig.mutateAsync({ data: { scriptTree: updated as unknown as Record<string, unknown> } });
    setSaving(false);
    setSaved(true);
    setEditingId(null);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!tree) {
    return (
      <div style={{ background: "hsl(270 8% 3%)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "hsl(270 20% 42%)", fontFamily: "Georgia, serif", fontSize: 13 }}>Loading simulation…</span>
      </div>
    );
  }

  const node = tree.nodes[currentId];
  if (!node) return null;

  const isOnSpine = !!node.isSpine;
  const isBranch = !isOnSpine && !node.isTerminal;

  return (
    <div style={{ background: "hsl(270 8% 3%)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Fixed top bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "hsl(270 10% 4% / 0.96)", borderBottom: "1px solid hsl(270 20% 12%)", backdropFilter: "blur(8px)" }}>
        
        {/* Nav row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 8px" }}>
          <button
            onClick={() => navigate("/admin/pxp")}
            style={{ color: "hsl(270 45% 68%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", background: "hsl(270 20% 9%)", border: "1px solid hsl(270 30% 22%)", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}
          >
            ← PXP
          </button>
          <span style={{ color: "hsl(270 40% 62%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase" }}>
            Simulation
          </span>
          <button
            onClick={restart}
            title="Restart"
            style={{ color: "hsl(270 35% 52%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", background: "hsl(270 20% 9%)", border: "1px solid hsl(270 20% 18%)", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}
          >
            ↺ Restart
          </button>
        </div>

        {/* Progress bar */}
        <div
          ref={progressRef}
          style={{ display: "flex", alignItems: "flex-start", overflowX: "auto", padding: "0 16px 12px", gap: 0, scrollbarWidth: "none" }}
        >
          {tree.spine.map((spineId, idx) => {
            const isCompleted = idx < activeSpineIndex;
            const isCurrent = idx === activeSpineIndex;
            const isUpcoming = idx > activeSpineIndex;
            const label = SPINE_LABELS[idx] ?? tree.nodes[spineId]?.title ?? "";

            return (
              <div key={spineId} style={{ display: "flex", alignItems: "flex-start", flexShrink: 0 }} data-active={isCurrent ? "true" : "false"}>
                {/* Step */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 56 }}>
                  <div style={{
                    width: isCurrent ? 22 : 16,
                    height: isCurrent ? 22 : 16,
                    borderRadius: "50%",
                    border: `2px solid ${isCompleted ? "hsl(270 55% 48%)" : isCurrent ? "hsl(270 70% 68%)" : "hsl(270 20% 22%)"}`,
                    background: isCompleted ? "hsl(270 55% 28%)" : isCurrent ? "hsl(270 65% 42%)" : "transparent",
                    boxShadow: isCurrent ? "0 0 12px hsl(270 65% 42% / 0.6)" : "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.25s",
                    flexShrink: 0,
                  }}>
                    {isCompleted && <span style={{ color: "hsl(270 80% 88%)", fontSize: 9, lineHeight: 1 }}>✓</span>}
                    {isCurrent && !isOnSpine && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "hsl(270 80% 82%)", display: "block" }} />}
                    {isCurrent && isOnSpine && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "white", display: "block" }} />}
                  </div>
                  <span style={{
                    fontFamily: "Georgia, serif",
                    fontSize: 9,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: isCompleted ? "hsl(270 45% 55%)" : isCurrent ? "hsl(270 65% 78%)" : "hsl(270 15% 30%)",
                    marginTop: 5,
                    textAlign: "center",
                    lineHeight: 1.3,
                    width: 56,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    transition: "color 0.25s",
                  }}>
                    {label}
                  </span>
                </div>

                {/* Connector line */}
                {idx < tree.spine.length - 1 && (
                  <div style={{
                    width: 24, height: 2, marginTop: 7, flexShrink: 0,
                    background: idx < activeSpineIndex
                      ? "hsl(270 55% 38%)"
                      : "hsl(270 15% 16%)",
                    transition: "background 0.25s",
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Branch indicator strip */}
        {isBranch && (
          <div style={{ padding: "4px 16px 8px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "hsl(38 65% 55%)" }} />
            <span style={{ color: "hsl(38 55% 55%)", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Branch · {node.title}
            </span>
          </div>
        )}
        {node.isTerminal && (
          <div style={{ padding: "4px 16px 8px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "hsl(145 55% 42%)" }} />
            <span style={{ color: "hsl(145 45% 48%)", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase" }}>
              End of this path
            </span>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, paddingTop: isBranch || node.isTerminal ? 166 : 142, paddingBottom: 40, maxWidth: 520, margin: "0 auto", width: "100%", padding: `${isBranch || node.isTerminal ? 166 : 142}px 16px 40px` }}>

        {/* Script card */}
        <div style={{ background: "hsl(270 14% 7%)", border: `1px solid ${isOnSpine ? "hsl(270 40% 24%)" : node.isTerminal ? "hsl(145 30% 18%)" : "hsl(38 35% 20%)"}`, borderRadius: 14, padding: "20px 20px 16px", marginBottom: 20, position: "relative" }}>
          
          {/* Node title + edit button */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: isOnSpine ? "hsl(270 50% 58%)" : node.isTerminal ? "hsl(145 40% 42%)" : "hsl(38 50% 50%)" }}>
              {isOnSpine ? `Step ${(node.spineIndex ?? 0) + 1} · ${node.title}` : node.title}
            </span>
            {editingId === node.id ? null : (
              <button
                onClick={() => startEdit(node)}
                title="Edit this step"
                style={{ background: "none", border: "1px solid hsl(270 20% 18%)", borderRadius: 6, color: "hsl(270 30% 44%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.12em", padding: "3px 10px", cursor: "pointer" }}
              >
                ✎ Edit
              </button>
            )}
          </div>

          {/* Script text or editor */}
          {editingId === node.id ? (
            <div>
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                autoFocus
                style={{
                  width: "100%", minHeight: 160, padding: "12px 14px", borderRadius: 8,
                  border: "1px solid hsl(270 40% 30%)", background: "hsl(270 10% 4%)",
                  color: "hsl(270 35% 88%)", fontFamily: "Georgia, serif", fontSize: 14,
                  lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box",
                }}
              />
              <p style={{ color: "hsl(270 20% 38%)", fontFamily: "Georgia, serif", fontSize: 10, margin: "6px 0 12px", letterSpacing: "0.05em" }}>
                Use <code style={{ color: "hsl(270 55% 65%)" }}>{"{contact_name}"}</code>, <code style={{ color: "hsl(270 55% 65%)" }}>{"{caller_name}"}</code> as placeholders
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 8,
                    background: "linear-gradient(135deg, hsl(270 60% 42%), hsl(270 55% 30%))",
                    border: "1px solid hsl(270 55% 46%)",
                    color: "hsl(270 20% 95%)", fontFamily: "Georgia, serif", fontSize: 11,
                    letterSpacing: "0.18em", textTransform: "uppercase", cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  style={{
                    padding: "10px 18px", borderRadius: 8,
                    background: "transparent", border: "1px solid hsl(270 20% 18%)",
                    color: "hsl(270 25% 44%)", fontFamily: "Georgia, serif", fontSize: 11,
                    letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p style={{ fontFamily: "Georgia, serif", fontSize: 15, lineHeight: 1.8, color: "hsl(270 25% 80%)", margin: 0, whiteSpace: "pre-wrap" }}>
              {fillPlaceholders(node.text)}
            </p>
          )}
        </div>

        {/* Saved toast */}
        {saved && (
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: 11, color: "hsl(145 55% 52%)", letterSpacing: "0.15em" }}>✓ Saved</span>
          </div>
        )}

        {/* Response buttons */}
        {editingId !== node.id && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {node.responses.length > 0 ? (
              <>
                <p style={{ fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "hsl(270 15% 36%)", margin: "0 0 2px 2px" }}>
                  How did they respond?
                </p>
                {node.responses.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => navigate_to(r.nextId)}
                    style={{
                      width: "100%", padding: "14px 18px", borderRadius: 10, textAlign: "left",
                      background: "hsl(270 18% 9%)", border: "1px solid hsl(270 25% 18%)",
                      color: "hsl(270 40% 80%)", fontFamily: "Georgia, serif", fontSize: 13,
                      letterSpacing: "0.04em", cursor: "pointer", transition: "all 0.15s",
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = "hsl(270 28% 13%)"; e.currentTarget.style.borderColor = "hsl(270 40% 28%)"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "hsl(270 18% 9%)"; e.currentTarget.style.borderColor = "hsl(270 25% 18%)"; }}
                  >
                    <span>{r.label}</span>
                    <span style={{ color: "hsl(270 30% 42%)", flexShrink: 0 }}>→</span>
                  </button>
                ))}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ color: "hsl(145 55% 48%)", fontSize: 28, marginBottom: 10 }}>
                  {node.id === "close" ? "🙏" : node.id === "voicemail" ? "📞" : "✓"}
                </div>
                <p style={{ color: "hsl(270 30% 55%)", fontFamily: "Georgia, serif", fontSize: 14, letterSpacing: "0.08em", margin: "0 0 20px" }}>
                  {node.id === "close" ? "Call complete." : node.id === "voicemail" ? "Voicemail left." : "Call ended."}
                </p>
                <button
                  onClick={restart}
                  style={{
                    padding: "12px 32px", borderRadius: 10,
                    background: "hsl(270 28% 12%)", border: "1px solid hsl(270 35% 24%)",
                    color: "hsl(270 55% 72%)", fontFamily: "Georgia, serif", fontSize: 12,
                    letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer",
                  }}
                >
                  ↺ Run Again
                </button>
              </div>
            )}

            {/* Back button */}
            {history.length > 1 && (
              <button
                onClick={goBack}
                style={{
                  marginTop: 8, width: "100%", padding: "10px 0", borderRadius: 8,
                  background: "transparent", border: "1px solid hsl(270 15% 14%)",
                  color: "hsl(270 20% 38%)", fontFamily: "Georgia, serif", fontSize: 11,
                  letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer",
                }}
              >
                ← Back to Previous Step
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
