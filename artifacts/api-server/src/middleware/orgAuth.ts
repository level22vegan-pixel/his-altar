import { Request, Response, NextFunction } from "express";
import { db, organizationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      orgId?: number;
    }
  }
}

export async function orgAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return next();
  }
  const token = auth.slice(7).trim();
  if (!token) return next();

  try {
    const [org] = await db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.token, token))
      .limit(1);

    if (org) {
      req.orgId = org.id;
      db.update(organizationsTable)
        .set({ lastActiveAt: new Date() })
        .where(eq(organizationsTable.id, org.id))
        .catch(() => {});
    }
  } catch {
    // token invalid — continue as default (org 1)
  }

  next();
}
