const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function setAdminSession(orgName?: string) {
  localStorage.setItem("adminSession", JSON.stringify({ loginAt: Date.now(), orgName: orgName ?? null }));
  localStorage.removeItem("campusSession");
  localStorage.removeItem("callerSession");
}

export function setCampusSession(campus: string, role: string) {
  localStorage.setItem("campusSession", JSON.stringify({ campus, role, loginAt: Date.now() }));
  localStorage.removeItem("adminSession");
  localStorage.removeItem("callerSession");
}

export function setCallerSession(callerId: number, callerName: string, campus: string) {
  localStorage.setItem("callerSession", JSON.stringify({ callerId, callerName, campus, loginAt: Date.now() }));
  localStorage.removeItem("adminSession");
  localStorage.removeItem("campusSession");
}

export function clearAllSessions() {
  localStorage.removeItem("campusSession");
  localStorage.removeItem("adminSession");
  localStorage.removeItem("callerSession");
}

function isExpired(loginAt: number): boolean {
  return Date.now() - loginAt > SESSION_TTL;
}

export function getValidCampusSession(): { campus: string; role: string } | null {
  try {
    const raw = localStorage.getItem("campusSession");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.campus) return null;
    // Only enforce expiry if loginAt is present (older sessions without it stay valid)
    if (parsed.loginAt && isExpired(parsed.loginAt)) {
      localStorage.removeItem("campusSession");
      return null;
    }
    return { campus: parsed.campus, role: parsed.role };
  } catch {
    return null;
  }
}

export function getValidAdminSession(): { orgName: string | null } | null {
  try {
    const raw = localStorage.getItem("adminSession");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.loginAt) return null;
    if (isExpired(parsed.loginAt)) {
      localStorage.removeItem("adminSession");
      return null;
    }
    return { orgName: parsed.orgName ?? null };
  } catch {
    return null;
  }
}

export function getValidCallerSession(): { callerId: number; callerName: string; campus: string } | null {
  try {
    const raw = localStorage.getItem("callerSession");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.callerId || !parsed?.callerName || !parsed?.loginAt) return null;
    if (isExpired(parsed.loginAt)) {
      localStorage.removeItem("callerSession");
      return null;
    }
    return { callerId: parsed.callerId, callerName: parsed.callerName, campus: parsed.campus };
  } catch {
    return null;
  }
}

export function hasValidSession(): boolean {
  return (
    getValidAdminSession() !== null ||
    getValidCampusSession() !== null ||
    getValidCallerSession() !== null ||
    getValidOrgSession() !== null
  );
}

export function setOrgSession(
  orgId: number,
  orgName: string,
  token: string,
  campuses?: string[],
  serviceTimes?: Record<string, string[]>,
) {
  localStorage.removeItem("campusSession");
  localStorage.removeItem("adminSession");
  localStorage.removeItem("callerSession");
  localStorage.setItem(
    "orgSession",
    JSON.stringify({ orgId, orgName, token, campuses, serviceTimes, loginAt: Date.now() }),
  );
}

export function getValidOrgSession(): {
  orgId: number;
  orgName: string;
  token: string;
  campuses?: string[];
  serviceTimes?: Record<string, string[]>;
} | null {
  try {
    const raw = localStorage.getItem("orgSession");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.orgId || !parsed?.token) return null;
    if (parsed.loginAt && isExpired(parsed.loginAt)) {
      localStorage.removeItem("orgSession");
      return null;
    }
    return {
      orgId: parsed.orgId,
      orgName: parsed.orgName,
      token: parsed.token,
      campuses: parsed.campuses,
      serviceTimes: parsed.serviceTimes,
    };
  } catch {
    return null;
  }
}

export function getOrgToken(): string | null {
  return getValidOrgSession()?.token ?? null;
}

export function clearOrgSession() {
  localStorage.removeItem("orgSession");
}

export function getSessionUserName(): string {
  const org = getValidOrgSession();
  if (getValidAdminSession()) return `Admin (${org?.orgName ?? "Staff"})`;
  if (!getValidAdminSession() && org) return `Admin (${org.orgName})`;
  const campus = getValidCampusSession();
  if (campus) return `Campus: ${campus.campus}`;
  const caller = getValidCallerSession();
  if (caller) return `Caller: ${caller.callerName} (${caller.campus})`;
  return "Unknown";
}
