import { Router } from "express";
import { db, organizationsTable, orgMessagesTable, couponCodesTable, systemConfigTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { createHash, randomUUID } from "crypto";
import { sendWelcomeEmail, sendPasscodeEmail } from "../lib/email";

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

// GET /api/orgs/me — get own org profile
router.get("/me", async (req: any, res) => {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "").trim();
  if (!token) { res.status(401).json({ message: "Unauthorized" }); return; }
  try {
    const [org] = await db
      .select({ name: organizationsTable.name, email: organizationsTable.email, contactName: organizationsTable.contactName, createdAt: organizationsTable.createdAt })
      .from(organizationsTable)
      .where(eq(organizationsTable.token, token))
      .limit(1);
    if (!org) { res.status(404).json({ message: "Not found" }); return; }
    res.json(org);
  } catch (err) {
    req.log.error({ err }, "Error fetching org profile");
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /api/orgs/me — update own org profile
router.patch("/me", async (req: any, res) => {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "").trim();
  if (!token) { res.status(401).json({ message: "Unauthorized" }); return; }
  try {
    const { name, email, contactName } = req.body as { name?: string; email?: string; contactName?: string };
    const updates: Record<string, unknown> = {};
    if (name?.trim()) updates.name = name.trim();
    if (email?.trim()) updates.email = email.trim().toLowerCase();
    if (contactName !== undefined) updates.contactName = contactName.trim() || null;
    if (Object.keys(updates).length === 0) { res.status(400).json({ message: "No fields to update" }); return; }
    await db.update(organizationsTable).set(updates).where(eq(organizationsTable.token, token));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error updating org profile");
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /api/orgs/me/password — change own password
router.patch("/me/password", async (req: any, res) => {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "").trim();
  if (!token) { res.status(401).json({ message: "Unauthorized" }); return; }
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
    if (!currentPassword?.trim() || !newPassword?.trim()) {
      res.status(400).json({ message: "currentPassword and newPassword are required" });
      return;
    }
    if (newPassword.trim().length < 6) {
      res.status(400).json({ message: "New password must be at least 6 characters" });
      return;
    }
    const [org] = await db
      .select({ id: organizationsTable.id, passwordHash: organizationsTable.passwordHash })
      .from(organizationsTable)
      .where(eq(organizationsTable.token, token))
      .limit(1);
    if (!org) { res.status(404).json({ message: "Not found" }); return; }
    if (org.passwordHash !== hashPassword(currentPassword)) {
      res.status(401).json({ message: "Current password is incorrect" });
      return;
    }
    await db.update(organizationsTable).set({ passwordHash: hashPassword(newPassword) }).where(eq(organizationsTable.id, org.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error changing password");
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

// POST /api/orgs/forgot-passcode — email the org their current admin passcode
router.post("/forgot-passcode", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email?.trim()) { res.status(400).json({ message: "Email is required" }); return; }
  try {
    const [org] = await db.select().from(organizationsTable)
      .where(eq(organizationsTable.email, email.trim().toLowerCase())).limit(1);
    if (org) {
      const rows = await db.select().from(systemConfigTable)
        .where(eq(systemConfigTable.key, "admin_password")).limit(1);
      const passcode = rows.length > 0 ? rows[0].value : (process.env.ADMIN_PASSWORD || "admin1234");
      try {
        await sendPasscodeEmail({ toEmail: org.email, orgName: org.name, passcode });
      } catch (emailErr) {
        req.log.error({ emailErr }, "Failed to send passcode email");
      }
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error in forgot-passcode");
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/orgs/apply-coupon — validate and apply a coupon code to extend trial
router.post("/apply-coupon", async (req, res) => {
  const orgId = req.orgId;
  if (!orgId) { res.status(401).json({ message: "Authentication required" }); return; }
  const { code } = req.body as { code?: string };
  if (!code?.trim()) { res.status(400).json({ message: "Code is required" }); return; }
  try {
    const [coupon] = await db
      .select().from(couponCodesTable)
      .where(eq(couponCodesTable.code, code.trim().toUpperCase()))
      .limit(1);
    if (!coupon || !coupon.active) { res.status(404).json({ message: "Invalid or inactive code" }); return; }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) { res.status(400).json({ message: "This code has expired" }); return; }
    if (coupon.maxUses && coupon.usesCount >= coupon.maxUses) { res.status(400).json({ message: "This code has reached its usage limit" }); return; }
    if (coupon.discountType !== "trial_extension") { res.status(400).json({ message: "This code is not valid for trial extensions" }); return; }

    const days = Math.round(parseFloat(coupon.discountValue)) || 30;
    const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId)).limit(1);
    if (!org) { res.status(404).json({ message: "Organization not found" }); return; }

    const base = org.trialEndsAt && org.trialEndsAt > new Date() ? org.trialEndsAt : new Date();
    const newTrialEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    await db.update(organizationsTable).set({ trialEndsAt: newTrialEnd }).where(eq(organizationsTable.id, orgId));
    await db.update(couponCodesTable).set({ usesCount: coupon.usesCount + 1 }).where(eq(couponCodesTable.id, coupon.id));

    res.json({ success: true, days, newTrialEndsAt: newTrialEnd.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error applying coupon");
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
