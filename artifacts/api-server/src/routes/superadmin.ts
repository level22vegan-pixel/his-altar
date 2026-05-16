import { Router } from "express";
import { db, organizationsTable, orgMessagesTable, dbancContactsTable, pxpCallLogsTable, altarReportsTable, workersTable } from "@workspace/db";
import { eq, desc, gte, count, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

const SA_CODE     = process.env.SUPERADMIN_CODE     || "0000";
const SA_USER     = process.env.SUPERADMIN_USERNAME  || "sysadmin";
const SA_PASS     = process.env.SUPERADMIN_PASSWORD  || "HisAltar2025!";

const sessions = new Map<string, { expiresAt: Date }>();

function requireSA(req: any, res: any): boolean {
  const tok = req.headers["x-sa-token"] as string | undefined;
  if (!tok) { res.status(401).json({ message: "Unauthorized" }); return false; }
  const s = sessions.get(tok);
  if (!s || s.expiresAt < new Date()) { sessions.delete(tok ?? ""); res.status(401).json({ message: "Session expired" }); return false; }
  return true;
}

// POST /api/superadmin/verify-code
router.post("/verify-code", (req, res) => {
  const { code } = req.body as { code?: string };
  if (!code || code.trim() !== SA_CODE) {
    res.status(401).json({ match: false });
    return;
  }
  res.json({ match: true });
});

// POST /api/superadmin/login
router.post("/login", (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password || username.trim() !== SA_USER || password !== SA_PASS) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }
  const token = randomUUID();
  sessions.set(token, { expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
  res.json({ token });
});

// POST /api/superadmin/logout
router.post("/logout", (req, res) => {
  const tok = req.headers["x-sa-token"] as string | undefined;
  if (tok) sessions.delete(tok);
  res.json({ ok: true });
});

// GET /api/superadmin/stats
router.get("/stats", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [
      [{ total: totalOrgs }],
      [{ total: activeOrgs }],
      [{ total: totalContacts }],
      [{ total: totalCalls }],
      [{ total: totalWorkers }],
    ] = await Promise.all([
      db.select({ total: count() }).from(organizationsTable),
      db.select({ total: count() }).from(organizationsTable).where(gte(organizationsTable.lastActiveAt, monthAgo)),
      db.select({ total: count() }).from(dbancContactsTable),
      db.select({ total: count() }).from(pxpCallLogsTable),
      db.select({ total: count() }).from(workersTable),
    ]);
    res.json({ totalOrgs, activeOrgs, totalContacts, totalCalls, totalWorkers });
  } catch (err) {
    req.log.error({ err }, "Error fetching superadmin stats");
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/superadmin/orgs
router.get("/orgs", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const orgs = await db.select({
      id: organizationsTable.id,
      name: organizationsTable.name,
      email: organizationsTable.email,
      contactName: organizationsTable.contactName,
      plan: organizationsTable.plan,
      billingStatus: organizationsTable.billingStatus,
      billingNotes: organizationsTable.billingNotes,
      suspended: organizationsTable.suspended,
      campuses: organizationsTable.campuses,
      createdAt: organizationsTable.createdAt,
      lastActiveAt: organizationsTable.lastActiveAt,
    }).from(organizationsTable).orderBy(desc(organizationsTable.createdAt));
    res.json({ orgs });
  } catch (err) {
    req.log.error({ err }, "Error listing orgs");
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/superadmin/orgs/:id
router.put("/orgs/:id", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    const { plan, billingStatus, billingNotes, suspended, name, contactName } = req.body as {
      plan?: string; billingStatus?: string; billingNotes?: string;
      suspended?: boolean; name?: string; contactName?: string;
    };
    const updates: Record<string, unknown> = {};
    if (plan !== undefined) updates.plan = plan;
    if (billingStatus !== undefined) updates.billingStatus = billingStatus;
    if (billingNotes !== undefined) updates.billingNotes = billingNotes;
    if (suspended !== undefined) updates.suspended = suspended;
    if (name !== undefined) updates.name = name;
    if (contactName !== undefined) updates.contactName = contactName;
    const [updated] = await db.update(organizationsTable).set(updates as any).where(eq(organizationsTable.id, id)).returning();
    res.json({ org: updated });
  } catch (err) {
    req.log.error({ err }, "Error updating org");
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/superadmin/orgs/:id
router.delete("/orgs/:id", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    if (id === 1) { res.status(400).json({ message: "Cannot delete the root organization" }); return; }
    await db.delete(organizationsTable).where(eq(organizationsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Error deleting org");
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/superadmin/orgs/:id/messages
router.get("/orgs/:id/messages", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const orgId = parseInt(req.params.id);
    const msgs = await db.select().from(orgMessagesTable).where(eq(orgMessagesTable.orgId, orgId)).orderBy(orgMessagesTable.createdAt);
    res.json({ messages: msgs });
  } catch (err) {
    req.log.error({ err }, "Error fetching messages");
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/superadmin/orgs/:id/messages
router.post("/orgs/:id/messages", async (req, res) => {
  if (!requireSA(req, res)) return;
  try {
    const orgId = parseInt(req.params.id);
    const { message } = req.body as { message?: string };
    if (!message?.trim()) { res.status(400).json({ message: "Message is required" }); return; }
    const [msg] = await db.insert(orgMessagesTable).values({ orgId, fromAdmin: true, message: message.trim() }).returning();
    res.json({ message: msg });
  } catch (err) {
    req.log.error({ err }, "Error sending message");
    res.status(500).json({ message: "Server error" });
  }
});

export { router as superadminRouter };
