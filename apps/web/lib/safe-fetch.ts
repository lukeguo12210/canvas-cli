import { lookup } from "node:dns/promises";
import { Agent, fetch as undiciFetch } from "undici";
import ipaddr from "ipaddr.js";
export function isPublicAddress(address: string) {
  try {
    return ipaddr.process(address).range() === "unicast";
  } catch {
    return false;
  }
}
// Validate and pin the resolved public IP in the connection's DNS lookup, closing DNS-rebinding races.
const dispatcher = new Agent({
  connect: {
    lookup: (hostname, options, callback) => {
      lookup(hostname, { all: true, verbatim: true })
        .then((addresses) => {
          if (
            !addresses.length ||
            addresses.some((a) => !isPublicAddress(a.address))
          )
            return callback(new Error("Unsafe network destination"), "", 4);
          const family = typeof options === "object" ? options.family : 0;
          const selected =
            addresses.find((a) => !family || a.family === family) ??
            addresses[0];
          if (typeof options === "object" && options.all)
            (callback as unknown as (e: null, a: typeof addresses) => void)(
              null,
              addresses,
            );
          else callback(null, selected.address, selected.family);
        })
        .catch(() => callback(new Error("DNS lookup failed"), "", 4));
    },
  },
});
export const safeFetch: typeof fetch = async (url, options) => {
  const target = new URL(String(url));
  if (
    target.protocol !== "https:" ||
    target.username ||
    target.password ||
    (target.port && target.port !== "443")
  )
    throw Error("Unsafe network destination");
  return (await undiciFetch(target, {
    ...options,
    redirect: "manual",
    dispatcher,
  } as Parameters<typeof undiciFetch>[1])) as unknown as Response;
};
