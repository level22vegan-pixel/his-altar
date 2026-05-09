import { Router } from "express";
import { db, pxpCallersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { campus } = req.query as { campus?: string };
    let query = db.select().from(pxpCallersTable).$dynamic();
    if (campus) {
      query = query.where(eq(pxpCallersTable.campus, campus));
    }
    const callers = await query.orderBy(asc(pxpCallersTable.name));
    res.json({ callers });
  } catch (err) {
    req.log.error({ err }, "Error listing pxp callers");
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, campus, phone = "" } = req.body as Record<string, unknown>;
    if (!name || !campus) {
      res.status(400).json({ message: "name and campus are required" });
      return;
    }
    const [caller] = await db
      .insert(pxpCallersTable)
      .values({ name: String(name), campus: String(campus), phone: String(phone) })
      .returning();
    res.status(201).json(caller);
  } catch (err) {
    req.log.error({ err }, "Error creating pxp caller");
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(pxpCallersTable).where(eq(pxpCallersTable.id, parseInt(req.params.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting pxp caller");
    res.status(500).json({ message: "Server error" });
  }
});

export { router as pxpCallersRouter };
