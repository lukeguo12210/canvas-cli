import { appOrigin } from "./config";
export function sameOrigin(request: Request) {
  if (
    request.headers.get("origin") !== appOrigin() ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw Error("INVALID_ORIGIN");
}
export async function input(request: Request, maximum = 12000) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw Error("INVALID_INPUT");
  if (Number(request.headers.get("content-length")) > maximum)
    throw Error("INVALID_INPUT");
  const reader = request.body?.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  if (!reader) throw Error("INVALID_INPUT");
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maximum) {
      await reader.cancel();
      throw Error("INVALID_INPUT");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}
export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "UNAUTHORIZED")
    return json({ error: "Please sign in to your pilot account." }, 401);
  if (code === "INVALID_ORIGIN")
    return json({ error: "This request must start on this site." }, 403);
  if (code === "INVALID_INPUT")
    return json({ error: "Check the details and try again." }, 400);
  if (code === "RATE_LIMITED")
    return json({ error: "Too many requests. Please wait a minute." }, 429);
  return json(
    {
      error:
        "The request could not be completed. Try again or reconnect your school.",
    },
    400,
  );
}
