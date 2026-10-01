import { beforeAll, it, expect } from "vitest";
import {
  generateKeyPair,
  exportJWK,
  createLocalJWKSet,
  SignJWT,
  type JWTVerifyGetKey,
} from "jose";
import { verifyTokenClaims } from "./token-validation";
let key: CryptoKey;
let jwks: JWTVerifyGetKey;
const issuer = "https://personal.supabase.co/auth/v1";
const resource = "https://companion.example/mcp";
beforeAll(async () => {
  const pair = await generateKeyPair("ES256");
  key = pair.privateKey;
  const publicKey = await exportJWK(pair.publicKey);
  jwks = createLocalJWKSet({
    keys: [{ ...publicKey, kid: "test", alg: "ES256" }],
  });
});
async function token(overrides: Record<string, unknown> = {}) {
  return new SignJWT({
    sub: "user-a",
    session_id: "session-a",
    client_id: "chatgpt",
    scope: "canvas:read",
    role: "authenticated",
    iss: issuer,
    aud: resource,
    exp: Math.floor(Date.now() / 1000) + 60,
    ...overrides,
  })
    .setProtectedHeader({ alg: "ES256", kid: "test" })
    .sign(key);
}
it("verifies the exact resource, issuer, client and permission", async () => {
  const value = await verifyTokenClaims(await token(), jwks, issuer, resource, [
    "chatgpt",
  ]);
  expect(value.userId).toBe("user-a");
});
it.each([
  { iss: "https://attacker.example" },
  { aud: "authenticated" },
  { aud: "https://other.example/mcp" },
  { client_id: "unknown" },
  { scope: "openid" },
  { role: "service_role" },
  { session_id: null },
  { exp: 0 },
])("rejects invalid claims %j", async (overrides) => {
  await expect(
    verifyTokenClaims(await token(overrides), jwks, issuer, resource, [
      "chatgpt",
    ]),
  ).rejects.toThrow();
});
it("rejects a modified signature", async () => {
  const value = await token();
  const [header, payload, signature] = value.split(".");
  const bad = (signature[0] === "A" ? "B" : "A") + signature.slice(1);
  await expect(
    verifyTokenClaims(`${header}.${payload}.${bad}`, jwks, issuer, resource, [
      "chatgpt",
    ]),
  ).rejects.toThrow();
});
