import { getValidOrgSession } from "./session";

export const THE_WAY_CAMPUSES = ["HALLMARK", "ARROWHEAD", "RIVERSIDE", "POMONA", "LA", "ARIZONA"];

export const THE_WAY_SERVICE_TIMES: Record<string, string[]> = {
  HALLMARK:  ["Sunday 8am", "Sunday 10am", "Sunday 12pm", "Wednesday 7pm"],
  ARROWHEAD: ["Sunday 10am", "Sunday 12pm", "Wednesday 7pm"],
  RIVERSIDE: ["Sunday 10am", "Sunday 12pm"],
  POMONA:    ["Sunday 9am", "Sunday 11am", "Wednesday 7pm"],
  LA:        ["Sunday 8am", "Sunday 9am", "Wednesday 7pm"],
  ARIZONA:   ["Sunday 9am", "Sunday 11am", "Wednesday 7pm"],
};

export function getOrgCampuses(): string[] {
  const session = getValidOrgSession();
  if (session?.campuses && Array.isArray(session.campuses) && session.campuses.length > 0) {
    return session.campuses;
  }
  return THE_WAY_CAMPUSES;
}

export function getOrgServiceTimes(): Record<string, string[]> {
  const session = getValidOrgSession();
  if (session?.serviceTimes && typeof session.serviceTimes === "object" && Object.keys(session.serviceTimes).length > 0) {
    return session.serviceTimes;
  }
  return THE_WAY_SERVICE_TIMES;
}

export function getOrgName(): string {
  return getValidOrgSession()?.orgName ?? "The Way World Outreach";
}
