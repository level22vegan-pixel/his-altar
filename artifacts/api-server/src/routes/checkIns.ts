import { Router } from "express";
import { db, checkInsTable, workersTable } from "@workspace/db";
import { CreateCheckInBody } from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { campus, service, serviceDate } = req.query as Record<string, string>;
    if (!campus || !service || !serviceDate) {
      res.status(400).json({ message: "campus, service, and serviceDate are required" });
      return;
    }
    const rows = await db
      .select()
      .from(checkInsTable)
      .where(
        and(
          eq(checkInsTable.campus, campus),
          eq(checkInsTable.service, service),
          eq(checkInsTable.serviceDate, serviceDate)
        )
      );
    res.json({ checkIns: rows.map(toDto) });
  } catch (err) {
    req.log.error({ err }, "Error listing check-ins");
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = CreateCheckInBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid request" });
      return;
    }
    const { workerId, campus, service, serviceDate } = parsed.data;
    // Prevent duplicate check-ins for same worker in same session
    const existing = await db
      .select()
      .from(checkInsTable)
      .where(
        and(
          eq(checkInsTable.workerId, workerId),
          eq(checkInsTable.campus, campus),
          eq(checkInsTable.service, service),
          eq(checkInsTable.serviceDate, serviceDate)
        )
      );
    if (existing.length > 0) {
      res.status(409).json({ message: "Already checked in" });
      return;
    }
    const inserted = await db.insert(checkInsTable).values({ workerId, campus, service, serviceDate }).returning();
    res.status(201).json(toDto(inserted[0]));
  } catch (err) {
    req.log.error({ err }, "Error creating check-in");
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ message: "Invalid id" }); return; }
    const deleted = await db.delete(checkInsTable).where(eq(checkInsTable.id, id)).returning();
    if (!deleted.length) { res.status(404).json({ message: "Not found" }); return; }
    res.json(toDto(deleted[0]));
  } catch (err) {
    req.log.error({ err }, "Error deleting check-in");
    res.status(500).json({ message: "Server error" });
  }
});

function toDto(c: typeof checkInsTable.$inferSelect) {
  return {
    id: c.id,
    workerId: c.workerId,
    campus: c.campus,
    service: c.service,
    serviceDate: c.serviceDate,
    checkedInAt: c.checkedInAt.toISOString(),
  };
}

export { router as checkInsRouter };
