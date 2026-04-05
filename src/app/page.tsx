import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5">
        <div
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--accent-green)" }}
        >
          rooted
        </div>
        <div className="flex gap-3">
          <Link
            href="/auth?role=volunteer"
            className="btn btn-outline text-sm"
          >
            I&apos;m a Volunteer
          </Link>
          <Link
            href="/auth?role=coordinator"
            className="btn btn-primary text-sm"
          >
            I&apos;m a Coordinator
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-8 py-20 text-center max-w-4xl mx-auto">
        <div
          className="urgency-badge urgency-critical mb-6 animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          4 organizations at critical capacity right now
        </div>

        <h1
          className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6 animate-fade-in"
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            animationDelay: "0.2s",
          }}
        >
          Your community
          <br />
          <span style={{ color: "var(--accent-green)" }}>needs you.</span>
        </h1>

        <p
          className="text-lg md:text-xl max-w-2xl mb-10 animate-fade-in"
          style={{
            color: "var(--text-secondary)",
            animationDelay: "0.3s",
            lineHeight: 1.6,
          }}
        >
          BC&apos;s nonprofits are losing volunteers faster than they can
          replace them. Rooted connects you to the causes you care about,
          mobilizes help when it&apos;s needed most, and makes sure no
          knowledge is lost along the way.
        </p>

        <div
          className="flex flex-col sm:flex-row gap-4 animate-fade-in"
          style={{ animationDelay: "0.4s" }}
        >
          <Link
            href="/auth?role=volunteer"
            className="btn btn-primary text-base px-8 py-3"
          >
            Start Volunteering
          </Link>
          <Link
            href="/auth?role=coordinator"
            className="btn btn-outline text-base px-8 py-3"
          >
            Register Your Organization
          </Link>
        </div>
      </section>

      {/* How It Works — 4 Layers */}
      <section
        className="px-8 py-20"
        style={{ background: "var(--bg-secondary)" }}
      >
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-3xl md:text-4xl font-bold text-center mb-4"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Four layers. One lifecycle.
          </h2>
          <p
            className="text-center mb-14 text-lg"
            style={{ color: "var(--text-secondary)" }}
          >
            From first sign-up to lasting impact.
          </p>

          <div className="grid md:grid-cols-2 gap-6 stagger-children">
            {/* Match */}
            <div className="card p-8">
              <div
                className="text-sm font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--accent-green)" }}
              >
                01 — Match
              </div>
              <h3 className="text-xl font-bold mb-2">
                Find your fit
              </h3>
              <p style={{ color: "var(--text-secondary)" }}>
                Tell us what you care about, what you&apos;re good at, and when
                you&apos;re free. Our matching algorithm connects you with
                organizations that align with your skills, language, and
                schedule.
              </p>
            </div>

            {/* Mobilize */}
            <div className="card p-8" style={{ borderColor: "var(--urgency-critical)", borderWidth: "1.5px" }}>
              <div
                className="text-sm font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--urgency-critical)" }}
              >
                02 — Mobilize
              </div>
              <h3 className="text-xl font-bold mb-2">
                Respond when it matters
              </h3>
              <p style={{ color: "var(--text-secondary)" }}>
                When a food bank&apos;s driver doesn&apos;t show up or a shelter
                is understaffed tonight, qualified volunteers get an instant
                alert. Accept in one tap.
              </p>
            </div>

            {/* Retain */}
            <div className="card p-8">
              <div
                className="text-sm font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--accent-orange)" }}
              >
                03 — Retain
              </div>
              <h3 className="text-xl font-bold mb-2">
                See your impact
              </h3>
              <p style={{ color: "var(--text-secondary)" }}>
                Track your hours, see the real-world results of your work, and
                stay connected through personalized engagement — not generic
                emails.
              </p>
            </div>

            {/* Preserve */}
            <div className="card p-8">
              <div
                className="text-sm font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--accent-blue)" }}
              >
                04 — Preserve
              </div>
              <h3 className="text-xl font-bold mb-2">
                Leave something behind
              </h3>
              <p style={{ color: "var(--text-secondary)" }}>
                When you move on, your knowledge doesn&apos;t have to. A simple
                handoff ensures the next volunteer inherits your tips, contacts,
                and insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="px-8 py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div
              className="text-3xl md:text-4xl font-bold"
              style={{ color: "var(--accent-green)" }}
            >
              29,000
            </div>
            <div
              className="text-sm mt-1"
              style={{ color: "var(--text-muted)" }}
            >
              Nonprofits in BC
            </div>
          </div>
          <div>
            <div
              className="text-3xl md:text-4xl font-bold"
              style={{ color: "var(--accent-green)" }}
            >
              86,000
            </div>
            <div
              className="text-sm mt-1"
              style={{ color: "var(--text-muted)" }}
            >
              People employed
            </div>
          </div>
          <div>
            <div
              className="text-3xl md:text-4xl font-bold"
              style={{ color: "var(--urgency-critical)" }}
            >
              $6.7B
            </div>
            <div
              className="text-sm mt-1"
              style={{ color: "var(--text-muted)" }}
            >
              Economic contribution
            </div>
          </div>
          <div>
            <div
              className="text-3xl md:text-4xl font-bold"
              style={{ color: "var(--urgency-critical)" }}
            >
              ↓
            </div>
            <div
              className="text-sm mt-1"
              style={{ color: "var(--text-muted)" }}
            >
              Volunteer rates still declining
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-8 py-6 text-center text-sm"
        style={{
          color: "var(--text-muted)",
          borderTop: "1px solid var(--border-light)",
        }}
      >
        Built for youCode 2026 — SAP Challenge: Strengthening BC&apos;s
        Nonprofit Workforce
      </footer>
    </main>
  );
}
