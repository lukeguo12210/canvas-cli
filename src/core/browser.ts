import { spawn } from "node:child_process";

export async function openBrowser(url: string): Promise<void> {
  const command = openCommand(url);
  const child = spawn(command.command, command.args, {
    detached: true,
    stdio: "ignore"
  });
  child.unref();
}

function openCommand(url: string): { command: string; args: string[] } {
  if (process.platform === "darwin") {
    return { command: "open", args: [url] };
  }
  if (process.platform === "win32") {
    return { command: "cmd", args: ["/c", "start", "", url] };
  }
  return { command: "xdg-open", args: [url] };
}
