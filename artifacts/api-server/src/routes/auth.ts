import { Router } from "express";
import { db, loginConfigTable, campusPasswordsTable } from "@workspace/db";
import { VerifyLoginBody, UpdateLoginCodeBody } from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin1234";

// YESHUA: י(10) → ש(21) → ו(6) → ע(16)
const YESHUA_DEFAULT = [10, 21, 6, 16];

async function ensureDefaultConfig() {
  const rows = await db.select().from(loginConfigTable).limit(1);
  if (rows.length === 0) {
    await db.insert(loginConfigTable).values({ code: YESHUA_DEFAULT });
  }
}

function seqEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function seqIsPrefix(submitted: number[], full: number[]): boolean {
  return (
    submitted.length < full.length &&
    submitted.every((v, i) => v === full[i])
  );
}

router.post("/verify", async (req, res) => {
  try {
    await ensureDefaultConfig();
    const parsed = VerifyLoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Invalid request" });
      return;
    }

    const submitted = parsed.data.sequence;

    // --- Check master code ---
    const rows = await db
      .select()
      .from(loginConfigTable)
      .orderBy(desc(loginConfigTable.updatedAt))
      .limit(1);
    const masterCode = rows[0]?.code ?? YESHUA_DEFAULT;

    if (seqEqual(submitted, masterCode)) {
      res.json({ success: true, partial: false, role: "master", message: "Access granted" });
      return;
    }

    // --- Check campus codes ---
    const campusRows = await db.select().from(campusPasswordsTable);
    for (const row of campusRows) {
      let seq: number[];
      try {
        seq = JSON.parse(row.password);
      } catch {
        continue;
      }
      if (!Array.isArray(seq)) continue;
      if (seqEqual(submitted, seq)) {
        res.json({ success: true, partial: false, role: row.role, campus: row.campus, message: "Access granted" });
        return;
      }
    }

    // --- Check partial: prefix of master OR any campus code ---
    const isMasterPartial = seqIsPrefix(submitted, masterCode);
    if (isMasterPartial) {
      res.json({ success: false, partial: true, message: "Keep going" });
      return;
    }

    for (const row of campusRows) {
      let seq: number[];
      try {
        seq = JSON.parse(row.password);
      } catch {
        continue;
      }
      if (!Array.isArray(seq)) continue;
      if (seqIsPrefix(submitted, seq)) {
        res.json({ success: false, partial: true, message: "Keep going" });
        return;
      }
    }

    res.json({ success: false, partial: false, message: "Invalid sequence" });
  } catch (err) {
    req.log.error({ err }, "Error verifying login");
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export { router as authRouter };
