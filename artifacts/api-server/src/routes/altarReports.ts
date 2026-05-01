import { Router } from "express";
import { db, altarReportsTable } from "@workspace/db";
import { CreateAltarReportBody } from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const reports = await db
      .select()
      .from(altarReportsTable)
      .orderBy(desc(altarReportsTable.createdAt));
    res.json({ reports });
  } catch (err) {
    req.log.error({ err }, "Error listing altar reports");
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = CreateAltarReportBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
      return;
    }
    const { name, campus, service, responseType, phone, email, notes } = parsed.data;
    const inserted = await db
      .insert(altarReportsTable)
      .values({ name, campus, service, responseType, phone: phone ?? null, email: email ?? null, notes: notes ?? null })
      .returning();
    const row = inserted[0];
    res.status(201).json({
      id: row.id,
      name: row.name,
      campus: row.campus,
      service: row.service,
      responseType: row.responseType,
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      notes: row.notes ?? undefined,
      createdAt: row.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating altar report");
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ message: "Invalid id" });
      return;
    }
    const deleted = await db
      .delete(altarReportsTable)
      .where(eq(altarReportsTable.id, id))
      .returning();
    if (!deleted.length) {
      res.status(404).json({ message: "Not found" });
      return;
    }
    const row = deleted[0];
    res.json({
      id: row.id,
      name: row.name,
      campus: row.campus,
      service: row.service,
      responseType: row.responseType,
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      notes: row.notes ?? undefined,
      createdAt: row.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error deleting altar report");
    res.status(500).json({ message: "Server error" });
  }
});

export { router as altarReportsRouter };
