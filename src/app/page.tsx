"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import MatchaSplash from "@/components/MatchaSplash";

// ─────────────────────────────────────────────
// ADD YOUR PHOTOS HERE
// Put image files in your /public/slides/ folder
// then list the filenames below.
// Supported: .jpg .jpeg .png .webp
// Recommended size: 1200×1600px or taller (portrait works best)
//
// Example sources (free, no attribution required):
//   pexels.com — search "volunteering" or "community"
//   unsplash.com — search "nonprofit" or "helping"
// Download each image, rename it, drop it in /public/slides/
// ─────────────────────────────────────────────
const SLIDES = [
  { src: "/slides/slide1.jpg", caption: "Vancouver Food Bank, this morning" },
  {
    src: "/slides/slide2.jpg",
    caption: "Burnaby community kitchen, last week",
  },
  { src: "/slides/slide3.jpg", caption: "Surrey seniors centre, ongoing" },
  {
    src: "/slides/slide4.jpg",
    caption: "Richmond youth shelter, every weekend",
  },
  {
    src: "/slides/slide5.jpg",
    caption: "North Shore trail cleanup, last Saturday",
  },
];

function Slideshow() {
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 4800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#c8d8b8",
      }}
    >
      {/* SLIDING TRACK */}
      <div
        style={{
          display: "flex",
          width: `${SLIDES.length * 100}%`,
          height: "100%",
          transform: `translateX(-${current * (100 / SLIDES.length)}%)`,
          transition: "transform 0.6s cubic-bezier(0.77, 0, 0.175, 1)", // smooth but not floaty
        }}
      >
        {SLIDES.map((slide, i) => (
          <img
            key={i}
            src={slide.src}
            alt={slide.caption}
            style={{
              width: `${100 / SLIDES.length}%`,
              height: "100%",
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
        ))}
      </div>

      {/* Tint overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(38,60,28,0.08)",
        }}
      />

      {/* Caption */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "3rem 2rem 1.75rem",
          background:
            "linear-gradient(to top, rgba(12,20,8,0.65) 0%, transparent 100%)",
        }}
      >
        <div
          style={{
            fontSize: "0.68rem",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.55)",
            marginBottom: "5px",
          }}
        >
          Happening right now in BC
        </div>

        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.95rem",
            fontStyle: "italic",
            color: "rgba(255,255,255,0.88)",
            marginBottom: "1.25rem",
          }}
        >
          {SLIDES[current].caption}
        </div>

        {/* Dots */}
        <div style={{ display: "flex", gap: "6px" }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                height: "5px",
                width: i === current ? "22px" : "5px",
                borderRadius: "3px",
                background: i === current ? "white" : "rgba(255,255,255,0.35)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
      </div>

      {/* Click zones */}
      <button
        onClick={() => goTo((current - 1 + SLIDES.length) % SLIDES.length)}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: "6rem",
          width: "40%",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      />
      <button
        onClick={() => goTo((current + 1) % SLIDES.length)}
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: "6rem",
          width: "40%",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      />
    </div>
  );
}

export default function Home() {
  return (
    <MatchaSplash>
      <main
        style={{
          background: "var(--bg-primary)",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Floating logo — no header bar ── */}
        <div
          style={{
            position: "fixed",
            top: "1.75rem",
            left: "2.5rem",
            zIndex: 50,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.9rem",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              userSelect: "none",
              lineHeight: 1,
            }}
          >
            match-
            <em style={{ color: "var(--accent-green)", fontStyle: "italic" }}>
              a
            </em>
          </div>
        </div>

        {/* ── Hero — full viewport, split ── */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            height: "100vh",
          }}
        >
          {/* Left — text */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "6rem 4rem 4rem",
              gap: "1.75rem",
            }}
          >
          

            <h1
              className="animate-fade-up"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(3rem, 5vw, 5.2rem)",
                fontWeight: 500,
                lineHeight: 1.04,
                letterSpacing: "-0.04em",
                color: "var(--text-primary)",
                animationDelay: "0.1s",
              }}
            >
              Your community
              <br />
              <em style={{ color: "var(--accent-green)", fontStyle: "italic" }}>
                needs you.
              </em>
            </h1>

            <p
              className="animate-fade-up"
              style={{
                fontSize: "1.05rem",
                lineHeight: 1.75,
                color: "var(--text-secondary)",
                maxWidth: "340px",
                animationDelay: "0.18s",
              }}
            >
              Find a way to help that fits your life. We connect you with local
              nonprofits in minutes — no long forms, no waiting.
            </p>

            <div
              className="animate-fade-up"
              style={{
                display: "flex",
                gap: "0.75rem",
                flexWrap: "wrap",
                animationDelay: "0.26s",
              }}
            >
              <Link
                href="/auth?role=volunteer"
                className="btn btn-primary"
                style={{ fontSize: "0.95rem", padding: "13px 26px" }}
              >
                Start helping →
              </Link>
              <Link
                href="/auth?role=coordinator"
                className="btn btn-outline"
                style={{ fontSize: "0.95rem", padding: "13px 26px" }}
              >
                I run an org
              </Link>
            </div>
          </div>

          {/* Right — photo slideshow */}
          <Slideshow />
        </section>

        {/* ── One sentence ── */}
        <section
          style={{
            borderTop: "1px solid var(--border-light)",
            borderBottom: "1px solid var(--border-light)",
            background: "var(--bg-secondary)",
            padding: "3rem 3.5rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.2rem, 2vw, 1.6rem)",
              fontStyle: "italic",
              fontWeight: 400,
              lineHeight: 1.5,
              color: "var(--text-primary)",
              maxWidth: "580px",
              margin: "0 auto",
              letterSpacing: "-0.01em",
            }}
          >
            BC has 29,000 nonprofits and not enough volunteers.{" "}
            <span style={{ color: "var(--accent-green)" }}>
              Let&apos;s fix that.
            </span>
          </p>
        </section>

        {/* ── How it works ── */}
        <section style={{ padding: "6rem 3.5rem" }}>
          <div
            style={{
              maxWidth: "860px",
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "1fr 2fr",
              gap: "5rem",
              alignItems: "start",
            }}
          >
            <div style={{ position: "sticky", top: "2rem" }}>
              <div
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  marginBottom: "1rem",
                }}
              >
                How it works
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(1.5rem, 2vw, 1.9rem)",
                  fontWeight: 500,
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                  color: "var(--text-primary)",
                }}
              >
                Simple steps.
                <br />
                <em style={{ color: "var(--accent-green)" }}>Real impact.</em>
              </h2>
            </div>

            <div>
              {[
                {
                  n: "01",
                  title: "Get matched",
                  body: "Tell us what you care about and when you're free. We find the right local organization for you — usually in under two minutes.",
                },
                {
                  n: "02",
                  title: "Help when it matters",
                  body: "When a food bank or shelter needs someone today, you get a simple message. Tap once to say yes. No back-and-forth.",
                },
                {
                  n: "03",
                  title: "See what you changed",
                  body: "Track your hours and see the real difference your time made. Simple and clear — no complicated dashboards.",
                },
                {
                  n: "04",
                  title: "Pass it on",
                  body: "When you move on, share what you learned. Your knowledge stays, even when you can't.",
                },
              ].map((s, i, arr) => (
                <div
                  key={s.n}
                  style={{
                    paddingBottom: i < arr.length - 1 ? "2.5rem" : 0,
                    marginBottom: i < arr.length - 1 ? "2.5rem" : 0,
                    borderBottom:
                      i < arr.length - 1
                        ? "1px solid var(--border-light)"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "1rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "0.8rem",
                        fontStyle: "italic",
                        color: "var(--text-muted)",
                        minWidth: "24px",
                      }}
                    >
                      {s.n}
                    </span>
                    <h3
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.15rem",
                        fontWeight: 500,
                        letterSpacing: "-0.01em",
                        color: "var(--text-primary)",
                      }}
                    >
                      {s.title}
                    </h3>
                  </div>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      lineHeight: 1.75,
                      color: "var(--text-secondary)",
                      paddingLeft: "2rem",
                    }}
                  >
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Footer with CTA ── */}
        <footer
          style={{
            borderTop: "1px solid var(--border-light)",
            padding: "2.5rem 3.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1.5rem",
            background: "var(--bg-secondary)",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.1rem",
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: "0.25rem",
              }}
            >
              match-<em style={{ color: "var(--accent-green)" }}>a</em>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              youCode 2026 — SAP Challenge: Strengthening BC&apos;s Nonprofit
              Workforce
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.625rem" }}>
            <Link
              href="/auth?role=volunteer"
              className="btn btn-primary"
              style={{ fontSize: "0.875rem" }}
            >
              Start helping →
            </Link>
            <Link
              href="/auth?role=coordinator"
              className="btn btn-outline"
              style={{ fontSize: "0.875rem" }}
            >
              Register your org
            </Link>
          </div>
        </footer>
      </main>
    </MatchaSplash>
  );
}
