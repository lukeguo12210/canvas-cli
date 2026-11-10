import "server-only";
export function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}
export function appOrigin() {
  const url = new URL(env("APP_ORIGIN"));
  if (url.protocol !== "https:" && url.hostname !== "localhost")
    throw Error("APP_ORIGIN must be HTTPS");
  return url.origin;
}
export function pilotEmails() {
  return env("PILOT_EMAILS")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
export function resource() {
  return `${appOrigin()}/mcp`;
}
