import { describe, expect, it } from "vitest";
import { redactSecrets, redactString } from "./redaction.js";

describe("redaction", () => {
  it("redacts bearer tokens in strings", () => {
    expect(redactString("Authorization: Bearer abc.def.ghi")).toBe(
      "Authorization: Bearer [REDACTED]"
    );
  });

  it("redacts query-string secrets", () => {
    expect(redactString("https://canvas.example.edu/path?access_token=secret&x=1")).toBe(
      "https://canvas.example.edu/path?access_token=[REDACTED]&x=1"
    );
  });

  it("redacts secret-looking object keys recursively", () => {
    expect(
      redactSecrets({
        profile: {
          token: "secret",
          nested: [{ access_token: "another-secret", name: "ok" }]
        }
      })
    ).toEqual({
      profile: {
        token: "[REDACTED]",
        nested: [{ access_token: "[REDACTED]", name: "ok" }]
      }
    });
  });
});
