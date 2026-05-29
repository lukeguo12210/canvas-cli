import { toErrorEnvelope } from "../core/errors.js";
import type { OutputFormat } from "../core/output.js";
import { writeOutput } from "../core/output.js";
import { activeCanvas, flagValue } from "./shared.js";

export type CanvasTab = {
  id: string;
  html_url?: string;
  full_url?: string;
  position?: number;
  label?: string;
  type?: string;
  hidden?: boolean;
  visibility?: string;
};

export async function handleTabsCommand(
  argv: string[],
  options: { format: OutputFormat }
): Promise<number> {
  const [subcommand] = argv;

  if (subcommand !== "list") {
    await writeOutput(
      {
        ok: false,
        error: {
          code: "UNKNOWN_COMMAND",
          message: `Unknown tabs command: ${argv.join(" ")}`,
          retryable: false
        }
      },
      options
    );
    return 1;
  }

  try {
    const courseId = flagValue(argv, "--course-id");
    if (!courseId) {
      throw new Error("Usage: canvas tabs list --course-id <course-id>");
    }

    const { client, profile } = await activeCanvas();
    const response = await client.get<CanvasTab[]>(`/api/v1/courses/${courseId}/tabs`);

    await writeOutput(
      {
        ok: true,
        data: response.data.map(normalizeTab),
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

export function normalizeTab(tab: CanvasTab) {
  return {
    id: tab.id,
    label: tab.label,
    type: tab.type,
    position: tab.position,
    hidden: tab.hidden,
    visibility: tab.visibility,
    htmlUrl: tab.html_url,
    fullUrl: tab.full_url
  };
}
