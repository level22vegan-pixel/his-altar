import { Router } from "express";
import { db, organizationsTable, orgMessagesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { createHash, randomUUID } from "crypto";
import { sendWelcomeEmail } from "../lib/email";

const router = Router();

const SUPER_ADMIN_TOKEN = process.env.ADMIN_PASSWORD || "admin1234";

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "twwo-salt").digest("hex");
}

// GET /api/orgs/service-times?campus=X — public
// If Authorization: Bearer <token> header is present, looks up by org token (correct org).
// Otherwise falls back to campus name lookup (best-effort).
router.get("/service-times", async (req, res) => {
  const campus = (req.query.campus as string | undefined)?.trim();
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const rows = await db
        .select({ serviceTimes: organizationsTable.serviceTimes })
        .from(organizationsTable)
        .where(eq(organizationsTable.token, token))
        .limit(1);
      if (rows[0]) {
        res.json({ serviceTimes: rows[0].serviceTimes ?? {} });
        return;
      }
    }
    if (campus) {
      const rows = await db
        .select({ serviceTimes: organizationsTable.serviceTimes })
        .from(organizationsTable)
        .where(sql`${organizationsTable.campuses} @> ${JSON.stringify([campus])}::jsonb`)
        .limit(1);
      res.json({ serviceTimes: rows[0]?.serviceTimes ?? {} });
      return;
    }
    res.json({ serviceTimes: {} });
  } catch (err) {
    req.log.error({ err }, "Error fetching service times");
    res.json({ serviceTimes: {} });
  }
});

// POST /api/orgs/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, contactName } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      contactName?: string;
    };

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      res.status(400).json({ message: "Name, email, and password are required" });
      return;
    }

    const emailLower = email.toLowerCase().trim();

    const existing = await db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.email, emailLower))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ message: "An account with this email already exists" });
      return;
    }

    const token = randomUUID();
    const passwordHash = hashPassword(password);

    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const orgName = name.trim();
    const [org] = await db
      .insert(organizationsTable)
      .values({
        name: orgName,
        email: emailLower,
        passwordHash,
        contactName: contactName?.trim() || null,
        token,
        trialEndsAt,
        campuses: [orgName],
      })
      .returning({ id: organizationsTable.id, name: organizationsTable.name });

    res.json({ orgId: org.id, orgName: org.name, token, campuses: [orgName] });

    // Send welcome email in background — don't block the response
    sendWelcomeEmail({ toEmail: emailLower, orgName, contactName: contactName?.trim() || null })
      .catch((err: unknown) => req.log.error({ err }, "Failed to send welcome email"));
  } catch (err) {
    req.log.error({ err }, "Error signing up org");
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/orgs/pin-login
router.post("/pin-login", async (req, res) => {
  try {
    const { pin } = req.body as { pin?: string };
    if (!pin || !/^\d{4}$/.test(pin)) {
      res.status(400).json({ message: "A 4-digit PIN is required" });
      return;
    }

    const [org] = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.pin, pin))
      .limit(1);

    if (!org) {
      res.status(401).json({ message: "Invalid PIN. Please try again." });
      return;
    }

    db.update(organizationsTable)
      .set({ lastActiveAt: new Date() })
      .where(eq(organizationsTable.id, org.id))
      .catch(() => {});

    res.json({ orgId: org.id, orgName: org.name, token: org.token, campuses: org.campuses, serviceTimes: org.serviceTimes });
  } catch (err) {
    req.log.error({ err }, "Error in PIN login");
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/orgs/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email?.trim() || !password?.trim()) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const [org] = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (!org || org.passwordHash !== hashPassword(password)) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    db.update(organizationsTable)
      .set({ lastActiveAt: new Date() })
      .where(eq(organizationsTable.id, org.id))
      .catch(() => {});

    res.json({ orgId: org.id, orgName: org.name, token: org.token, campuses: org.campuses, serviceTimes: org.serviceTimes });
  } catch (err) {
    req.log.error({ err }, "Error logging in org");
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/orgs — super admin only
router.get("/", async (req, res) => {
  const adminToken = req.headers["x-admin-token"] as string | undefined;
  if (adminToken !== SUPER_ADMIN_TOKEN) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  try {
    const orgs = await db
      .select({
        id: organizationsTable.id,
        name: organizationsTable.name,
        email: organizationsTable.email,
        contactName: organizationsTable.contactName,
        createdAt: organizationsTable.createdAt,
        lastActiveAt: organizationsTable.lastActiveAt,
      })
      .from(organizationsTable)
      .orderBy(desc(organizationsTable.createdAt));

    res.json({ orgs });
  } catch (err) {
    req.log.error({ err }, "Error listing orgs");
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/orgs/:id/messages — super admin only
router.get("/:id/messages", async (req, res) => {
  const adminToken = req.headers["x-admin-token"] as string | undefined;
  if (adminToken !== SUPER_ADMIN_TOKEN) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  try {
    const orgId = parseInt(req.params.id);
    const messages = await db
      .select()
      .from(orgMessagesTable)
      .where(eq(orgMessagesTable.orgId, orgId))
      .orderBy(desc(orgMessagesTable.createdAt));

    res.json({ messages });
  } catch (err) {
    req.log.error({ err }, "Error listing org messages");
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/orgs/:id/messages — super admin only
router.post("/:id/messages", async (req, res) => {
  const adminToken = req.headers["x-admin-token"] as string | undefined;
  if (adminToken !== SUPER_ADMIN_TOKEN) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  try {
    const orgId = parseInt(req.params.id);
    const { message } = req.body as { message?: string };

    if (!message?.trim()) {
      res.status(400).json({ message: "Message is required" });
      return;
    }

    const [msg] = await db
      .insert(orgMessagesTable)
      .values({ orgId, fromAdmin: true, message: message.trim() })
      .returning();

    res.json({ message: msg });
  } catch (err) {
    req.log.error({ err }, "Error sending org message");
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/orgs/settings — update campuses and service times for the authenticated org
router.put("/settings", async (req, res) => {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "").trim();
  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    const [org] = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.token, token))
      .limit(1);
    if (!org) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }
    const { campuses, serviceTimes, pin } = req.body as {
      campuses?: string[];
      serviceTimes?: Record<string, string[]>;
      pin?: string;
    };
    const updates: Partial<typeof organizationsTable.$inferInsert> = {};
    if (Array.isArray(campuses)) updates.campuses = campuses;
    if (serviceTimes && typeof serviceTimes === "object") updates.serviceTimes = serviceTimes;
    if (pin !== undefined) {
      if (pin !== "" && !/^\d{4}$/.test(pin)) {
        res.status(400).json({ message: "PIN must be exactly 4 digits" });
        return;
      }
      updates.pin = pin === "" ? null : pin;
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ message: "Nothing to update" });
      return;
    }
    const [updated] = await db
      .update(organizationsTable)
      .set(updates)
      .where(eq(organizationsTable.id, org.id))
      .returning();
    res.json({ campuses: updated.campuses, serviceTimes: updated.serviceTimes });
  } catch (err) {
    req.log.error({ err }, "Error updating org settings");
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/orgs — permanently delete the authenticated org and all its data
router.delete("/", async (req, res) => {
  const orgId = req.orgId;
  if (!orgId) { res.status(401).json({ message: "Authentication required" }); return; }
  if (orgId === 1) { res.status(403).json({ message: "Cannot delete this account" }); return; }
  try {
    await db.execute(sql`DELETE FROM dbanc_contacts WHERE org_id = ${orgId}`);
    await db.execute(sql`DELETE FROM workers WHERE org_id = ${orgId}`);
    await db.execute(sql`DELETE FROM check_ins WHERE org_id = ${orgId}`);
    await db.execute(sql`DELETE FROM altar_reports WHERE org_id = ${orgId}`);
    await db.execute(sql`DELETE FROM daily_altar_reports WHERE org_id = ${orgId}`);
    await db.execute(sql`DELETE FROM pxp_call_logs WHERE org_id = ${orgId}`);
    await db.execute(sql`DELETE FROM org_messages WHERE org_id = ${orgId}`);
    await db.delete(organizationsTable).where(eq(organizationsTable.id, orgId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error deleting org");
    res.status(500).json({ message: "Server error" });
  }
});

export { router as orgsRouter };
