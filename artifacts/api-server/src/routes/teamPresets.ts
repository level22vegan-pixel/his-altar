import { Router } from "express";
import { db, teamPresetsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { SetTeamPresetBody } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { campus, service } = req.query as Record<string, string>;
    if (!campus || !service) {
      res.status(400).json({ message: "campus and service are required" });
      return;
    }
    const rows = await db
      .select()
      .from(teamPresetsTable)
      .where(and(eq(teamPresetsTable.campus, campus), eq(teamPresetsTable.service, service)));
    if (rows.length === 0) {
      res.json({ campus, service, workerIds: [] });
      return;
    }
    const row = rows[0];
    res.json({ campus: row.campus, service: row.service, workerIds: row.workerIds });
  } catch (err) {
    req.log.error({ err }, "Error fetching team preset");
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/", async (req, res) => {
  try {
    const parsed = SetTeamPresetBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid request" });
      return;
    }
    const { campus, service, workerIds } = parsed.data;

    const existing = await db
      .select()
      .from(teamPresetsTable)
      .where(and(eq(teamPresetsTable.campus, campus), eq(teamPresetsTable.service, service)));

    if (existing.length > 0) {
      await db
        .update(teamPresetsTable)
        .set({ workerIds })
        .where(and(eq(teamPresetsTable.campus, campus), eq(teamPresetsTable.service, service)));
    } else {
      await db.insert(teamPresetsTable).values({ campus, service, workerIds });
    }

    res.json({ campus, service, workerIds });
  } catch (err) {
    req.log.error({ err }, "Error saving team preset");
    res.status(500).json({ message: "Server error" });
  }
});

export { router as teamPresetsRouter };
