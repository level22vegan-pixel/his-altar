import { Router } from "express";
import { db, loginConfigTable, organizationsTable } from "@workspace/db";
import { UpdateLoginCodeBody } from "@workspace/api-zod";
import { desc, eq } from "drizzle-orm";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin1234";
// YESHUA: י(10) → ש(21) → ו(6) → ע(16)
const YESHUA_DEFAULT = [10, 21, 6, 16];

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

// ── Service Times ─────────────────────────────────────────────────────────────

const THE_WAY_DEFAULT_TIMES: Record<string, string[]> = {
  HALLMARK: ["Sunday 8am", "Sunday 10am", "Sunday 12pm", "Wednesday 7pm"],
};

router.get("/service-times", async (req, res) => {
  try {
    const rows = await db
      .select({ serviceTimes: organizationsTable.serviceTimes })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, req.orgId ?? 1))
      .limit(1);
    const saved = rows[0]?.serviceTimes as Record<string, string[]> | null;
    const times = (saved && Object.keys(saved).length > 0) ? saved : THE_WAY_DEFAULT_TIMES;
    res.json({ serviceTimes: times });
  } catch (err) {
    req.log.error({ err }, "Error getting service times");
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/service-times", async (req, res) => {
  try {
    const { adminPassword, serviceTimes } = req.body as {
      adminPassword?: string;
      serviceTimes?: Record<string, string[]>;
    };
    if (!req.orgId && adminPassword !== ADMIN_PASSWORD) {
      res.status(403).json({ message: "Invalid admin password" });
      return;
    }
    if (!serviceTimes || typeof serviceTimes !== "object") {
      res.status(400).json({ message: "Invalid service times" });
      return;
    }
    const orgId = req.orgId ?? 1;
    const campuses = Object.keys(serviceTimes);
    await db
      .update(organizationsTable)
      .set({ serviceTimes, campuses })
      .where(eq(organizationsTable.id, orgId));
    res.json({ serviceTimes, campuses });
  } catch (err) {
    req.log.error({ err }, "Error updating service times");
    res.status(500).json({ message: "Server error" });
  }
});

export { router as configRouter };
