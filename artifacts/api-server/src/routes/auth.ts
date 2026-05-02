import { Router } from "express";
import { db, loginConfigTable } from "@workspace/db";
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

router.post("/verify", async (req, res) => {
  try {
    await ensureDefaultConfig();
    const parsed = VerifyLoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "Invalid request" });
      return;
    }
    const rows = await db
      .select()
      .from(loginConfigTable)
      .orderBy(desc(loginConfigTable.updatedAt))
      .limit(1);
    const currentCode = rows[0]?.code ?? YESHUA_DEFAULT;
    const submitted = parsed.data.sequence;
    const match =
      submitted.length === currentCode.length &&
      submitted.every((v, i) => v === currentCode[i]);
    if (match) {
      res.json({ success: true, partial: false, message: "Access granted" });
      return;
    }
    // Check if submitted is a valid prefix of the correct code
    const isPartial =
      submitted.length < currentCode.length &&
      submitted.every((v, i) => v === currentCode[i]);
    res.json({ success: false, partial: isPartial, message: isPartial ? "Keep going" : "Invalid sequence" });
  } catch (err) {
    req.log.error({ err }, "Error verifying login");
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export { router as authRouter };
