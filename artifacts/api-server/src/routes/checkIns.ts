import { Router } from "express";
import { db, checkInsTable, workersTable } from "@workspace/db";
import { CreateCheckInBody } from "@workspace/api-zod";
import { eq, and, ne } from "drizzle-orm";

const CAMPUSES = ["HALLMARK", "ARROWHEAD", "RIVERSIDE", "POMONA", "LA", "ARIZONA"];

const router = Router();

// Returns all active members for a service — checked-in workers if available,
// falling back to the active (non-on-hold) roster per campus.
router.get("/roster", async (req, res) => {
  try {
    const { serviceDate, service } = req.query as Record<string, string>;
    if (!serviceDate || !service) {
      res.status(400).json({ message: "serviceDate and service are required" });
      return;
    }

    // Get all check-ins for this service across every campus, joined with worker data
    const checkIns = await db
      .select({
        checkInId: checkInsTable.id,
        campus: checkInsTable.campus,
        workerId: checkInsTable.workerId,
        workerName: workersTable.name,
        workerRole: workersTable.role,
        workerCategory: workersTable.category,
      })
      .from(checkInsTable)
      .leftJoin(workersTable, eq(checkInsTable.workerId, workersTable.id))
      .where(
        and(
          eq(checkInsTable.serviceDate, serviceDate),
          eq(checkInsTable.service, service)
        )
      );

    // Group check-ins by campus
    const byCheckIn: Record<string, typeof checkIns> = {};
    for (const ci of checkIns) {
      if (!byCheckIn[ci.campus]) byCheckIn[ci.campus] = [];
      byCheckIn[ci.campus].push(ci);
    }

    // For campuses with no check-ins, fall back to active roster
    const allWorkers = await db
      .select()
      .from(workersTable)
      .where(ne(workersTable.onHold, true));

    const byRoster: Record<string, typeof allWorkers> = {};
    for (const w of allWorkers) {
      if (!byRoster[w.campus]) byRoster[w.campus] = [];
      byRoster[w.campus].push(w);
    }

    const campuses = CAMPUSES.map(campus => {
      const ci = byCheckIn[campus];
      if (ci && ci.length > 0) {
        return {
          campus,
          source: "checkins" as const,
          members: ci.map(c => ({ name: c.workerName ?? "Unknown", role: c.workerRole ?? "", category: c.workerCategory ?? "" })),
        };
      }
      const roster = byRoster[campus] ?? [];
      return {
        campus,
        source: "roster" as const,
        members: roster.map(w => ({ name: w.name, role: w.role ?? "", category: w.category })),
      };
    });

    res.json({ campuses });
  } catch (err) {
    req.log.error({ err }, "Error fetching service roster");
    res.status(500).json({ message: "Server error" });
  }
});

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
