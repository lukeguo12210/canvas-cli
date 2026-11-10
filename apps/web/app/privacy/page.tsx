export default function Privacy() {
  return (
    <main className="narrow">
      <h1>Privacy for the personal pilot</h1>
      <p>
        Updated October 1, 2026. Canvas Companion is an independent project
        operated by Luke Guo.
      </p>
      <h2>What we store</h2>
      <p>
        Your sign-in email, application identity, school address, Canvas account
        ID and display name, and an encrypted Canvas access token. We store this
        data in the project’s personal Supabase account. The encryption key is
        kept separately in the project’s Vercel environment.
      </p>
      <h2>What ChatGPT receives</h2>
      <p>
        When you use a tool, it reads the requested courses, assignments,
        modules, pages or file metadata and returns selected fields and source
        links. The Canvas token is never included. ChatGPT processes those
        results according to the terms and privacy settings of your ChatGPT
        account.
      </p>
      <h2>Retention and security</h2>
      <p>
        Course content is fetched on demand and is not stored as a course
        archive. We do not intentionally log tokens, coursework, request bodies
        or signed file links. Hosting providers may retain access metadata such
        as request time and IP address under their own retention policies.
        Rate-limit counters contain internal account IDs or invited sign-in
        email addresses and are removed after 24 hours when maintenance runs.
      </p>
      <h2>Disconnect and deletion</h2>
      <p>
        Disconnecting removes the stored token from the live database
        immediately. Revoke your access token in Canvas settings to invalidate
        it at Canvas and anywhere else it is used. Deleting your companion
        account removes its live connection record and revokes our sessions.
        Provider backups may retain deleted records until their configured
        retention expires; we do not promise immediate deletion from backups.
      </p>
      <h2>Contact</h2>
      <p>
        Contact{" "}
        <a href="mailto:lukeguo12210@gmail.com">lukeguo12210@gmail.com</a> for
        privacy or deletion help. Never include an access token in email.
      </p>
    </main>
  );
}
