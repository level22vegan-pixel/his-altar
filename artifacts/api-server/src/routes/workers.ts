import { Router } from "express";
import { db, workersTable } from "@workspace/db";
import { CreateWorkerBody } from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const query = db.select().from(workersTable).orderBy(workersTable.name);
    const rows = category
      ? await db.select().from(workersTable).where(eq(workersTable.category, category)).orderBy(workersTable.name)
      : await db.select().from(workersTable).orderBy(workersTable.name);
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
    const { name, role, category, photoUrl } = parsed.data;
    const inserted = await db.insert(workersTable).values({ name, role: role ?? null, category, photoUrl: photoUrl ?? null }).returning();
    res.status(201).json(toDto(inserted[0]));
  } catch (err) {
    req.log.error({ err }, "Error creating worker");
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ message: "Invalid id" }); return; }
    const deleted = await db.delete(workersTable).where(eq(workersTable.id, id)).returning();
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
    photoUrl: w.photoUrl ?? undefined,
    createdAt: w.createdAt.toISOString(),
  };
}

export { router as workersRouter };
