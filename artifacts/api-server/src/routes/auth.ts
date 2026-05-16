import { Router } from "express";
import { db, loginConfigTable, systemConfigTable } from "@workspace/db";
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
  const rows = await db.select().from(loginConfigTable).limit(1);
  if (rows.length === 0) {
    await db.insert(loginConfigTable).values({ code: YESHUA_DEFAULT });
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

    // --- Check master code ---
    const rows = await db
      .select()
      .from(loginConfigTable)
      .orderBy(desc(loginConfigTable.updatedAt))
      .limit(1);
    const masterCode = rows[0]?.code ?? YESHUA_DEFAULT;

    if (seqEqual(submitted, masterCode)) {
      res.json({ success: true, partial: false, role: "master", message: "Access granted" });
      return;
    }

    // --- Check partial: prefix of master ---
    const isMasterPartial = seqIsPrefix(submitted, masterCode);
    if (isMasterPartial) {
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
    res.json({ valid: true });
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
