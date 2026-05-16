import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetPxpConfig, useUpdatePxpConfig } from "@workspace/api-client-react";

type ScriptNode = {
  id: string;
  text: string;
  isTerminal?: boolean;
  responses: Array<{
    id: string;
    label: string;
    text: string;
    isTerminal?: boolean;
    responses: ScriptNode["responses"];
  }>;
};

function NodeEditor({
  node,
  depth,
  path,
  onUpdate,
}: {
  node: ScriptNode;
  depth: number;
  path: string;
  onUpdate: (path: string, field: "text" | "label", value: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(depth > 1);

  const borderColors = [
    "hsl(270 55% 38%)",
    "hsl(270 45% 28%)",
    "hsl(270 30% 22%)",
    "hsl(270 20% 17%)",
  ];
  const borderColor = borderColors[Math.min(depth, borderColors.length - 1)];

  return (
    <div
      style={{
        marginLeft: depth > 0 ? 20 : 0,
        borderLeft: depth > 0 ? `2px solid ${borderColor}` : "none",
        paddingLeft: depth > 0 ? 16 : 0,
        marginTop: depth > 0 ? 12 : 0,
      }}
    >
      <div style={{ background: "hsl(270 12% 6%)", border: `1px solid ${borderColor}`, borderRadius: 8, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", color: "hsl(270 35% 55%)", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 5 }}>
              {depth === 0 ? "Opening Script" : "Script Text"} {node.isTerminal && <span style={{ color: "hsl(270 55% 52%)" }}> · CLOSES CALL</span>}
            </label>
            <textarea
              value={node.text}
              onChange={e => onUpdate(path, "text", e.target.value)}
              style={{
                width: "100%", minHeight: 80, padding: "8px 12px", borderRadius: 6,
                border: "1px solid hsl(270 25% 20%)", background: "hsl(270 10% 4%)",
                color: "hsl(270 35% 85%)", fontFamily: "Georgia, serif", fontSize: 12,
                lineHeight: 1.6, resize: "vertical", outline: "none", boxSizing: "border-box",
              }}
            />
            <p style={{ color: "hsl(270 20% 36%)", fontFamily: "Georgia, serif", fontSize: 10, marginTop: 4 }}>
              Use: <code style={{ color: "hsl(270 55% 65%)" }}>{"{contact_name}"}</code> · <code style={{ color: "hsl(270 55% 65%)" }}>{"{caller_name}"}</code> · <code style={{ color: "hsl(270 55% 65%)" }}>{"{campus}"}</code> · <code style={{ color: "hsl(270 55% 65%)" }}>{"{church_name}"}</code>
            </p>
          </div>

          {node.responses.length > 0 && (
            <button
              onClick={() => setCollapsed(c => !c)}
              style={{ marginTop: 22, padding: "4px 8px", background: "none", border: "1px solid hsl(270 20% 18%)", borderRadius: 5, color: "hsl(270 30% 48%)", fontFamily: "Georgia, serif", fontSize: 10, cursor: "pointer", flexShrink: 0 }}
            >
              {collapsed ? `▶ ${node.responses.length}` : "▲"}
            </button>
          )}
        </div>
      </div>

      {!collapsed && node.responses.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {node.responses.map((r, i) => (
            <div key={r.id}>
              <div style={{ marginTop: 10, marginLeft: 20, marginBottom: 4 }}>
                <label style={{ display: "block", color: "hsl(270 25% 44%)", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 }}>
                  Button {i + 1}: Response Label
                </label>
                <input
                  value={r.label}
                  onChange={e => onUpdate(`${path}.responses.${i}`, "label", e.target.value)}
                  style={{
                    width: "100%", maxWidth: 280, padding: "6px 10px", borderRadius: 5,
                    border: "1px solid hsl(270 20% 18%)", background: "hsl(270 10% 4%)",
                    color: "hsl(270 55% 72%)", fontFamily: "Georgia, serif", fontSize: 11,
                    outline: "none", boxSizing: "border-box",
                  }}
                  placeholder="Label shown to caller…"
                />
              </div>
              <NodeEditor
                node={r as ScriptNode}
                depth={depth + 1}
                path={`${path}.responses.${i}`}
                onUpdate={onUpdate}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PXPScriptPage() {
  const [, navigate] = useLocation();
  const { data: configData, refetch } = useGetPxpConfig();
  const updateConfig = useUpdatePxpConfig();

  const [tree, setTree] = useState<ScriptNode | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (configData?.scriptTree && !tree) {
      setTree(configData.scriptTree as ScriptNode);
    }
  }, [configData, tree]);

  function handleUpdate(path: string, field: "text" | "label", value: string) {
    if (!tree) return;
    setSaved(false);
    const parts = path === "root" ? [] : path.replace(/^root\.?/, "").split(".");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clone: any = JSON.parse(JSON.stringify(tree));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cur: any = clone;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part === "") continue;
      cur = cur[part];
    }
    cur[field] = value;
    setTree(clone);
  }

  async function handleSave() {
    if (!tree) return;
    setSaving(true);
    await updateConfig.mutateAsync({ data: { scriptTree: tree as Record<string, unknown> } });
    setSaving(false);
    setSaved(true);
    refetch();
  }

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-start overflow-hidden"
      style={{ background: "hsl(270 8% 3%)" }}
    >
      <button
        onClick={() => navigate("/admin/pxp")}
        className="fixed top-5 left-6 z-50"
        style={{
          color: "hsl(270 45% 68%)",
          fontFamily: "Georgia, serif",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          background: "hsl(270 20% 9%)",
          border: "1px solid hsl(270 30% 22%)",
          borderRadius: 6,
          padding: "5px 12px",
          cursor: "pointer",
        }}
      >
        ← PXP
      </button>

      <div className="relative z-10 w-full max-w-2xl px-4 pt-14 pb-24">
        <div className="text-center mb-8">
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.4rem, 4vw, 2rem)", color: "hsl(270 55% 88%)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Script Editor
          </h1>
          <div style={{ width: 50, height: 2, background: "linear-gradient(90deg, transparent, hsl(270 60% 55%), transparent)", margin: "8px auto 0" }} />
          <p style={{ color: "hsl(270 25% 48%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.12em", marginTop: 6 }}>
            Edit each step of the call script. Use {"{contact_name}"}, {"{caller_name}"}, {"{campus}"} as placeholders.
          </p>
        </div>

        {!tree ? (
          <div style={{ textAlign: "center", color: "hsl(270 20% 42%)", fontFamily: "Georgia, serif", fontSize: 13, marginTop: 60 }}>Loading script…</div>
        ) : (
          <NodeEditor node={tree} depth={0} path="root" onUpdate={handleUpdate} />
        )}

        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "16px 20px", background: "hsl(270 10% 4% / 0.95)", borderTop: "1px solid hsl(270 25% 16%)", display: "flex", justifyContent: "center", zIndex: 50 }}>
          <button
            onClick={handleSave}
            disabled={saving || !tree}
            style={{
              padding: "12px 48px", borderRadius: 10,
              background: saved ? "hsl(140 45% 16%)" : "linear-gradient(135deg, hsl(270 60% 42%), hsl(270 55% 30%))",
              color: "hsl(270 20% 95%)", fontFamily: "Georgia, serif", fontSize: 13, letterSpacing: "0.2em", textTransform: "uppercase",
              border: `1px solid ${saved ? "hsl(140 45% 28%)" : "hsl(270 55% 46%)"}`,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save Script"}
          </button>
        </div>
      </div>
    </div>
  );
}
