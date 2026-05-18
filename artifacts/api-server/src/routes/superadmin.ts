import { Router } from "express";
import {
  db, organizationsTable, orgMessagesTable, dbancContactsTable,
  pxpCallLogsTable, workersTable, couponCodesTable, systemConfigTable,
  saAuditLogTable,
} from "@workspace/db";
import { eq, desc, gte, count, inArray } from "drizzle-orm";
import { randomUUID, createHash } from "crypto";
import { sendBroadcastEmail } from "../lib/email";

const router = Router();

const SA_CODE = process.env.SUPERADMIN_CODE     || "0000";
const SA_USER = process.env.SUPERADMIN_USERNAME  || "sysadmin";
const SA_PASS = process.env.SUPERADMIN_PASSWORD  || "HisAltar2025!";

const sessions = new Map<string, { expiresAt: Date }>();

function requireSA(req: any, res: any): boolean {
  const tok = req.headers["x-sa-token"] as string | undefined;
  if (!tok) { res.status(401).json({ message: "Unauthorized" }); return false; }
  const s = sessions.get(tok);
  if (!s || s.expiresAt < new Date()) { sessions.delete(tok ?? ""); res.status(401).json({ message: "Session expired" }); return false; }
  return true;
}

function hashPassword(pw: string): string {
  return createHash("sha256").update(pw + "twwo-salt").digest("hex");
}

async function writeAudit(action: string, orgId?: number | null, details?: string, reason?: string) {
  try {
    await db.insert(saAuditLogTable).values({ action, orgId: orgId ?? null, details: details ?? null, reason: reason ?? null });
  } catch (_) {}
}

// ── Auth ──────────────────────────────────────────────────────────────────────

router.post("/verify-code", (req, res) => {
  const { code } = req.body as { code?: string };
  if (!code || code.trim() !== SA_CODE) { res.status(401).json({ match: false }); return; }
  res.json({ match: true });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password || username.trim() !== SA_USER || password !== SA_PASS) {
    res.status(401).json({ message: "Invalid credentials" }); return;
  }
  const token = randomUUID();
  sessions.set(token, { expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
  res.json({ token });
});

router.post("/logout", (req, res) => {
  const tok = req.headers["x-sa-token"] as string | undefined;
  if (tok) sessions.delete(tok);
  res.json({ ok: true });
});

// ── Stats ─────────────────────────────────────────────────────────────────────

router.get("/stats", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [[{ total: totalOrgs }], [{ total: activeOrgs }], [{ total: totalContacts }], [{ total: totalCalls }], [{ total: totalWorkers }]] = await Promise.all([
      db.select({ total: count() }).from(organizationsTable),
      db.select({ total: count() }).from(organizationsTable).where(gte(organizationsTable.lastActiveAt, monthAgo)),
      db.select({ total: count() }).from(dbancContactsTable),
      db.select({ total: count() }).from(pxpCallLogsTable),
      db.select({ total: count() }).from(workersTable),
    ]);
    res.json({ totalOrgs, activeOrgs, totalContacts, totalCalls, totalWorkers });
  } catch (err) {
    req.log.error({ err }, "Stats error");
    res.status(500).json({ message: "Server error" });
  }
});

// ── Organizations ─────────────────────────────────────────────────────────────

router.get("/orgs", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const orgs = await db.select({
      id: organizationsTable.id, name: organizationsTable.name,
      email: organizationsTable.email, contactName: organizationsTable.contactName,
      plan: organizationsTable.plan, billingStatus: organizationsTable.billingStatus,
      billingNotes: organizationsTable.billingNotes, suspended: organizationsTable.suspended,
      campuses: organizationsTable.campuses, trialEndsAt: organizationsTable.trialEndsAt,
      dataRetentionMonths: organizationsTable.dataRetentionMonths,
      createdAt: organizationsTable.createdAt, lastActiveAt: organizationsTable.lastActiveAt,
    }).from(organizationsTable).orderBy(desc(organizationsTable.createdAt));
    res.json({ orgs });
  } catch (err) {
    req.log.error({ err }, "List orgs error");
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/orgs/:id", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { plan, billingStatus, billingNotes, suspended, name, contactName, campuses, dataRetentionMonths } = req.body as {
      plan?: string; billingStatus?: string; billingNotes?: string; suspended?: boolean;
      name?: string; contactName?: string; campuses?: string[]; dataRetentionMonths?: number | null;
    };
    const upd: Record<string, unknown> = {};
    if (plan !== undefined) upd.plan = plan;
    if (billingStatus !== undefined) upd.billingStatus = billingStatus;
    if (billingNotes !== undefined) upd.billingNotes = billingNotes;
    if (suspended !== undefined) upd.suspended = suspended;
    if (name !== undefined) upd.name = name;
    if (contactName !== undefined) upd.contactName = contactName;
    if (campuses !== undefined) upd.campuses = campuses;
    if (dataRetentionMonths !== undefined) upd.dataRetentionMonths = dataRetentionMonths;
    const [updated] = await db.update(organizationsTable).set(upd as any).where(eq(organizationsTable.id, id)).returning();
    await writeAudit("update_org", id, `Updated: ${Object.keys(upd).join(", ")}`);
    res.json({ org: updated });
  } catch (err) {
    req.log.error({ err }, "Update org error");
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/superadmin/orgs/:id/impersonate
router.post("/orgs/:id/impersonate", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body as { reason?: string };
    if (!reason?.trim()) {
      res.status(400).json({ message: "A reason is required for impersonation." }); return;
    }
    const [org] = await db.select({
      id: organizationsTable.id, name: organizationsTable.name,
      email: organizationsTable.email, token: organizationsTable.token,
    }).from(organizationsTable).where(eq(organizationsTable.id, id));
    if (!org) { res.status(404).json({ message: "Org not found" }); return; }
    await writeAudit("impersonate", id, `Impersonated "${org.name}"`, reason.trim());
    res.json({ orgId: org.id, orgName: org.name, email: org.email, token: org.token });
  } catch (err) {
    req.log.error({ err }, "Impersonate error");
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/superadmin/orgs/:id/trial
router.put("/orgs/:id/trial", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { days, endsAt } = req.body as { days?: number; endsAt?: string };
    let newDate: Date;
    if (endsAt) {
      newDate = new Date(endsAt);
    } else if (days && days > 0) {
      const [org] = await db.select({ trialEndsAt: organizationsTable.trialEndsAt })
        .from(organizationsTable).where(eq(organizationsTable.id, id));
      const base = org?.trialEndsAt && org.trialEndsAt > new Date() ? org.trialEndsAt : new Date();
      newDate = new Date(base.getTime() + days * 86400000);
    } else {
      res.status(400).json({ message: "Provide days or endsAt" }); return;
    }
    const [updated] = await db.update(organizationsTable)
      .set({ trialEndsAt: newDate, billingStatus: "trial" })
      .where(eq(organizationsTable.id, id)).returning();
    await writeAudit("extend_trial", id, `Trial set to ${newDate.toDateString()}`);
    res.json({ org: updated });
  } catch (err) {
    req.log.error({ err }, "Extend trial error");
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/superadmin/orgs/:id/reset-password
router.post("/orgs/:id/reset-password", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { newPassword } = req.body as { newPassword?: string };
    if (!newPassword || newPassword.trim().length < 6) {
      res.status(400).json({ message: "Password must be at least 6 characters" }); return;
    }
    await db.update(organizationsTable)
      .set({ passwordHash: hashPassword(newPassword.trim()) })
      .where(eq(organizationsTable.id, id));
    await writeAudit("reset_password", id, "Password reset by superadmin");
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Reset password error");
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/superadmin/merge
router.post("/merge", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const { sourceId, targetId, reason } = req.body as { sourceId?: number; targetId?: number; reason?: string };
    if (!sourceId || !targetId || sourceId === targetId) {
      res.status(400).json({ message: "Provide distinct sourceId and targetId" }); return;
    }
    if (!reason?.trim()) {
      res.status(400).json({ message: "A reason is required for merging." }); return;
    }
    const [[source], [target]] = await Promise.all([
      db.select({ id: organizationsTable.id, name: organizationsTable.name }).from(organizationsTable).where(eq(organizationsTable.id, sourceId)),
      db.select({ id: organizationsTable.id, name: organizationsTable.name }).from(organizationsTable).where(eq(organizationsTable.id, targetId)),
    ]);
    if (!source || !target) { res.status(404).json({ message: "One or both orgs not found" }); return; }

    const tablesMoved: string[] = [];
    for (const tbl of [dbancContactsTable, pxpCallLogsTable, workersTable] as any[]) {
      try {
        await db.update(tbl).set({ orgId: targetId }).where(eq(tbl.orgId, sourceId));
        tablesMoved.push(tbl[Symbol.for("drizzle:Name")] ?? "table");
      } catch (_) {}
    }
    try { await db.update(orgMessagesTable).set({ orgId: targetId }).where(eq(orgMessagesTable.orgId, sourceId)); } catch (_) {}
    await db.delete(organizationsTable).where(eq(organizationsTable.id, sourceId));
    await writeAudit("merge_orgs", targetId, `Merged #${sourceId} (${source.name}) into #${targetId} (${target.name})`, reason.trim());
    res.json({ ok: true, merged: { source: source.name, target: target.name } });
  } catch (err) {
    req.log.error({ err }, "Merge error");
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/orgs/:id", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const [org] = await db.select({ name: organizationsTable.name }).from(organizationsTable).where(eq(organizationsTable.id, id));
    await db.delete(organizationsTable).where(eq(organizationsTable.id, id));
    await writeAudit("delete_org", id, `Deleted "${org?.name ?? id}"`);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Delete org error");
    res.status(500).json({ message: "Server error" });
  }
});

// ── Messages ──────────────────────────────────────────────────────────────────

router.get("/orgs/:id/messages", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const orgId = parseInt(req.params.id);
    const msgs = await db.select().from(orgMessagesTable).where(eq(orgMessagesTable.orgId, orgId)).orderBy(orgMessagesTable.createdAt);
    res.json({ messages: msgs });
  } catch (err) {
    req.log.error({ err }, "Messages error");
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/orgs/:id/messages", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const orgId = parseInt(req.params.id);
    const { message } = req.body as { message?: string };
    if (!message?.trim()) { res.status(400).json({ message: "Message is required" }); return; }
    const [msg] = await db.insert(orgMessagesTable).values({ orgId, fromAdmin: true, message: message.trim() }).returning();
    res.json({ message: msg });
  } catch (err) {
    req.log.error({ err }, "Send message error");
    res.status(500).json({ message: "Server error" });
  }
});

// ── Broadcast ─────────────────────────────────────────────────────────────────

router.post("/broadcast", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const { filter, subject, body } = req.body as { filter?: string; subject?: string; body?: string };
    if (!subject?.trim() || !body?.trim()) {
      res.status(400).json({ message: "Subject and body are required" }); return;
    }
    let orgs = await db.select({
      id: organizationsTable.id, email: organizationsTable.email,
      name: organizationsTable.name, billingStatus: organizationsTable.billingStatus,
      trialEndsAt: organizationsTable.trialEndsAt,
    }).from(organizationsTable);

    if (filter === "trial") {
      orgs = orgs.filter(o => o.billingStatus === "trial");
    } else if (filter === "expiring") {
      const in7 = new Date(Date.now() + 7 * 86400000);
      orgs = orgs.filter(o => o.trialEndsAt && o.trialEndsAt <= in7 && o.trialEndsAt > new Date());
    } else if (filter === "active") {
      orgs = orgs.filter(o => o.billingStatus === "active");
    } else if (filter === "past_due") {
      orgs = orgs.filter(o => o.billingStatus === "past_due");
    }

    let sent = 0;
    for (const org of orgs) {
      try {
        await sendBroadcastEmail({ toEmail: org.email, orgName: org.name, subject: subject.trim(), body: body.trim() });
        sent++;
      } catch (_) {}
    }
    await writeAudit("broadcast_email", null, `"${subject}" → ${sent}/${orgs.length} orgs (filter: ${filter ?? "all"})`);
    res.json({ ok: true, sent, total: orgs.length });
  } catch (err) {
    req.log.error({ err }, "Broadcast error");
    res.status(500).json({ message: "Server error" });
  }
});

// ── In-App Banner ─────────────────────────────────────────────────────────────

router.get("/banner", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const [row] = await db.select().from(systemConfigTable).where(eq(systemConfigTable.key, "global_banner"));
    res.json({ banner: row ? JSON.parse(row.value) : null });
  } catch (err) {
    req.log.error({ err }, "Get banner error");
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/banner", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const { message, type, expiresAt } = req.body as { message?: string; type?: string; expiresAt?: string };
    if (!message?.trim()) {
      await db.delete(systemConfigTable).where(eq(systemConfigTable.key, "global_banner"));
      await writeAudit("clear_banner", null, "Global banner cleared");
      res.json({ ok: true, cleared: true }); return;
    }
    const val = JSON.stringify({ message: message.trim(), type: type || "info", expiresAt: expiresAt || null });
    await db.insert(systemConfigTable).values({ key: "global_banner", value: val })
      .onConflictDoUpdate({ target: systemConfigTable.key, set: { value: val, updatedAt: new Date() } });
    await writeAudit("set_banner", null, `Banner: "${message.trim()}"`);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Set banner error");
    res.status(500).json({ message: "Server error" });
  }
});

// ── Security & Privacy ────────────────────────────────────────────────────────

router.get("/security", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const rows = await db.select().from(systemConfigTable).where(
      inArray(systemConfigTable.key, ["sensitive_access_enabled", "default_retention_months"])
    );
    const cfg: Record<string, string> = {};
    for (const r of rows) cfg[r.key] = r.value;
    res.json({
      sensitiveAccessEnabled: cfg["sensitive_access_enabled"] === "true",
      defaultRetentionMonths: cfg["default_retention_months"] ? parseInt(cfg["default_retention_months"]) : null,
    });
  } catch (err) {
    req.log.error({ err }, "Security config error");
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/security", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const { sensitiveAccessEnabled, defaultRetentionMonths, reason } = req.body as {
      sensitiveAccessEnabled?: boolean; defaultRetentionMonths?: number | null; reason?: string;
    };
    if (sensitiveAccessEnabled !== undefined) {
      const val = sensitiveAccessEnabled ? "true" : "false";
      await db.insert(systemConfigTable).values({ key: "sensitive_access_enabled", value: val })
        .onConflictDoUpdate({ target: systemConfigTable.key, set: { value: val, updatedAt: new Date() } });
      await writeAudit("security_config", null, `Sensitive access → ${val}`, reason?.trim());
    }
    if (defaultRetentionMonths !== undefined) {
      const val = defaultRetentionMonths ? String(defaultRetentionMonths) : "0";
      await db.insert(systemConfigTable).values({ key: "default_retention_months", value: val })
        .onConflictDoUpdate({ target: systemConfigTable.key, set: { value: val, updatedAt: new Date() } });
      await writeAudit("retention_config", null, `Default retention → ${val} months`);
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Update security error");
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/superadmin/audit-log
router.get("/audit-log", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const logs = await db.select().from(saAuditLogTable).orderBy(desc(saAuditLogTable.createdAt)).limit(200);
    res.json({ logs });
  } catch (err) {
    req.log.error({ err }, "Audit log error");
    res.status(500).json({ message: "Server error" });
  }
});

// ── Coupons ───────────────────────────────────────────────────────────────────

router.get("/coupons", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const coupons = await db.select().from(couponCodesTable).orderBy(desc(couponCodesTable.createdAt));
    res.json({ coupons });
  } catch (err) {
    req.log.error({ err }, "List coupons error");
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/coupons", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const { code, description, discountType, discountValue, plan, maxUses, expiresAt } = req.body as {
      code?: string; description?: string; discountType?: string; discountValue?: number;
      plan?: string; maxUses?: number; expiresAt?: string;
    };
    if (!code?.trim()) { res.status(400).json({ message: "Coupon code is required" }); return; }
    if (!discountValue || discountValue <= 0) { res.status(400).json({ message: "Discount value must be > 0" }); return; }
    const [coupon] = await db.insert(couponCodesTable).values({
      code: code.trim().toUpperCase(),
      description: description?.trim() || null,
      discountType: discountType || "percent",
      discountValue: String(discountValue),
      plan: plan?.trim() || null,
      maxUses: maxUses || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }).returning();
    res.json({ coupon });
  } catch (err: any) {
    if (err?.code === "23505") { res.status(409).json({ message: "Coupon code already exists" }); return; }
    req.log.error({ err }, "Create coupon error");
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/coupons/:id", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { code, description, discountType, discountValue, plan, maxUses, expiresAt, active } = req.body as {
      code?: string; description?: string; discountType?: string; discountValue?: number;
      plan?: string; maxUses?: number | null; expiresAt?: string | null; active?: boolean;
    };
    const upd: Record<string, unknown> = {};
    if (code !== undefined) upd.code = code.trim().toUpperCase();
    if (description !== undefined) upd.description = description?.trim() || null;
    if (discountType !== undefined) upd.discountType = discountType;
    if (discountValue !== undefined) upd.discountValue = String(discountValue);
    if (plan !== undefined) upd.plan = plan?.trim() || null;
    if (maxUses !== undefined) upd.maxUses = maxUses || null;
    if (expiresAt !== undefined) upd.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (active !== undefined) upd.active = active;
    const [updated] = await db.update(couponCodesTable).set(upd as any).where(eq(couponCodesTable.id, id)).returning();
    res.json({ coupon: updated });
  } catch (err) {
    req.log.error({ err }, "Update coupon error");
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/coupons/:id", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    await db.delete(couponCodesTable).where(eq(couponCodesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Delete coupon error");
    res.status(500).json({ message: "Server error" });
  }
});

export { router as superadminRouter };
