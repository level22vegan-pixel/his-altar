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
  // If a church org is logged in, use their campuses only (empty = not set up yet)
  if (session) {
    return Array.isArray(session.campuses) ? session.campuses : [];
  }
  // No org session = The Way World Outreach (org 1) using staff login
  return THE_WAY_CAMPUSES;
}

export function getOrgServiceTimes(): Record<string, string[]> {
  const session = getValidOrgSession();
  // If a church org is logged in, use their service times only
  if (session) {
    return (session.serviceTimes && typeof session.serviceTimes === "object")
      ? session.serviceTimes as Record<string, string[]>
      : {};
  }
  // No org session = The Way World Outreach (org 1)
  return THE_WAY_SERVICE_TIMES;
}

export function getOrgName(): string {
  return getValidOrgSession()?.orgName ?? "The Way World Outreach";
}
