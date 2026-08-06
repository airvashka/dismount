/** True when local sandbox mode is on (never in production builds). */
export function isDevEnvironment(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  const v = (process.env.DEV_ENVIRONMENT ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}
