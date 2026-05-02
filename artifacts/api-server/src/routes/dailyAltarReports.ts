import { Router } from "express";
import { db, dailyAltarReportsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    let rows;
    if (month !== undefined && year !== undefined) {
      const prefix = `${year}-${String(month).padStart(2, "0")}`;
      rows = await db
        .select()
        .from(dailyAltarReportsTable)
        .where(sql`${dailyAltarReportsTable.date} LIKE ${prefix + "-%"}`)
        .orderBy(dailyAltarReportsTable.date);
    } else {
      rows = await db.select().from(dailyAltarReportsTable).orderBy(dailyAltarReportsTable.date);
    }

    res.json({ reports: rows.map(toDto) });
  } catch (err) {
    req.log.error({ err }, "Error listing daily altar reports");
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { date, campus, service, salvations, prayers, altarMembers, notes } = req.body;
    if (!date || !campus || !service) {
      res.status(400).json({ message: "date, campus, and service are required" });
      return;
    }

    const existing = await db
      .select()
      .from(dailyAltarReportsTable)
      .where(and(
        eq(dailyAltarReportsTable.date, date),
        eq(dailyAltarReportsTable.campus, campus),
        eq(dailyAltarReportsTable.service, service)
      ));

    let row;
    if (existing.length > 0) {
      const updated = await db
        .update(dailyAltarReportsTable)
        .set({
          salvations: salvations ?? existing[0].salvations,
          prayers: prayers ?? existing[0].prayers,
          altarMembers: altarMembers ?? existing[0].altarMembers,
          notes: notes !== undefined ? notes : existing[0].notes,
          updatedAt: new Date(),
        })
        .where(eq(dailyAltarReportsTable.id, existing[0].id))
        .returning();
      row = updated[0];
    } else {
      const inserted = await db
        .insert(dailyAltarReportsTable)
        .values({ date, campus, service, salvations: salvations ?? 0, prayers: prayers ?? 0, altarMembers: altarMembers ?? 0, notes: notes ?? "" })
        .returning();
      row = inserted[0];
    }

    res.json(toDto(row));
  } catch (err) {
    req.log.error({ err }, "Error upserting daily altar report");
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ message: "Invalid id" }); return; }
    const deleted = await db.delete(dailyAltarReportsTable).where(eq(dailyAltarReportsTable.id, id)).returning();
    if (!deleted.length) { res.status(404).json({ message: "Not found" }); return; }
    res.json(toDto(deleted[0]));
  } catch (err) {
    req.log.error({ err }, "Error deleting daily altar report");
    res.status(500).json({ message: "Server error" });
  }
});

function toDto(r: typeof dailyAltarReportsTable.$inferSelect) {
  return {
    id: r.id,
    date: r.date,
    campus: r.campus,
    service: r.service,
    salvations: r.salvations,
    prayers: r.prayers,
    altarMembers: r.altarMembers,
    notes: r.notes ?? "",
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export { router as dailyAltarReportsRouter };
