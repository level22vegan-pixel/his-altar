const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function setAdminSession() {
  localStorage.setItem("adminSession", JSON.stringify({ loginAt: Date.now() }));
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

export function getValidAdminSession(): boolean {
  try {
    const raw = localStorage.getItem("adminSession");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed?.loginAt) return false;
    if (isExpired(parsed.loginAt)) {
      localStorage.removeItem("adminSession");
      return false;
    }
    return true;
  } catch {
    return false;
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
  return getValidAdminSession() || getValidCampusSession() !== null || getValidCallerSession() !== null;
}

export function getSessionUserName(): string {
  if (getValidAdminSession()) return "Admin (HALLMARK)";
  const campus = getValidCampusSession();
  if (campus) {
    const roleLabel = campus.role === "lead" ? "Lead" : "Deputy";
    return `${roleLabel} (${campus.campus})`;
  }
  const caller = getValidCallerSession();
  if (caller) return `Caller: ${caller.callerName} (${caller.campus})`;
  return "Unknown";
}
