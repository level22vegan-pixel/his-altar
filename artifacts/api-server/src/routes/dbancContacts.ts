import { Router } from "express";
import { db, dbancContactsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { campus } = req.query as { campus?: string };
    let query = db.select().from(dbancContactsTable).$dynamic();
    if (campus) {
      query = query.where(eq(dbancContactsTable.campus, campus));
    }
    const contacts = await query.orderBy(desc(dbancContactsTable.createdAt));
    res.json({ contacts });
  } catch (err) {
    req.log.error({ err }, "Error listing dbanc contacts");
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [contact] = await db
      .select()
      .from(dbancContactsTable)
      .where(eq(dbancContactsTable.id, id));
    if (!contact) { res.status(404).json({ error: "Not found" }); return; }
    res.json(contact);
  } catch (err) {
    req.log.error({ err }, "Error getting dbanc contact");
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { firstName, lastName, phone, carrier = "", gender = "", campus = "", notes = "", customData = {} } = req.body as Record<string, unknown>;
    if (!firstName || !lastName || !phone) {
      res.status(400).json({ message: "firstName, lastName, and phone are required" });
      return;
    }
    const [contact] = await db
      .insert(dbancContactsTable)
      .values({ firstName: String(firstName), lastName: String(lastName), phone: String(phone), carrier: String(carrier), gender: String(gender), campus: String(campus), notes: String(notes), customData: customData as Record<string, unknown> })
      .returning();
    res.status(201).json(contact);
  } catch (err) {
    req.log.error({ err }, "Error creating dbanc contact");
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { firstName, lastName, phone, carrier, gender, campus, notes, customData } = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (firstName !== undefined) updates.firstName = String(firstName);
    if (lastName !== undefined) updates.lastName = String(lastName);
    if (phone !== undefined) updates.phone = String(phone);
    if (carrier !== undefined) updates.carrier = String(carrier);
    if (gender !== undefined) updates.gender = String(gender);
    if (campus !== undefined) updates.campus = String(campus);
    if (notes !== undefined) updates.notes = String(notes);
    if (customData !== undefined) updates.customData = customData;
    const [contact] = await db
      .update(dbancContactsTable)
      .set(updates)
      .where(eq(dbancContactsTable.id, id))
      .returning();
    if (!contact) { res.status(404).json({ error: "Not found" }); return; }
    res.json(contact);
  } catch (err) {
    req.log.error({ err }, "Error updating dbanc contact");
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(dbancContactsTable).where(eq(dbancContactsTable.id, parseInt(req.params.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting dbanc contact");
    res.status(500).json({ message: "Server error" });
  }
});

export { router as dbancContactsRouter };
