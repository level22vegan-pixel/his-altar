import { Router } from "express";
import { db, serviceReportsTable } from "@workspace/db";
import { UpsertServiceReportBody } from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";

const router = Router();

function toDto(r: typeof serviceReportsTable.$inferSelect) {
  return {
    id: r.id,
    campus: r.campus,
    service: r.service,
    serviceDate: r.serviceDate,
    totalEntries: r.totalEntries,
    servants: r.servants,
    salvations: r.salvations,
    prayers: r.prayers,
    family: r.family,
    notes: r.notes ?? undefined,
    updatedAt: r.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const campus = req.query.campus as string | undefined;
    const rows = campus
      ? await db.select().from(serviceReportsTable).where(eq(serviceReportsTable.campus, campus))
      : await db.select().from(serviceReportsTable);
    res.json({ reports: rows.map(toDto) });
  } catch (err) {
    req.log.error({ err }, "Error listing service reports");
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = UpsertServiceReportBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid request" });
      return;
    }
    const { campus, service, serviceDate, totalEntries, servants, salvations, prayers, family, notes } = parsed.data;

    // Check for existing record (campus + service + serviceDate)
    const existing = await db
      .select()
      .from(serviceReportsTable)
      .where(
        and(
          eq(serviceReportsTable.campus, campus),
          eq(serviceReportsTable.service, service),
          eq(serviceReportsTable.serviceDate, serviceDate)
        )
      );

    let result;
    if (existing.length > 0) {
      const updated = await db
        .update(serviceReportsTable)
        .set({
          totalEntries: totalEntries ?? existing[0].totalEntries,
          servants: servants ?? existing[0].servants,
          salvations: salvations ?? existing[0].salvations,
          prayers: prayers ?? existing[0].prayers,
          family: family ?? existing[0].family,
          notes: notes ?? existing[0].notes,
          updatedAt: new Date(),
        })
        .where(eq(serviceReportsTable.id, existing[0].id))
        .returning();
      result = updated[0];
    } else {
      const inserted = await db
        .insert(serviceReportsTable)
        .values({
          campus,
          service,
          serviceDate,
          totalEntries: totalEntries ?? 0,
          servants: servants ?? 0,
          salvations: salvations ?? 0,
          prayers: prayers ?? 0,
          family: family ?? 0,
          notes: notes ?? null,
        })
        .returning();
      result = inserted[0];
    }

    res.json(toDto(result));
  } catch (err) {
    req.log.error({ err }, "Error upserting service report");
    res.status(500).json({ message: "Server error" });
  }
});

export { router as serviceReportsRouter };
