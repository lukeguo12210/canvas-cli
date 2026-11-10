import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const repo = fileURLToPath(new URL("..", import.meta.url));
export function prepare(stage, output) {
  const manifest = JSON.parse(
    readFileSync(path.join(repo, "docs/deployment-targets.json")),
  );
  const project = manifest.vercel.projects[stage];
  if (!project) throw Error("Unknown deployment stage");
  const files = [];
  function walk(dir) {
    for (const e of readdirSync(path.join(repo, dir), {
      withFileTypes: true,
    })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!["node_modules", ".next", "test-results", "test"].includes(e.name))
          walk(p);
      } else if (
        !e.name.startsWith(".env") &&
        !e.name.endsWith(".tsbuildinfo") &&
        !e.name.includes(".test.") &&
        !e.name.includes("vitest.config") &&
        !e.name.includes("next-env")
      )
        files.push({ file: p, data: readFileSync(path.join(repo, p), "utf8") });
    }
  }
  walk("apps/web");
  // Vercel's file API isolates rootDirectory. Bundle the shared CLI source inside
  // that root and remap only its TypeScript alias; no committed duplicate source.
  for (const dir of ["core", "registry"])
    for (const file of readdirSync(path.join(repo, "src", dir)).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
    ))
      files.push({
        file: `apps/web/canvas/${dir}/${file}`,
        data: readFileSync(path.join(repo, "src", dir, file), "utf8"),
      });
  const tsconfig = files.find((f) => f.file === "apps/web/tsconfig.json");
  const config = JSON.parse(tsconfig.data);
  config.compilerOptions.paths["@canvas/*"] = ["./canvas/*"];
  tsconfig.data = JSON.stringify(config);
  const input = {
    name: project.name,
    project: project.id,
    teamId: manifest.vercel.teamId,
    target: "production",
    files,
    projectSettings: {
      framework: "nextjs",
      rootDirectory: "apps/web",
      buildCommand: "npm run build",
      installCommand: "npm ci",
    },
  };
  writeFileSync(output, JSON.stringify(input), { mode: 0o600 });
  console.log(
    `Prepared ${files.length} source files for ${stage}; no environment files or credentials included.`,
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  prepare(process.argv[2], process.argv[3]);
