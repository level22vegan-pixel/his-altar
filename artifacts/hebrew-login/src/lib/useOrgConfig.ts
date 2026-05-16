import { getValidOrgSession } from "./session";

export const THE_WAY_CAMPUSES = ["HALLMARK"];

export const THE_WAY_SERVICE_TIMES: Record<string, string[]> = {
  HALLMARK: ["Sunday 8am", "Sunday 10am", "Sunday 12pm", "Wednesday 7pm"],
};

export function getOrgCampuses(): string[] {
  const session = getValidOrgSession();
  if (session) {
    return Array.isArray(session.campuses) && session.campuses.length > 0
      ? session.campuses
      : THE_WAY_CAMPUSES;
  }
  return THE_WAY_CAMPUSES;
}

export function getOrgServiceTimes(): Record<string, string[]> {
  const session = getValidOrgSession();
  if (session) {
    return (session.serviceTimes && typeof session.serviceTimes === "object")
      ? session.serviceTimes as Record<string, string[]>
      : {};
  }
  return {};
}

export function getOrgName(): string {
  return getValidOrgSession()?.orgName ?? "The Way World Outreach";
}
