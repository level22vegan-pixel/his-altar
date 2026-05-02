import { Router } from "express";
import { db, campusPasswordsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin1234";
const CAMPUSES = ["HALLMARK", "ARROWHEAD", "RIVERSIDE", "POMONA", "LA", "ARIZONA"];
const ROLES = ["lead", "deputy_lead"];

router.get("/", async (req, res) => {
  try {
    const rows = await db.select().from(campusPasswordsTable);
    const passwords = CAMPUSES.flatMap(campus =>
      ROLES.map(role => {
        const found = rows.find(r => r.campus === campus && r.role === role);
        return { campus, role, hasPassword: !!found };
      })
    );
    res.json({ passwords });
  } catch (err) {
    req.log.error({ err }, "Error listing campus passwords");
    res.status(500).json({ message: "Server error" });
  }
});

// Set campus password — sequence stored as JSON string
router.post("/", async (req, res) => {
  try {
    const { campus, role, sequence, adminPassword } = req.body;
    if (adminPassword !== ADMIN_PASSWORD) {
      res.status(401).json({ message: "Invalid admin password" });
      return;
    }
    if (!campus || !role || !Array.isArray(sequence) || sequence.length === 0) {
      res.status(400).json({ message: "campus, role, and sequence are required" });
      return;
    }
    const password = JSON.stringify(sequence);
    await db
      .insert(campusPasswordsTable)
      .values({ campus, role, password })
      .onConflictDoUpdate({
        target: [campusPasswordsTable.campus, campusPasswordsTable.role],
        set: { password },
      });
    res.json({ campus, role, hasPassword: true });
  } catch (err) {
    req.log.error({ err }, "Error setting campus password");
    res.status(500).json({ message: "Server error" });
  }
});

export { router as campusPasswordsRouter };
