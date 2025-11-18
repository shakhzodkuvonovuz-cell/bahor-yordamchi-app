export type BahorModeKey =
  | "general"
  | "ielts"
  | "english"
  | "coding"
  | "math_science"
  | "homework"
  | "daily_life"
  | "finance"
  | "health";

export const MODE_KEY_BY_ROUTE: Record<string, BahorModeKey> = {
  general: "general",
  ielts: "ielts",
  english: "english",
  homework: "homework",
  technology: "coding",
  daily: "daily_life",
  finance: "finance",
  health: "health",
};
