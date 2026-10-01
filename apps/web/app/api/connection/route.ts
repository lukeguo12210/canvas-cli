import { z } from "zod";
import { requireUser } from "@/lib/supabase";
import { connect, disconnect } from "@/lib/connections";
import { schoolById, customSchool } from "@/lib/schools";
import { sameOrigin, input, json, failure } from "@/lib/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { user } = await requireUser();
    const values = z
      .object({
        schoolId: z.string(),
        customUrl: z.string().max(300).optional(),
        token: z.string().trim().min(10).max(4096),
      })
      .parse(await input(request));
    const school =
      values.schoolId === "custom"
        ? customSchool(values.customUrl ?? "")
        : schoolById(values.schoolId);
    return json(await connect(user.id, school, values.token));
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const { user } = await requireUser();
    await disconnect(user.id);
    return json({
      ok: true,
      message:
        "Stored token deleted. Revoke the token in Canvas account settings to disable it everywhere.",
    });
  } catch (e) {
    return failure(e);
  }
}
