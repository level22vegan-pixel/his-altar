import { Router } from "express";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticatorTransportFuture,
  CredentialDeviceType,
} from "@simplewebauthn/server";
import { db, organizationsTable, webauthnCredentialsTable } from "@workspace/db";
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

// In-memory challenge store (sufficient for single-instance; use Redis for multi-instance)
const pendingChallenges = new Map<number, string>();

// GET /api/webauthn/register-options — requires org token
router.get("/register-options", async (req: any, res) => {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "").trim();
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const [org] = await db
      .select({ id: organizationsTable.id, name: organizationsTable.name, email: organizationsTable.email })
      .from(organizationsTable)
      .where(eq(organizationsTable.token, token))
      .limit(1);
    if (!org) { res.status(401).json({ error: "Unauthorized" }); return; }

    const existingCreds = await db
      .select({ id: webauthnCredentialsTable.id, transports: webauthnCredentialsTable.transports })
      .from(webauthnCredentialsTable)
      .where(eq(webauthnCredentialsTable.orgId, org.id));

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: getRpId(req),
      userName: org.email,
      userDisplayName: org.name,
      attestationType: "none",
      excludeCredentials: existingCreds.map(c => ({
        id: c.id,
        transports: c.transports ? (JSON.parse(c.transports) as AuthenticatorTransportFuture[]) : [],
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    pendingChallenges.set(org.id, options.challenge);
    res.json(options);
  } catch (err: any) {
    req.log.error({ err }, "webauthn register-options error");
    res.status(500).json({ error: err.message });
  }
});

// POST /api/webauthn/register — verify and save credential
router.post("/register", async (req: any, res) => {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "").trim();
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const [org] = await db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.token, token))
      .limit(1);
    if (!org) { res.status(401).json({ error: "Unauthorized" }); return; }

    const expectedChallenge = pendingChallenges.get(org.id);
    if (!expectedChallenge) { res.status(400).json({ error: "No pending challenge" }); return; }

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: getRpId(req),
    });

    if (!verification.verified || !verification.registrationInfo) {
      res.status(400).json({ error: "Verification failed" });
      return;
    }

    pendingChallenges.delete(org.id);
    const info = verification.registrationInfo;
    const { credential, credentialDeviceType, credentialBackedUp } = info;

    await db.insert(webauthnCredentialsTable).values({
      id: credential.id,
      orgId: org.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      deviceType: credentialDeviceType as CredentialDeviceType,
      backedUp: credentialBackedUp,
      transports: req.body.response?.transports ? JSON.stringify(req.body.response.transports) : null,
    }).onConflictDoUpdate({
      target: webauthnCredentialsTable.id,
      set: { publicKey: Buffer.from(credential.publicKey).toString("base64url"), counter: credential.counter },
    });

    res.json({ verified: true });
  } catch (err: any) {
    req.log.error({ err }, "webauthn register error");
    res.status(500).json({ error: err.message });
  }
});

// GET /api/webauthn/auth-options?email=X — public, starts authentication
router.get("/auth-options", async (req: any, res) => {
  const email = (req.query.email as string ?? "").trim().toLowerCase();
  if (!email) { res.status(400).json({ error: "email required" }); return; }

  try {
    const [org] = await db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.email, email))
      .limit(1);
    if (!org) {
      // Don't reveal whether email exists — return empty options
      const opts = await generateAuthenticationOptions({ rpID: getRpId(req), allowCredentials: [] });
      res.json(opts);
      return;
    }

    const creds = await db
      .select({ id: webauthnCredentialsTable.id, transports: webauthnCredentialsTable.transports })
      .from(webauthnCredentialsTable)
      .where(eq(webauthnCredentialsTable.orgId, org.id));

    if (creds.length === 0) {
      res.status(404).json({ error: "No biometric registered for this account" });
      return;
    }

    const options = await generateAuthenticationOptions({
      rpID: getRpId(req),
      allowCredentials: creds.map(c => ({
        id: c.id,
        transports: c.transports ? (JSON.parse(c.transports) as AuthenticatorTransportFuture[]) : [],
      })),
      userVerification: "preferred",
    });

    pendingChallenges.set(org.id, options.challenge);
    res.json({ ...options, orgId: org.id });
  } catch (err: any) {
    req.log.error({ err }, "webauthn auth-options error");
    res.status(500).json({ error: err.message });
  }
});

// POST /api/webauthn/authenticate — verify assertion and return org token
router.post("/authenticate", async (req: any, res) => {
  const { orgId, credential } = req.body as { orgId: number; credential: any };
  if (!orgId || !credential) { res.status(400).json({ error: "orgId and credential required" }); return; }

  try {
    const [storedCred] = await db
      .select()
      .from(webauthnCredentialsTable)
      .where(and(
        eq(webauthnCredentialsTable.id, credential.id),
        eq(webauthnCredentialsTable.orgId, orgId),
      ))
      .limit(1);

    if (!storedCred) { res.status(400).json({ error: "Credential not found" }); return; }

    const expectedChallenge = pendingChallenges.get(orgId);
    if (!expectedChallenge) { res.status(400).json({ error: "No pending challenge" }); return; }

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

    if (!verification.verified) { res.status(400).json({ error: "Authentication failed" }); return; }

    pendingChallenges.delete(orgId);

    // Update counter
    await db
      .update(webauthnCredentialsTable)
      .set({ counter: verification.authenticationInfo.newCounter })
      .where(eq(webauthnCredentialsTable.id, storedCred.id));

    // Return org session data
    const [org] = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, orgId))
      .limit(1);

    if (!org) { res.status(404).json({ error: "Org not found" }); return; }

    res.json({
      orgId: org.id,
      orgName: org.name,
      token: org.token,
      campuses: org.campuses ?? [],
      serviceTimes: org.serviceTimes ?? {},
    });
  } catch (err: any) {
    req.log.error({ err }, "webauthn authenticate error");
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/webauthn/credentials — remove all biometric credentials for org
router.delete("/credentials", async (req: any, res) => {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "").trim();
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [org] = await db.select({ id: organizationsTable.id }).from(organizationsTable).where(eq(organizationsTable.token, token)).limit(1);
    if (!org) { res.status(401).json({ error: "Unauthorized" }); return; }
    await db.delete(webauthnCredentialsTable).where(eq(webauthnCredentialsTable.orgId, org.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as webauthnRouter };
