import os from "node:os";
import path from "node:path";

export function canvasHome(): string {
  return process.env.CANVAS_HOME || path.join(os.homedir(), ".canvas");
}

export function configPath(): string {
  return path.join(canvasHome(), "config.json");
}

export function contextPath(): string {
  return path.join(canvasHome(), "context.json");
}

export function resolveInside(baseDir: string, targetPath: string): string {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, targetPath);
  const relative = path.relative(resolvedBase, resolvedTarget);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes target directory: ${targetPath}`);
  }

  return resolvedTarget;
}
