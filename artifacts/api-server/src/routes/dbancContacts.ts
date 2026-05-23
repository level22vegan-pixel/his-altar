import { Router } from "express";
import { db, dbancContactsTable } from "@workspace/db";
import { eq, desc, and, like, or, sql } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { campus } = req.query as { campus?: string };
    const orgId = req.orgId ?? 1;
    let query = db.select().from(dbancContactsTable).where(eq(dbancContactsTable.orgId, orgId)).$dynamic();
    if (campus) {
      query = query.where(and(eq(dbancContactsTable.orgId, orgId), eq(dbancContactsTable.campus, campus)));
    }
    const contacts = await query.orderBy(desc(dbancContactsTable.createdAt));
    res.json({ contacts });
  } catch (err) {
    req.log.error({ err }, "Error listing dbanc contacts");
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/prayer-summary", async (req, res) => {
  try {
    const { campus, service, date } = req.query as { campus?: string; service?: string; date?: string };
    if (!service || !date) {
      res.status(400).json({ message: "service and date are required" });
      return;
    }

    // Match contacts by explicit serviceDate when set, or fall back to UTC created_at date (±1 day for timezone safety)
    const dateCondition = or(
      eq(dbancContactsTable.serviceDate, date),
      and(
        eq(dbancContactsTable.serviceDate, ""),
        sql`${dbancContactsTable.createdAt}::date BETWEEN (${date}::date - interval '1 day')::date AND (${date}::date + interval '1 day')::date`
      )
    );

    const orgId = req.orgId ?? 1;
    const conditions: ReturnType<typeof eq>[] = [
      eq(dbancContactsTable.orgId, orgId) as ReturnType<typeof eq>,
      like(dbancContactsTable.serviceTime, `%${service}%`) as ReturnType<typeof eq>,
      dateCondition as ReturnType<typeof eq>,
    ];
    if (campus) conditions.push(eq(dbancContactsTable.campus, campus));

    const contacts = await db
      .select({ prayerType: dbancContactsTable.prayerType, campus: dbancContactsTable.campus })
      .from(dbancContactsTable)
      .where(and(...conditions));

    let salvations = 0, recommitments = 0, cameForPrayer = 0;
    const byCampus: Record<string, { salvations: number; recommitments: number; cameForPrayer: number; totalPrayers: number }> = {};
    for (const c of contacts) {
      if (!byCampus[c.campus]) byCampus[c.campus] = { salvations: 0, recommitments: 0, cameForPrayer: 0, totalPrayers: 0 };
      if (c.prayerType === "Salvation") { salvations++; byCampus[c.campus].salvations++; }
      else if (c.prayerType === "Recommitment") { recommitments++; byCampus[c.campus].recommitments++; }
      else if (c.prayerType === "Came for Prayer") { cameForPrayer++; byCampus[c.campus].cameForPrayer++; }
      if (c.prayerType) byCampus[c.campus].totalPrayers++;
    }
    res.json({ salvations, recommitments, cameForPrayer, totalPrayers: salvations + recommitments + cameForPrayer, byCampus });
  } catch (err) {
    req.log.error({ err }, "Error fetching dbanc prayer summary");
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
    const {
      firstName, lastName, phone,
      carrier = "", gender = "", campus = "", notes = "", customData = {},
      crisisFlag = false, doNotContact = false, assignedCallerId, servicesNotes = "",
      serviceTime = "", prayerType = "", serviceDate = "", prayedForBy = "",
    } = req.body as Record<string, unknown>;
    // Fields are fully configurable — no required fields enforced server-side
    const orgId = req.orgId ?? 1;
    const [contact] = await db
      .insert(dbancContactsTable)
      .values({
        firstName: String(firstName), lastName: String(lastName), phone: String(phone),
        carrier: String(carrier), gender: String(gender), campus: String(campus),
        notes: String(notes), customData: customData as Record<string, unknown>,
        crisisFlag: Boolean(crisisFlag), doNotContact: Boolean(doNotContact),
        assignedCallerId: assignedCallerId != null ? Number(assignedCallerId) : null,
        servicesNotes: String(servicesNotes),
        serviceTime: String(serviceTime),
        prayerType: String(prayerType),
        serviceDate: String(serviceDate),
        prayedForBy: String(prayedForBy),
        orgId,
      })
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
    const {
      firstName, lastName, phone, carrier, gender, campus, notes, customData,
      crisisFlag, doNotContact, assignedCallerId, servicesNotes, serviceTime, prayerType, serviceDate, prayedForBy,
    } = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (firstName !== undefined) updates.firstName = String(firstName);
    if (lastName !== undefined) updates.lastName = String(lastName);
    if (phone !== undefined) updates.phone = String(phone);
    if (carrier !== undefined) updates.carrier = String(carrier);
    if (gender !== undefined) updates.gender = String(gender);
    if (campus !== undefined) updates.campus = String(campus);
    if (notes !== undefined) updates.notes = String(notes);
    if (customData !== undefined) updates.customData = customData;
    if (crisisFlag !== undefined) updates.crisisFlag = Boolean(crisisFlag);
    if (doNotContact !== undefined) updates.doNotContact = Boolean(doNotContact);
    if (assignedCallerId !== undefined) updates.assignedCallerId = assignedCallerId != null ? Number(assignedCallerId) : null;
    if (servicesNotes !== undefined) updates.servicesNotes = String(servicesNotes);
    if (serviceTime !== undefined) updates.serviceTime = String(serviceTime);
    if (prayerType !== undefined) updates.prayerType = String(prayerType);
    if (serviceDate !== undefined) updates.serviceDate = String(serviceDate);
    if (prayedForBy !== undefined) updates.prayedForBy = String(prayedForBy);
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
