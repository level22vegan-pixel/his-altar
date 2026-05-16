import { Router } from "express";
import { db, pxpCallersTable } from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";

const router = Router();

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

router.get("/", async (req, res) => {
  try {
    const orgId = req.orgId ?? 1;
    const { campus } = req.query as { campus?: string };
    let query = db.select().from(pxpCallersTable).where(eq(pxpCallersTable.orgId, orgId)).$dynamic();
    if (campus) {
      query = query.where(and(eq(pxpCallersTable.orgId, orgId), eq(pxpCallersTable.campus, campus)));
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
    const orgId = req.orgId ?? 1;
    const password = generatePassword();
    const [caller] = await db
      .insert(pxpCallersTable)
      .values({ name: String(name), campus: String(campus), phone: String(phone), password, orgId })
      .returning();
    res.status(201).json(caller);
  } catch (err) {
    req.log.error({ err }, "Error creating pxp caller");
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id/reset-password", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const password = generatePassword();
    const [caller] = await db
      .update(pxpCallersTable)
      .set({ password })
      .where(eq(pxpCallersTable.id, id))
      .returning();
    if (!caller) { res.status(404).json({ error: "Not found" }); return; }
    res.json(caller);
  } catch (err) {
    req.log.error({ err }, "Error resetting caller password");
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
