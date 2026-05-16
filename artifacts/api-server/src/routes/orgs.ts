import { Router } from "express";
import { db, organizationsTable, orgMessagesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { createHash, randomUUID } from "crypto";

const router = Router();

const SUPER_ADMIN_TOKEN = process.env.ADMIN_PASSWORD || "admin1234";

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "twwo-salt").digest("hex");
}

// POST /api/orgs/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, contactName } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      contactName?: string;
    };

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      res.status(400).json({ message: "Name, email, and password are required" });
      return;
    }

    const emailLower = email.toLowerCase().trim();

    const existing = await db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.email, emailLower))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ message: "An account with this email already exists" });
      return;
    }

    const token = randomUUID();
    const passwordHash = hashPassword(password);

    const [org] = await db
      .insert(organizationsTable)
      .values({
        name: name.trim(),
        email: emailLower,
        passwordHash,
        contactName: contactName?.trim() || null,
        token,
      })
      .returning({ id: organizationsTable.id, name: organizationsTable.name });

    res.json({ orgId: org.id, orgName: org.name, token });
  } catch (err) {
    req.log.error({ err }, "Error signing up org");
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/orgs/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email?.trim() || !password?.trim()) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const [org] = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (!org || org.passwordHash !== hashPassword(password)) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    db.update(organizationsTable)
      .set({ lastActiveAt: new Date() })
      .where(eq(organizationsTable.id, org.id))
      .catch(() => {});

    res.json({ orgId: org.id, orgName: org.name, token: org.token });
  } catch (err) {
    req.log.error({ err }, "Error logging in org");
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/orgs — super admin only
router.get("/", async (req, res) => {
  const adminToken = req.headers["x-admin-token"] as string | undefined;
  if (adminToken !== SUPER_ADMIN_TOKEN) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  try {
    const orgs = await db
      .select({
        id: organizationsTable.id,
        name: organizationsTable.name,
        email: organizationsTable.email,
        contactName: organizationsTable.contactName,
        createdAt: organizationsTable.createdAt,
        lastActiveAt: organizationsTable.lastActiveAt,
      })
      .from(organizationsTable)
      .orderBy(desc(organizationsTable.createdAt));

    res.json({ orgs });
  } catch (err) {
    req.log.error({ err }, "Error listing orgs");
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/orgs/:id/messages — super admin only
router.get("/:id/messages", async (req, res) => {
  const adminToken = req.headers["x-admin-token"] as string | undefined;
  if (adminToken !== SUPER_ADMIN_TOKEN) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  try {
    const orgId = parseInt(req.params.id);
    const messages = await db
      .select()
      .from(orgMessagesTable)
      .where(eq(orgMessagesTable.orgId, orgId))
      .orderBy(desc(orgMessagesTable.createdAt));

    res.json({ messages });
  } catch (err) {
    req.log.error({ err }, "Error listing org messages");
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/orgs/:id/messages — super admin only
router.post("/:id/messages", async (req, res) => {
  const adminToken = req.headers["x-admin-token"] as string | undefined;
  if (adminToken !== SUPER_ADMIN_TOKEN) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  try {
    const orgId = parseInt(req.params.id);
    const { message } = req.body as { message?: string };

    if (!message?.trim()) {
      res.status(400).json({ message: "Message is required" });
      return;
    }

    const [msg] = await db
      .insert(orgMessagesTable)
      .values({ orgId, fromAdmin: true, message: message.trim() })
      .returning();

    res.json({ message: msg });
  } catch (err) {
    req.log.error({ err }, "Error sending org message");
    res.status(500).json({ message: "Server error" });
  }
});

export { router as orgsRouter };
