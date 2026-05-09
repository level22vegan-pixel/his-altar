const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function setAdminSession() {
  localStorage.setItem("adminSession", JSON.stringify({ loginAt: Date.now() }));
  localStorage.removeItem("campusSession");
}

export function setCampusSession(campus: string, role: string) {
  localStorage.setItem("campusSession", JSON.stringify({ campus, role, loginAt: Date.now() }));
  localStorage.removeItem("adminSession");
}

export function clearAllSessions() {
  localStorage.removeItem("campusSession");
  localStorage.removeItem("adminSession");
}

function isExpired(loginAt: number): boolean {
  return Date.now() - loginAt > SESSION_TTL;
}

export function getValidCampusSession(): { campus: string; role: string } | null {
  try {
    const raw = localStorage.getItem("campusSession");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.campus || !parsed?.loginAt) return null;
    if (isExpired(parsed.loginAt)) {
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

export function hasValidSession(): boolean {
  return getValidAdminSession() || getValidCampusSession() !== null;
}

export function getSessionUserName(): string {
  if (getValidAdminSession()) return "Admin (HALLMARK)";
  const campus = getValidCampusSession();
  if (campus) {
    const roleLabel = campus.role === "lead" ? "Lead" : "Deputy";
    return `${roleLabel} (${campus.campus})`;
  }
  return "Unknown";
}
