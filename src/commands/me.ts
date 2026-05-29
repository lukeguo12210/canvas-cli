import { CanvasClient } from "../core/canvas-client.js";
import { ConfigStore } from "../core/config-store.js";
import { toErrorEnvelope } from "../core/errors.js";
import type { OutputFormat } from "../core/output.js";
import { writeOutput } from "../core/output.js";

export async function handleMeCommand(options: { format: OutputFormat }): Promise<number> {
  try {
    const profile = await new ConfigStore().activeProfile();
    const client = new CanvasClient({
      baseUrl: profile.baseUrl,
      token: profile.token
    });
    const response = await client.get("/api/v1/users/self/profile");

    await writeOutput(
      {
        ok: true,
        data: response.data,
        meta: {
          ...response.meta,
          baseUrl: profile.baseUrl
        }
      },
      options
    );
    return 0;
  } catch (error) {
    await writeOutput(toErrorEnvelope(error), options);
    return 1;
  }
}
