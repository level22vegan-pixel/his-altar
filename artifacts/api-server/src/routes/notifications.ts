import { Router } from "express";
import { db, deviceTokensTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.post("/register", async (req, res) => {
  const { token, campus, deviceName } = req.body as Record<string, string>;
  if (!token) { res.status(400).json({ message: "token is required" }); return; }
  const orgId = (req as any).orgId ?? 1;
  try {
    const existing = await db
      .select()
      .from(deviceTokensTable)
      .where(and(eq(deviceTokensTable.token, token), eq(deviceTokensTable.orgId, orgId)));
    if (existing.length > 0) {
      await db
        .update(deviceTokensTable)
        .set({ campus: campus ?? "", deviceName: deviceName ?? "", updatedAt: new Date() })
        .where(and(eq(deviceTokensTable.token, token), eq(deviceTokensTable.orgId, orgId)));
    } else {
      await db.insert(deviceTokensTable).values({
        orgId,
        token,
        campus: campus ?? "",
        deviceName: deviceName ?? "",
      });
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "register token error");
    res.status(500).json({ message: "Failed to register token" });
  }
});

router.get("/tokens", async (req, res) => {
  const orgId = (req as any).orgId ?? 1;
  try {
    const tokens = await db
      .select()
      .from(deviceTokensTable)
      .where(eq(deviceTokensTable.orgId, orgId));
    res.json(tokens);
  } catch (err) {
    req.log.error({ err }, "list tokens error");
    res.status(500).json({ message: "Failed to list tokens" });
  }
});

router.post("/send", async (req, res) => {
  const { title, body } = req.body as { title: string; body: string };
  if (!title || !body) { res.status(400).json({ message: "title and body are required" }); return; }
  const orgId = (req as any).orgId ?? 1;
  try {
    const rows = await db
      .select({ token: deviceTokensTable.token })
      .from(deviceTokensTable)
      .where(eq(deviceTokensTable.orgId, orgId));
    if (rows.length === 0) {
      res.json({ sent: 0, message: "No registered devices" });
      return;
    }
    const messages = rows.map(r => ({
      to: r.token,
      sound: "default" as const,
      title,
      body,
      data: {},
    }));
    const chunks: (typeof messages)[] = [];
    for (let i = 0; i < messages.length; i += 100) chunks.push(messages.slice(i, i + 100));
    let sent = 0;
    for (const chunk of chunks) {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(chunk),
      });
      if (response.ok) sent += chunk.length;
    }
    res.json({ sent });
  } catch (err) {
    req.log.error({ err }, "send notification error");
    res.status(500).json({ message: "Failed to send notifications" });
  }
});

export { router as notificationsRouter };
