import { schools } from "@/lib/schools";
import { Onboarding } from "./onboarding";
export default function Home() {
  return (
    <main className="home">
      <section className="intro">
        <div className="book" aria-hidden="true">
          <div className="book-spine" />
          <div className="book-page">
            <span>Course notes</span>
            <i />
            <i />
            <i />
            <b>All in one conversation.</b>
            <i />
            <i />
          </div>
          <div className="book-tab">Read only</div>
        </div>
        <h1>
          Your courses.
          <br />
          Within reach.
        </h1>
        <p className="lede">
          Bring your assignments, course pages and module reading into ChatGPT.
          Start by connecting your school.
        </p>
        <ul className="promises">
          <li>Keep the link to every source.</li>
          <li>Your school token stays private.</li>
          <li>Disconnect whenever you need.</li>
        </ul>
      </section>
      <section className="setup" aria-label="Connect your account">
        <Onboarding schools={schools} />
      </section>
    </main>
  );
}
