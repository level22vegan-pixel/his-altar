import { Router } from "express";
import { db, dbancCustomFieldsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const fields = await db
      .select()
      .from(dbancCustomFieldsTable)
      .orderBy(asc(dbancCustomFieldsTable.sortOrder), asc(dbancCustomFieldsTable.id));
    res.json({ fields });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { label, fieldType = "text", options = [], sortOrder = 0 } = req.body as Record<string, unknown>;
    if (!label) { res.status(400).json({ message: "label is required" }); return; }
    const [field] = await db
      .insert(dbancCustomFieldsTable)
      .values({ label: String(label), fieldType: String(fieldType), options: options as string[], sortOrder: Number(sortOrder) })
      .returning();
    res.status(201).json(field);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { label, fieldType, options, sortOrder } = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    if (label !== undefined) updates.label = String(label);
    if (fieldType !== undefined) updates.fieldType = String(fieldType);
    if (options !== undefined) updates.options = options;
    if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder);
    const [field] = await db
      .update(dbancCustomFieldsTable)
      .set(updates)
      .where(eq(dbancCustomFieldsTable.id, id))
      .returning();
    if (!field) { res.status(404).json({ error: "Not found" }); return; }
    res.json(field);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(dbancCustomFieldsTable).where(eq(dbancCustomFieldsTable.id, parseInt(req.params.id)));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export { router as dbancCustomFieldsRouter };
