import { Router } from "express";
import crypto from "crypto";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { db, callerWebauthnCredentialsTable, pxpCallersTable, organizationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

const RP_NAME = "His Altar";

function getRpId(req: any): string {
  const domains = process.env.REPLIT_DOMAINS?.split(",");
  if (domains?.[0]) return domains[0].trim();
  return req.get("host")?.split(":")[0] ?? "localhost";
}

function getOrigin(req: any): string {
  const domains = process.env.REPLIT_DOMAINS?.split(",");
  if (domains?.[0]) return `https://${domains[0].trim()}`;
  return `${req.protocol}://${req.get("host")}`;
}

const callerRegChallenges = new Map<number, string>();
const callerAuthChallenges = new Map<string, string>();

// GET /status — returns callerIds that have Face ID registered (scoped to org)
router.get("/status", async (req: any, res) => {
  try {
    const orgId = req.orgId ?? 1;
    const creds = await db
      .select({ callerId: callerWebauthnCredentialsTable.callerId })
      .from(callerWebauthnCredentialsTable)
      .where(eq(callerWebauthnCredentialsTable.orgId, orgId));
    const callerIds = [...new Set(creds.map(c => c.callerId))];
    res.json({ callerIds });
  } catch (err: any) {
    req.log.error({ err }, "Error fetching caller webauthn status");
    res.status(500).json({ error: err.message });
  }
});

// POST /register-options — requires org auth, body: { callerId }
router.post("/register-options", async (req: any, res) => {
  const orgId = req.orgId;
  if (!orgId) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const { callerId } = req.body as { callerId: number };
    if (!callerId) { res.status(400).json({ error: "callerId required" }); return; }

    const [caller] = await db
      .select()
      .from(pxpCallersTable)
      .where(and(eq(pxpCallersTable.id, callerId), eq(pxpCallersTable.orgId, orgId)))
      .limit(1);
    if (!caller) { res.status(404).json({ error: "Caller not found" }); return; }

    const existingCreds = await db
      .select({ id: callerWebauthnCredentialsTable.id, transports: callerWebauthnCredentialsTable.transports })
      .from(callerWebauthnCredentialsTable)
      .where(and(
        eq(callerWebauthnCredentialsTable.callerId, callerId),
        eq(callerWebauthnCredentialsTable.orgId, orgId),
      ));

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: getRpId(req),
      userName: caller.name,
      userDisplayName: caller.name,
      userID: new TextEncoder().encode(`caller-${callerId}`),
      attestationType: "none",
      excludeCredentials: existingCreds.map(c => ({
        id: c.id,
        transports: c.transports ? (JSON.parse(c.transports) as AuthenticatorTransportFuture[]) : [],
      })),
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "preferred",
      },
    });

    callerRegChallenges.set(callerId, options.challenge);
    res.json({ ...options, callerId });
  } catch (err: any) {
    req.log.error({ err }, "caller webauthn register-options error");
    res.status(500).json({ error: err.message });
  }
});

// POST /register — requires org auth, body: { callerId, credential }
router.post("/register", async (req: any, res) => {
  const orgId = req.orgId;
  if (!orgId) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const { callerId, credential } = req.body as { callerId: number; credential: any };
    if (!callerId || !credential) { res.status(400).json({ error: "callerId and credential required" }); return; }

    const expectedChallenge = callerRegChallenges.get(callerId);
    if (!expectedChallenge) { res.status(400).json({ error: "No pending challenge" }); return; }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: getRpId(req),
    });

    if (!verification.verified || !verification.registrationInfo) {
      res.status(400).json({ error: "Verification failed" });
      return;
    }

    callerRegChallenges.delete(callerId);
    const { credential: cred } = verification.registrationInfo;

    await db.insert(callerWebauthnCredentialsTable).values({
      id: cred.id,
      callerId,
      orgId,
      publicKey: Buffer.from(cred.publicKey).toString("base64url"),
      counter: cred.counter,
      transports: credential.response?.transports ? JSON.stringify(credential.response.transports) : null,
    }).onConflictDoUpdate({
      target: callerWebauthnCredentialsTable.id,
      set: {
        publicKey: Buffer.from(cred.publicKey).toString("base64url"),
        counter: cred.counter,
      },
    });

    res.json({ verified: true });
  } catch (err: any) {
    req.log.error({ err }, "caller webauthn register error");
    res.status(500).json({ error: err.message });
  }
});

// GET /auth-options — public, discoverable credentials
router.get("/auth-options", async (req: any, res) => {
  try {
    const sessionKey = crypto.randomUUID();
    const options = await generateAuthenticationOptions({
      rpID: getRpId(req),
      allowCredentials: [],
      userVerification: "preferred",
    });
    callerAuthChallenges.set(sessionKey, options.challenge);
    setTimeout(() => callerAuthChallenges.delete(sessionKey), 5 * 60 * 1000);
    res.json({ ...options, sessionKey });
  } catch (err: any) {
    req.log.error({ err }, "caller webauthn auth-options error");
    res.status(500).json({ error: err.message });
  }
});

// POST /authenticate — public, body: { sessionKey, credential }
router.post("/authenticate", async (req: any, res) => {
  const { sessionKey, credential } = req.body as { sessionKey: string; credential: any };
  if (!sessionKey || !credential) { res.status(400).json({ error: "sessionKey and credential required" }); return; }

  try {
    const expectedChallenge = callerAuthChallenges.get(sessionKey);
    if (!expectedChallenge) { res.status(400).json({ error: "Challenge expired. Please try again." }); return; }

    const [storedCred] = await db
      .select()
      .from(callerWebauthnCredentialsTable)
      .where(eq(callerWebauthnCredentialsTable.id, credential.id))
      .limit(1);

    if (!storedCred) { res.status(400).json({ error: "Credential not recognized." }); return; }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: getRpId(req),
      credential: {
        id: storedCred.id,
        publicKey: Buffer.from(storedCred.publicKey, "base64url"),
        counter: storedCred.counter,
        transports: storedCred.transports
          ? (JSON.parse(storedCred.transports) as AuthenticatorTransportFuture[])
          : [],
      },
    });

    if (!verification.verified) { res.status(400).json({ error: "Authentication failed." }); return; }

    callerAuthChallenges.delete(sessionKey);

    await db
      .update(callerWebauthnCredentialsTable)
      .set({ counter: verification.authenticationInfo.newCounter })
      .where(eq(callerWebauthnCredentialsTable.id, storedCred.id));

    const [caller] = await db
      .select()
      .from(pxpCallersTable)
      .where(eq(pxpCallersTable.id, storedCred.callerId))
      .limit(1);

    if (!caller) { res.status(404).json({ error: "Caller not found" }); return; }

    res.json({ callerId: caller.id, callerName: caller.name, campus: caller.campus });
  } catch (err: any) {
    req.log.error({ err }, "caller webauthn authenticate error");
    res.status(500).json({ error: err.message });
  }
});

// DELETE /:callerId — requires org auth, removes Face ID for a caller
router.delete("/:callerId", async (req: any, res) => {
  const orgId = req.orgId;
  if (!orgId) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const callerId = parseInt(req.params.callerId);
    await db
      .delete(callerWebauthnCredentialsTable)
      .where(and(
        eq(callerWebauthnCredentialsTable.callerId, callerId),
        eq(callerWebauthnCredentialsTable.orgId, orgId),
      ));
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "caller webauthn delete error");
    res.status(500).json({ error: err.message });
  }
});

export { router as callerWebauthnRouter };
