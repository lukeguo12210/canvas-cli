import { jwtVerify, type JWTVerifyGetKey } from "jose";
export async function verifyTokenClaims(
  token: string,
  key: JWTVerifyGetKey,
  issuer: string,
  audience: string,
  clients: string[],
) {
  if (token.length > 12000) throw Error("UNAUTHORIZED");
  const { payload } = await jwtVerify(token, key, {
    issuer,
    audience,
    algorithms: ["ES256", "RS256"],
  });
  if (
    typeof payload.sub !== "string" ||
    typeof payload.session_id !== "string" ||
    typeof payload.client_id !== "string" ||
    !clients.includes(payload.client_id) ||
    payload.scope !== "canvas:read" ||
    payload.role !== "authenticated" ||
    typeof payload.exp !== "number"
  )
    throw Error("UNAUTHORIZED");
  return {
    ...payload,
    userId: payload.sub,
    sessionId: payload.session_id,
    clientId: payload.client_id,
  };
}
