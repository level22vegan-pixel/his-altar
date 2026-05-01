import { Router } from "express";
import { db, loginConfigTable } from "@workspace/db";
import { UpdateLoginCodeBody } from "@workspace/api-zod";
import { desc } from "drizzle-orm";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin1234";
const YESHUA_DEFAULT = [10, 21, 6, 16, 1];

async function ensureDefaultConfig() {
  const rows = await db.select().from(loginConfigTable).limit(1);
  if (rows.length === 0) {
    await db.insert(loginConfigTable).values({ code: YESHUA_DEFAULT });
  }
}

router.get("/login-code", async (req, res) => {
  try {
    await ensureDefaultConfig();
    const rows = await db
      .select()
      .from(loginConfigTable)
      .orderBy(desc(loginConfigTable.updatedAt))
      .limit(1);
    const row = rows[0];
    res.json({ code: row.code, updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error getting login code");
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/login-code", async (req, res) => {
  try {
    const parsed = UpdateLoginCodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid request" });
      return;
    }
    const { code, adminPassword } = parsed.data;
    if (adminPassword !== ADMIN_PASSWORD) {
      res.status(403).json({ message: "Invalid admin password" });
      return;
    }
    if (!code || code.length === 0) {
      res.status(400).json({ message: "Code must not be empty" });
      return;
    }
    const inserted = await db
      .insert(loginConfigTable)
      .values({ code })
      .returning();
    const row = inserted[0];
    res.json({ code: row.code, updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error updating login code");
    res.status(500).json({ message: "Server error" });
  }
});

export { router as configRouter };
