import { Router } from "express";
import { db, dbancCustomFieldsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

const DEFAULT_FORM_FIELDS = [
  { label: "First Name",          fieldType: "text",    systemKey: "first_name",   sortOrder: 0,  options: [] },
  { label: "Last Name",           fieldType: "text",    systemKey: "last_name",    sortOrder: 1,  options: [] },
  { label: "Phone",               fieldType: "text",    systemKey: "phone",        sortOrder: 2,  options: [] },
  { label: "Carrier",             fieldType: "select",  systemKey: "carrier",      sortOrder: 3,  options: ["AT&T", "Verizon", "T-Mobile", "Sprint", "Other"] },
  { label: "Gender",              fieldType: "select",  systemKey: "gender",       sortOrder: 4,  options: ["Male", "Female"] },
  { label: "Came Forward For",    fieldType: "select",  systemKey: "prayer_type",  sortOrder: 5,  options: ["Salvation", "Rededication", "Came Forward for Prayer"] },
  { label: "Service Time",        fieldType: "select",  systemKey: "service_time", sortOrder: 6,  options: ["8:00 AM", "10:00 AM", "12:00 PM", "7:00 PM"] },
  { label: "Prayer Notes",        fieldType: "text",    systemKey: "notes",        sortOrder: 7,  options: [] },
  { label: "Name of Altar Worker",fieldType: "text",    systemKey: "prayed_for_by",sortOrder: 8,  options: [] },
] as const;

router.get("/", async (req, res) => {
  try {
    const orgId = req.orgId ?? 1;
    let fields = await db
      .select()
      .from(dbancCustomFieldsTable)
      .where(eq(dbancCustomFieldsTable.orgId, orgId))
      .orderBy(asc(dbancCustomFieldsTable.sortOrder), asc(dbancCustomFieldsTable.id));

    // Auto-seed standard fields the first time an org loads the form config
    if (fields.length === 0) {
      const seeded = await db
        .insert(dbancCustomFieldsTable)
        .values(DEFAULT_FORM_FIELDS.map(f => ({ ...f, options: [...f.options] as string[], orgId })))
        .returning();
      fields = seeded;
    }

    res.json({ fields });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { label, fieldType = "text", options = [], sortOrder = 0, systemKey } = req.body as Record<string, unknown>;
    if (!label) { res.status(400).json({ message: "label is required" }); return; }
    const orgId = req.orgId ?? 1;
    const [field] = await db
      .insert(dbancCustomFieldsTable)
      .values({ label: String(label), fieldType: String(fieldType), options: options as string[], sortOrder: Number(sortOrder), orgId, systemKey: systemKey ? String(systemKey) : null })
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
