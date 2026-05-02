import { Router } from "express";
import { db, serviceNotesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { date, service } = req.query as Record<string, string>;
    if (!date || !service) {
      res.status(400).json({ message: "date and service are required" });
      return;
    }
    const rows = await db
      .select()
      .from(serviceNotesTable)
      .where(and(eq(serviceNotesTable.date, date), eq(serviceNotesTable.service, service)));
    const row = rows[0];
    res.json({ date, service, notes: row?.notes ?? "" });
  } catch (err) {
    req.log.error({ err }, "Error getting service notes");
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { date, service, notes } = req.body;
    if (!date || !service) {
      res.status(400).json({ message: "date and service are required" });
      return;
    }
    const existing = await db
      .select()
      .from(serviceNotesTable)
      .where(and(eq(serviceNotesTable.date, date), eq(serviceNotesTable.service, service)));
    let row;
    if (existing.length > 0) {
      const updated = await db
        .update(serviceNotesTable)
        .set({ notes: notes ?? "", updatedAt: new Date() })
        .where(eq(serviceNotesTable.id, existing[0].id))
        .returning();
      row = updated[0];
    } else {
      const inserted = await db
        .insert(serviceNotesTable)
        .values({ date, service, notes: notes ?? "" })
        .returning();
      row = inserted[0];
    }
    res.json({ date: row.date, service: row.service, notes: row.notes });
  } catch (err) {
    req.log.error({ err }, "Error saving service notes");
    res.status(500).json({ message: "Server error" });
  }
});

export { router as serviceNotesRouter };
