import { Router } from "express";
import { db, campusPasswordsTable, passwordHistoryTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const rows = await db.select().from(campusPasswordsTable);
    const passwords = rows.map(r => ({
      campus: r.campus,
      role: r.role,
      hasPassword: true,
    }));
    res.json({ passwords });
  } catch (err) {
    req.log.error({ err }, "Error listing campus passwords");
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/history", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(passwordHistoryTable)
      .orderBy(desc(passwordHistoryTable.changedAt));
    const entries = rows.map(r => ({
      id: r.id,
      campus: r.campus,
      role: r.role,
      changedAt: r.changedAt.toISOString(),
    }));
    res.json({ entries });
  } catch (err) {
    req.log.error({ err }, "Error fetching password history");
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { campus, role, password } = req.body;
    if (!campus || !role || !password || typeof password !== "string" || password.trim().length === 0) {
      res.status(400).json({ message: "campus, role, and password are required" });
      return;
    }
    await db
      .insert(campusPasswordsTable)
      .values({ campus, role, password })
      .onConflictDoUpdate({
        target: [campusPasswordsTable.campus, campusPasswordsTable.role],
        set: { password },
      });
    await db.insert(passwordHistoryTable).values({ campus, role, sequence: password });
    res.json({ campus, role, hasPassword: true });
  } catch (err) {
    req.log.error({ err }, "Error setting campus password");
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const { campus, role, password } = req.body;
    if (!campus || !role || !password) {
      res.status(400).json({ valid: false });
      return;
    }
    const rows = await db.select().from(campusPasswordsTable);
    const match = rows.find(r => r.campus === campus && r.role === role && r.password === password);
    if (match) {
      res.json({ valid: true, campus: match.campus, role: match.role });
    } else {
      res.json({ valid: false });
    }
  } catch (err) {
    req.log.error({ err }, "Error verifying campus password");
    res.status(500).json({ valid: false });
  }
});

// Look up a campus by its 4-digit code (any role)
router.post("/verify-code", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== "string") {
      res.status(400).json({ message: "code is required" });
      return;
    }
    const rows = await db.select().from(campusPasswordsTable);
    const match = rows.find(r => r.password === code.trim());
    if (match) {
      res.json({ campus: match.campus, role: match.role });
    } else {
      res.status(401).json({ message: "Invalid code" });
    }
  } catch (err) {
    req.log.error({ err }, "Error verifying campus code");
    res.status(500).json({ message: "Server error" });
  }
});

export { router as campusPasswordsRouter };
