import { Router } from "express";
import { db, pxpCallLogsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const orgId = req.orgId ?? 1;
    const contactId = req.query.contactId ? parseInt(req.query.contactId as string) : undefined;
    const onlyFlagged = req.query.flagged === "true";
    const conditions = [eq(pxpCallLogsTable.orgId, orgId)];
    if (contactId) conditions.push(eq(pxpCallLogsTable.contactId, contactId));
    if (onlyFlagged) conditions.push(eq(pxpCallLogsTable.flagged, true));
    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    const logs = await db.select().from(pxpCallLogsTable).where(whereClause).orderBy(desc(pxpCallLogsTable.calledAt));
    res.json({ logs });
  } catch (err) {
    req.log.error({ err }, "Error listing pxp call logs");
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      contactId, callerName, campus,
      outcome = "", notes = "", servicesOffered = "", feedback = "",
      flagged = false, flagNote = "",
    } = req.body as Record<string, unknown>;
    if (!contactId || !callerName || !campus) {
      res.status(400).json({ message: "contactId, callerName, and campus are required" });
      return;
    }
    const orgId = req.orgId ?? 1;
    const [log] = await db
      .insert(pxpCallLogsTable)
      .values({
        contactId: Number(contactId),
        callerName: String(callerName),
        campus: String(campus),
        outcome: String(outcome),
        notes: String(notes),
        servicesOffered: String(servicesOffered),
        feedback: String(feedback),
        flagged: Boolean(flagged),
        flagNote: String(flagNote),
        orgId,
      })
      .returning();
    res.status(201).json(log);
  } catch (err) {
    req.log.error({ err }, "Error creating pxp call log");
    res.status(500).json({ message: "Server error" });
  }
});

export { router as pxpCallLogsRouter };
