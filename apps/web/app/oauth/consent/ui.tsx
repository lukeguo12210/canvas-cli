"use client";
import { useState } from "react";
export function Consent({ id }: { id: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function act(approve: boolean) {
    setBusy(true);
    const response = await fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, approve }),
    });
    const data = await response.json();
    if (data.redirect) window.location.assign(data.redirect);
    else {
      setError(data.error);
      setBusy(false);
    }
  }
  return (
    <>
      <div className="actions">
        <button disabled={busy} onClick={() => act(true)}>
          Allow read access
        </button>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => act(false)}
        >
          Cancel
        </button>
      </div>
      <p role="alert">{error}</p>
    </>
  );
}
