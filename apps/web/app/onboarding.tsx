"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { School } from "@/lib/schools";
type Connection = {
  school_name: string;
  canvas_origin: string;
  canvas_display_name: string;
};
export function Onboarding({ schools }: { schools: School[] }) {
  const [session, setSession] = useState<{
    email: string | null;
    connection: Connection | null;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<School | null>(null);
  const [custom, setCustom] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [returnTo, setReturnTo] = useState("");
  async function refresh() {
    const response = await fetch("/api/session");
    if (!response.ok)
      throw Error(
        "The service is temporarily unavailable. Please reload in a moment.",
      );
    setSession(await response.json());
  }
  useEffect(() => {
    refresh().catch((e) => {
      setMessage(e.message);
      setIsError(true);
    });
    const params = new URLSearchParams(window.location.search);
    setReturnTo(params.get("returnTo") ?? "");
    if (params.has("error")) {
      setMessage(
        "That sign-in link could not be verified. Request a new one below.",
      );
      setIsError(true);
    }
  }, []);
  async function request(url: string, method: string, body?: unknown) {
    setBusy(true);
    setMessage("");
    setIsError(false);
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await response.json();
      if (!response.ok)
        throw Error(data.error ?? data.message ?? "Please try again.");
      return data;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Please try again.");
      setIsError(true);
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function login(e: React.FormEvent) {
    e.preventDefault();
    const result = await request("/api/login", "POST", { email, returnTo });
    if (result) setMessage(result.message);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!chosen) return;
    const value = token;
    setToken("");
    const result = await request("/api/connection", "POST", {
      schoolId: chosen.id,
      customUrl: chosen.id === "custom" ? customUrl : undefined,
      token: value,
    });
    if (result) {
      await refresh();
      setMessage("Connected. Your course data is ready to read.");
    }
  }
  const filtered = schools.filter((s) =>
    `${s.name} ${s.url}`.toLowerCase().includes(query.toLowerCase()),
  );
  const step = !session?.email ? 1 : !chosen && !session.connection ? 2 : 3;
  return (
    <>
      <ol className="steps" aria-label="Connection steps">
        {["Sign in", "Find school", "Connect"].map((name, i) => (
          <li key={name} aria-current={step === i + 1 ? "step" : undefined}>
            <span>{i + 1}</span>
            {name}
          </li>
        ))}
      </ol>
      {!session && !message ? (
        <p role="status">Checking your connection…</p>
      ) : !session?.email ? (
        <>
          <h2>
            A quieter way
            <br />
            to keep up.
          </h2>
          <p>
            Sign in with your invited email to connect your own Canvas account.
          </p>
          <form onSubmit={login}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button disabled={busy}>
              {busy ? "Sending…" : "Email me a sign-in link"}
            </button>
          </form>
          <p className="fine">
            This private pilot uses email sign-in. ChatGPT account sign-in is
            not enabled yet.
          </p>
        </>
      ) : session.connection ? (
        <>
          <div className="connected-mark" aria-hidden="true">
            ✓
          </div>
          <h2>You’re connected.</h2>
          <p className="school-name">{session.connection.school_name}</p>
          <p>
            {session.connection.canvas_display_name}
            <br />
            <span className="muted">{session.email}</span>
          </p>
          <div className="next-step">
            <h3>Continue in ChatGPT</h3>
            <p>
              Use this MCP address in a custom connector after its OAuth client
              has been registered:
            </p>
            <code>
              {typeof window === "undefined" ? "" : window.location.origin}/mcp
            </code>
            <p className="fine">
              The private pilot requires connector setup. This does not install
              a public ChatGPT app.
            </p>
          </div>
          {returnTo &&
            returnTo.startsWith("/oauth/consent?authorization_id=") &&
            !returnTo.includes("//") && (
              <Link className="button" href={returnTo}>
                Continue authorization
              </Link>
            )}
          <div className="actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={async () => {
                const result = await request("/api/connection", "DELETE");
                if (result) {
                  await refresh();
                  setChosen(null);
                  setMessage(result.message);
                }
              }}
            >
              Disconnect school
            </button>
            <a
              href={`${session.connection.canvas_origin}/profile/settings`}
              target="_blank"
              rel="noreferrer"
            >
              Canvas settings
            </a>
          </div>
          <details className="account-options">
            <summary>Account options</summary>
            <button
              className="text-button"
              disabled={busy}
              onClick={async () => {
                if (await request("/api/logout", "POST")) await refresh();
              }}
            >
              Sign out everywhere
            </button>
            <button
              className="text-button danger"
              disabled={busy}
              onClick={async () => {
                if (
                  window.confirm(
                    "Delete your companion account and stored token? Your Canvas account will remain unchanged.",
                  )
                )
                  if (await request("/api/account", "DELETE")) await refresh();
              }}
            >
              Delete companion account
            </button>
          </details>
        </>
      ) : !chosen ? (
        <>
          <h2>Find your school.</h2>
          <p>Search the directory, or enter your school’s Canvas address.</p>
          <label htmlFor="school-search">School name</label>
          <input
            id="school-search"
            type="search"
            placeholder="Search schools…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="school-list" role="list" aria-label="Schools">
            {filtered.map((s) => (
              <button
                type="button"
                className="school-result"
                key={s.id}
                onClick={() => {
                  setChosen(s);
                  setMessage("");
                }}
              >
                <span>{s.name}</span>
                <small>{new URL(s.url).hostname}</small>
                <span className="select-icon" aria-hidden="true">
                  ＋
                </span>
              </button>
            ))}
            {!filtered.length && (
              <p>
                No matching school in the directory. Use its Canvas address
                below.
              </p>
            )}
          </div>
          <button className="text-button" onClick={() => setCustom(!custom)}>
            My school isn’t listed
          </button>
          {custom && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setChosen({
                  id: "custom",
                  name: "Your school",
                  url: customUrl,
                });
              }}
            >
              <label htmlFor="custom-url">Canvas website address</label>
              <input
                id="custom-url"
                type="url"
                placeholder="https://school.instructure.com"
                required
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
              />
              <button>Use this address</button>
            </form>
          )}
          <p className="fine">
            Schools may restrict access tokens. A directory entry does not
            guarantee your school allows this connection.
          </p>
        </>
      ) : (
        <>
          <button
            className="text-button back"
            onClick={() => {
              setChosen(null);
              setToken("");
              setMessage("");
            }}
          >
            ‹ Choose another school
          </button>
          <h2>Connect your Canvas.</h2>
          <p className="school-name">
            {chosen.id === "custom" ? customUrl : chosen.name}
          </p>
          <p>
            Use an access token from your own Canvas account. Set an expiry date
            when you create it.
          </p>
          <a
            className="guide-link"
            href={
              chosen.id === "custom"
                ? "/support"
                : `${chosen.url}/profile/settings`
            }
            target="_blank"
            rel="noreferrer"
          >
            Open Canvas account settings
          </a>
          <form onSubmit={save}>
            <label htmlFor="canvas-token">Canvas access token</label>
            <div className="token-input">
              <input
                id="canvas-token"
                type={showToken ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                required
                minLength={10}
                maxLength={4096}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your token here"
              />
              <button
                type="button"
                className="reveal"
                onClick={() => setShowToken(!showToken)}
                aria-label={showToken ? "Hide token" : "Show token"}
              >
                {showToken ? "Hide" : "Show"}
              </button>
            </div>
            <button disabled={busy}>
              {busy ? "Checking your connection…" : "Connect my account"}
            </button>
          </form>
          <p className="fine">
            Encrypted on our server. Never sent to ChatGPT. Only use a token
            that your school permits you to share with this personal tool.
          </p>
        </>
      )}
      {message && (
        <p
          className={isError ? "notice error" : "notice"}
          role={isError ? "alert" : "status"}
        >
          {message}
        </p>
      )}
    </>
  );
}
