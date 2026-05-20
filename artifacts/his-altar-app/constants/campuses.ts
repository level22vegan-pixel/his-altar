export const CAMPUSES = ["Hallmark", "Arizona", "Arrowhead", "Pomona", "Riverside", "LA"] as const;

export type Campus = typeof CAMPUSES[number];
