import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export type PromptIO = {
  question(prompt: string): Promise<string>;
  close(): void;
};

export function createPrompt(): PromptIO {
  return createInterface({ input, output });
}

export async function promptHidden(prompt: string): Promise<string> {
  if (!process.stdin.isTTY) {
    const io = createPrompt();
    try {
      return (await io.question(prompt)).trim();
    } finally {
      io.close();
    }
  }

  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const onData = (char: Buffer) => {
      const value = char.toString("utf8");
      if (value === "\n" || value === "\r" || value === "\r\n") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off("data", onData);
        process.stdout.write("\n");
        resolve(buffer.trim());
        return;
      }
      if (value === "\u0003") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off("data", onData);
        process.stdout.write("\n");
        reject(new Error("Prompt cancelled."));
        return;
      }
      if (value === "\u007f") {
        buffer = buffer.slice(0, -1);
        return;
      }
      buffer += value;
    };

    let buffer = "";
    process.stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}
