import { Router } from "express";
import { db, loginConfigTable, organizationsTable } from "@workspace/db";
import { UpdateLoginCodeBody } from "@workspace/api-zod";
import { desc, eq, and } from "drizzle-orm";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin1234";
// YESHUA: י(10) → ש(21) → ו(6) → ע(16)
const YESHUA_DEFAULT = [10, 21, 6, 16];

async function ensureDefaultConfig(orgId: number) {
  const rows = await db.select().from(loginConfigTable).where(eq(loginConfigTable.orgId, orgId)).limit(1);
  if (rows.length === 0) {
    await db.insert(loginConfigTable).values({ orgId, code: YESHUA_DEFAULT, isAdmin: true, label: "Admin" });
  }
}

// GET /api/config/login-code — returns the admin (primary) code for the org
router.get("/login-code", async (req, res) => {
  try {
    const orgId = req.orgId ?? 1;
    await ensureDefaultConfig(orgId);
    const rows = await db
      .select()
      .from(loginConfigTable)
      .where(and(eq(loginConfigTable.orgId, orgId), eq(loginConfigTable.isAdmin, true)))
      .orderBy(desc(loginConfigTable.updatedAt))
      .limit(1);
    const row = rows[0];
    res.json({ code: row.code, updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error getting login code");
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/config/login-code — update the admin (primary) code
router.put("/login-code", async (req, res) => {
  try {
    const parsed = UpdateLoginCodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid request" });
      return;
    }
    const { code, adminPassword } = parsed.data;
    if (!req.orgId && adminPassword !== ADMIN_PASSWORD) {
      res.status(403).json({ message: "Invalid admin password" });
      return;
    }
    if (!code || code.length === 0) {
      res.status(400).json({ message: "Code must not be empty" });
      return;
    }
    const orgId = req.orgId ?? 1;
    const inserted = await db
      .insert(loginConfigTable)
      .values({ orgId, code, isAdmin: true, label: "Admin" })
      .returning();
    const row = inserted[0];
    res.json({ code: row.code, updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error updating login code");
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/config/login-codes — list all codes for the org
router.get("/login-codes", async (req, res) => {
  try {
    const orgId = req.orgId ?? 1;
    await ensureDefaultConfig(orgId);
    const rows = await db
      .select()
      .from(loginConfigTable)
      .where(eq(loginConfigTable.orgId, orgId))
      .orderBy(desc(loginConfigTable.updatedAt));
    res.json({
      codes: rows.map(r => ({
        id: r.id,
        code: r.code,
        isAdmin: r.isAdmin,
        label: r.label ?? (r.isAdmin ? "Admin" : "Staff"),
        updatedAt: r.updatedAt.toISOString(),
      }))
    });
  } catch (err) {
    req.log.error({ err }, "Error listing login codes");
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/config/login-codes — add a new code (staff by default)
router.post("/login-codes", async (req, res) => {
  try {
    const { code, isAdmin, label, adminPassword } = req.body as {
      code?: number[];
      isAdmin?: boolean;
      label?: string;
      adminPassword?: string;
    };
    if (!req.orgId && adminPassword !== ADMIN_PASSWORD) {
      res.status(403).json({ message: "Invalid admin password" });
      return;
    }
    if (!code || code.length === 0) {
      res.status(400).json({ message: "Code must not be empty" });
      return;
    }
    const orgId = req.orgId ?? 1;
    const inserted = await db
      .insert(loginConfigTable)
      .values({ orgId, code, isAdmin: isAdmin ?? false, label: label ?? null })
      .returning();
    const row = inserted[0];
    res.json({
      id: row.id,
      code: row.code,
      isAdmin: row.isAdmin,
      label: row.label ?? (row.isAdmin ? "Admin" : "Staff"),
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error adding login code");
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/config/login-codes/:id — remove a code
router.delete("/login-codes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ message: "Invalid id" });
      return;
    }
    const { adminPassword } = req.body as { adminPassword?: string };
    if (!req.orgId && adminPassword !== ADMIN_PASSWORD) {
      res.status(403).json({ message: "Invalid admin password" });
      return;
    }
    const orgId = req.orgId ?? 1;
    // Prevent deleting the last admin code
    const remaining = await db
      .select()
      .from(loginConfigTable)
      .where(and(eq(loginConfigTable.orgId, orgId), eq(loginConfigTable.isAdmin, true)));
    const toDelete = remaining.find(r => r.id === id);
    if (toDelete?.isAdmin && remaining.length <= 1) {
      res.status(400).json({ message: "Cannot delete the only admin code" });
      return;
    }
    await db
      .delete(loginConfigTable)
      .where(and(eq(loginConfigTable.id, id), eq(loginConfigTable.orgId, orgId)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error deleting login code");
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
