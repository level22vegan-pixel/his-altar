import { Router } from "express";
import { db, loginConfigTable, systemConfigTable, organizationsTable } from "@workspace/db";
import { VerifyLoginBody, UpdateLoginCodeBody } from "@workspace/api-zod";
import { desc, eq } from "drizzle-orm";

const router = Router();

const ADMIN_PASSWORD_DEFAULT = process.env.ADMIN_PASSWORD || "admin1234";

async function getAdminPassword(): Promise<string> {
  try {
    const rows = await db.select().from(systemConfigTable).where(eq(systemConfigTable.key, "admin_password")).limit(1);
    if (rows.length > 0) return rows[0].value;
  } catch {}
  return ADMIN_PASSWORD_DEFAULT;
}

// YESHUA: י(10) → ש(21) → ו(6) → ע(16)
const YESHUA_DEFAULT = [10, 21, 6, 16];

async function ensureDefaultConfig() {
  const rows = await db.select().from(loginConfigTable).where(eq(loginConfigTable.orgId, 1)).limit(1);
  if (rows.length === 0) {
    await db.insert(loginConfigTable).values({ orgId: 1, code: YESHUA_DEFAULT, isAdmin: true, label: "Admin" });
  }
}

function seqEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function seqIsPrefix(submitted: number[], full: number[]): boolean {
  return (
    submitted.length < full.length &&
    submitted.every((v, i) => v === full[i])
  );
}

router.post("/verify", async (req, res) => {
  try {
    await ensureDefaultConfig();
    const parsed = VerifyLoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Invalid request" });
      return;
    }

    const submitted = parsed.data.sequence;
    const orgId = (req as { orgId?: number }).orgId ?? 1;

    // Load all codes for this org
    const rows = await db
      .select()
      .from(loginConfigTable)
      .where(eq(loginConfigTable.orgId, orgId))
      .orderBy(desc(loginConfigTable.updatedAt));

    if (rows.length === 0) {
      res.json({ success: false, partial: false, message: "Invalid sequence" });
      return;
    }

    // Check for exact match against any stored code
    const matched = rows.find(r => seqEqual(submitted, r.code));
    if (matched) {
      const orgRows = await db
        .select({ id: organizationsTable.id, name: organizationsTable.name, token: organizationsTable.token, campuses: organizationsTable.campuses, serviceTimes: organizationsTable.serviceTimes })
        .from(organizationsTable)
        .where(eq(organizationsTable.id, orgId))
        .limit(1);
      const org = orgRows[0];
      res.json({
        success: true,
        partial: false,
        role: matched.isAdmin ? "master" : "staff",
        isAdmin: matched.isAdmin,
        message: "Access granted",
        orgId: org?.id ?? 1,
        orgName: org?.name ?? "The Way World Outreach",
        orgToken: org?.token ?? null,
        campuses: org?.campuses ?? [],
        serviceTimes: org?.serviceTimes ?? {},
      });
      return;
    }

    // Check if submitted is a valid prefix of ANY code
    const isPartial = rows.some(r => seqIsPrefix(submitted, r.code));
    if (isPartial) {
      res.json({ success: false, partial: true, message: "Keep going" });
      return;
    }

    res.json({ success: false, partial: false, message: "Invalid sequence" });
  } catch (err) {
    req.log.error({ err }, "Error verifying login");
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/admin-login", async (req, res) => {
  const { password } = req.body ?? {};
  const adminPassword = await getAdminPassword();
  if (password && password === adminPassword) {
    const orgRows = await db
      .select({ name: organizationsTable.name })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, 1))
      .limit(1);
    const orgName = orgRows[0]?.name ?? "His Altar";
    res.json({ valid: true, orgName });
  } else {
    res.json({ valid: false });
  }
});

router.post("/change-admin-password", async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    res.status(400).json({ success: false, message: "Missing fields" });
    return;
  }
  const adminPassword = await getAdminPassword();
  if (currentPassword !== adminPassword) {
    res.json({ success: false, message: "Current password is incorrect" });
    return;
  }
  try {
    await db
      .insert(systemConfigTable)
      .values({ key: "admin_password", value: newPassword })
      .onConflictDoUpdate({ target: systemConfigTable.key, set: { value: newPassword, updatedAt: new Date() } });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error changing admin password");
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export { router as authRouter };
