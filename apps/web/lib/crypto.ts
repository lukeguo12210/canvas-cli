import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
function key(secret: string) {
  const value = Buffer.from(secret, "base64");
  if (value.length !== 32) throw Error("Invalid encryption configuration");
  return value;
}
export function seal(
  token: string,
  owner: string,
  origin: string,
  secret: string,
) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  cipher.setAAD(Buffer.from(`${owner}\n${origin}`));
  return [
    iv.toString("base64"),
    Buffer.concat([cipher.update(token, "utf8"), cipher.final()]).toString(
      "base64",
    ),
    cipher.getAuthTag().toString("base64"),
  ].join(".");
}
export function unseal(
  value: string,
  owner: string,
  origin: string,
  secret: string,
) {
  const parts = value.split(".");
  if (
    parts.length !== 3 ||
    parts.some((v) => Buffer.from(v, "base64").toString("base64") !== v)
  )
    throw Error("Invalid ciphertext");
  const [iv, ciphertext, tag] = parts.map((v) => Buffer.from(v, "base64"));
  if (iv.length !== 12 || tag.length !== 16) throw Error("Invalid ciphertext");
  const cipher = createDecipheriv("aes-256-gcm", key(secret), iv);
  cipher.setAAD(Buffer.from(`${owner}\n${origin}`));
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(ciphertext), cipher.final()]).toString(
    "utf8",
  );
}
