import { Router } from "express";
import { db, activityLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

// List logs for a tool
router.get("/", async (req, res) => {
  try {
    const { tool } = req.query as Record<string, string>;
    const rows = tool
      ? await db.select().from(activityLogsTable).where(eq(activityLogsTable.tool, tool)).orderBy(desc(activityLogsTable.accessedAt))
      : await db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.accessedAt));
    res.json({ logs: rows.map(r => ({ id: r.id, tool: r.tool, action: r.action, accessedAt: r.accessedAt.toISOString() })) });
  } catch (err) {
    req.log.error({ err }, "Error listing activity logs");
    res.status(500).json({ message: "Server error" });
  }
});

// Record a log entry
router.post("/", async (req, res) => {
  try {
    const { tool, action } = req.body as { tool?: string; action?: string };
    if (!tool || !action) {
      res.status(400).json({ message: "tool and action are required" });
      return;
    }
    const inserted = await db.insert(activityLogsTable).values({ tool, action }).returning();
    const r = inserted[0];
    res.status(201).json({ id: r.id, tool: r.tool, action: r.action, accessedAt: r.accessedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error recording activity log");
    res.status(500).json({ message: "Server error" });
  }
});

export { router as activityLogsRouter };
