import { SCHOOLS } from "@canvas/registry/schools";
export type School = { id: string; name: string; url: string };
export const schools: School[] = SCHOOLS.map((s, index) => ({
  ...s,
  id: String(index + 1),
}));
export function schoolById(id: string) {
  const school = schools.find((s) => s.id === id);
  if (!school) throw Error("INVALID_INPUT");
  return school;
}
export function customSchool(value: string): School {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !url.hostname.includes(".")
  )
    throw Error("INVALID_INPUT");
  return { id: "custom", name: url.hostname, url: url.origin };
}
