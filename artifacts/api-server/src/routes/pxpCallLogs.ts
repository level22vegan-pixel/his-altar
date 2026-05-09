import { Router } from "express";
import { db, pxpCallLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const contactId = req.query.contactId ? parseInt(req.query.contactId as string) : undefined;
    const base = db.select().from(pxpCallLogsTable).orderBy(desc(pxpCallLogsTable.calledAt));
    const logs = contactId
      ? await base.where(eq(pxpCallLogsTable.contactId, contactId))
      : await base;
    res.json({ logs });
  } catch (err) {
    req.log.error({ err }, "Error listing pxp call logs");
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { contactId, callerName, campus, outcome = "", notes = "" } = req.body as Record<string, unknown>;
    if (!contactId || !callerName || !campus) {
      res.status(400).json({ message: "contactId, callerName, and campus are required" });
      return;
    }
    const [log] = await db
      .insert(pxpCallLogsTable)
      .values({ contactId: Number(contactId), callerName: String(callerName), campus: String(campus), outcome: String(outcome), notes: String(notes) })
      .returning();
    res.status(201).json(log);
  } catch (err) {
    req.log.error({ err }, "Error creating pxp call log");
    res.status(500).json({ message: "Server error" });
  }
});

export { router as pxpCallLogsRouter };
