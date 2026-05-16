import { Router } from "express";
import { db, workersTable } from "@workspace/db";
import { CreateWorkerBody, UpdateWorkerBody } from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const orgId = req.orgId ?? 1;
    const category = req.query.category as string | undefined;
    const campus = req.query.campus as string | undefined;

    const conditions: ReturnType<typeof eq>[] = [eq(workersTable.orgId, orgId) as ReturnType<typeof eq>];
    if (category) conditions.push(eq(workersTable.category, category) as ReturnType<typeof eq>);
    if (campus) conditions.push(eq(workersTable.campus, campus) as ReturnType<typeof eq>);

    const rows = await db.select().from(workersTable).where(and(...conditions)).orderBy(workersTable.name);

    res.json({ workers: rows.map(toDto) });
  } catch (err) {
    req.log.error({ err }, "Error listing workers");
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = CreateWorkerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid request" });
      return;
    }
    const orgId = req.orgId ?? 1;
    const { name, role, category, campus, photoUrl } = parsed.data;
    const inserted = await db
      .insert(workersTable)
      .values({ name, role: role ?? null, category, campus, photoUrl: photoUrl ?? null, orgId })
      .returning();
    res.status(201).json(toDto(inserted[0]));
  } catch (err) {
    req.log.error({ err }, "Error creating worker");
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ message: "Invalid id" }); return; }
    const parsed = UpdateWorkerBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Invalid request" }); return; }
    const { name, role, campus, photoUrl, onHold } = parsed.data;
    const orgId = req.orgId ?? 1;
    const updated = await db
      .update(workersTable)
      .set({
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(campus !== undefined && { campus }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(onHold !== undefined && { onHold }),
      })
      .where(and(eq(workersTable.id, id), eq(workersTable.orgId, orgId)))
      .returning();
    if (!updated.length) { res.status(404).json({ message: "Not found" }); return; }
    res.json(toDto(updated[0]));
  } catch (err) {
    req.log.error({ err }, "Error updating worker");
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ message: "Invalid id" }); return; }
    const orgId = req.orgId ?? 1;
    const deleted = await db.delete(workersTable).where(and(eq(workersTable.id, id), eq(workersTable.orgId, orgId))).returning();
    if (!deleted.length) { res.status(404).json({ message: "Not found" }); return; }
    res.json(toDto(deleted[0]));
  } catch (err) {
    req.log.error({ err }, "Error deleting worker");
    res.status(500).json({ message: "Server error" });
  }
});

function toDto(w: typeof workersTable.$inferSelect) {
  return {
    id: w.id,
    name: w.name,
    role: w.role ?? undefined,
    category: w.category,
    campus: w.campus,
    photoUrl: w.photoUrl ?? undefined,
    onHold: w.onHold,
    createdAt: w.createdAt.toISOString(),
  };
}

export { router as workersRouter };
