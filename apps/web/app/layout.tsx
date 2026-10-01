import type { Metadata } from "next";
import Link from "next/link";
import "./style.css";
export const metadata: Metadata = {
  title: "Canvas Companion — your courses, within reach",
  description:
    "Connect your Canvas account to a private, read-only study companion.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <Link className="brand" href="/">
            <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
              <path d="M3 4h11v22H3zM17 4h10v16H17z" fill="currentColor" />
              <path d="M17 23h10v3H17z" fill="currentColor" />
            </svg>
            Canvas Companion
          </Link>
          <span className="pilot">Personal pilot</span>
        </header>
        {children}
        <footer>
          <span>
            Independent project by Luke Guo. Not affiliated with Instructure.
          </span>
          <nav>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/support">Help</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
