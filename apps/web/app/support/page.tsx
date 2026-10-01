export default function Support() {
  return (
    <main className="narrow">
      <h1>Connecting your school</h1>
      <h2>Find your Canvas address</h2>
      <p>
        Open Canvas through your school, then copy the website origin, such as
        https://school.instructure.com. Leave off course paths. Search the
        directory or choose “My school isn’t listed.”
      </p>
      <h2>Create a personal access token</h2>
      <p>
        If your school permits personal tokens, open Canvas Account → Settings →
        Approved Integrations → New Access Token. Give it a clear purpose and an
        expiry date. Paste it only into the secure connection form on this site.
        Never put it into ChatGPT, an issue, a screenshot or email.
      </p>
      <h2>If a connection fails</h2>
      <p>
        Check your Canvas address, token expiry and school policy. Some school
        login addresses redirect to another Canvas host; use the actual Canvas
        host shown after signing in. If your school disables access tokens, this
        connection method is unavailable.
      </p>
      <h2>Using ChatGPT</h2>
      <p>
        This is a private MCP service, not a published ChatGPT app. Your
        connector needs an OAuth client registered for the exact callback URL
        shown in ChatGPT. Once connected, ask about courses or assignments.
        ChatGPT sign-in is not yet available for this project.
      </p>
      <p>
        For help, contact{" "}
        <a href="mailto:lukeguo12210@gmail.com">lukeguo12210@gmail.com</a>.
        Include the school name and a description of the error, but no token or
        private course content.
      </p>
    </main>
  );
}
