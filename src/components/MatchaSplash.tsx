"use client";
import { useState, useEffect } from "react";

export default function MatchaSplash({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"splash"|"rising"|"hold"|"falling"|"fade"|"done">("splash");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("rising"), 400);
    const t2 = setTimeout(() => setPhase("hold"), 2200);
    const t3 = setTimeout(() => setPhase("falling"), 2600);
    const t4 = setTimeout(() => setPhase("fade"), 3800);
    const t5 = setTimeout(() => setPhase("done"), 4300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

  const covered = phase === "rising" || phase === "hold";
  const hidden = "translateY(calc(100% + 80px))";
  const pos = { splash: hidden, rising: "translateY(0%)", hold: "translateY(0%)", falling: hidden, fade: hidden, done: hidden }[phase];
  const trans = { rising: "transform 1.6s cubic-bezier(0.05,0.7,0.15,1)", falling: "transform 1.0s cubic-bezier(0.4,0,0.8,0.3)" }[phase as string] || "transform 0s";
  const textVisible = phase !== "falling" && phase !== "fade" && phase !== "done";
  const showSplash = phase !== "done";
  const showPage = phase === "fade" || phase === "done";

  return (
    <>
      <div style={{ opacity: showPage ? 1 : 0, transition: "opacity 0.5s ease" }}>{children}</div>
      {showSplash && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, overflow: "hidden", background: "var(--bg-primary,#f6f5ee)", opacity: phase === "fade" ? 0 : 1, transition: "opacity 0.4s ease", pointerEvents: phase === "fade" ? "none" : "auto" }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 3, pointerEvents: "none" }}>
            <div style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: "clamp(3rem,8vw,5rem)", fontWeight: 500, letterSpacing: "-0.02em", color: covered ? "#fff" : "#1a1d14", transition: "color 0.5s ease, opacity 0.4s ease", opacity: textVisible ? 1 : 0 }}>
              match-<em style={{ color: covered ? "#e4eed8" : "#7a9e6b", fontStyle: "italic", transition: "color 0.5s ease" }}>a</em>
            </div>
            <div style={{ fontFamily: "'Outfit',system-ui,sans-serif", marginTop: "1.2rem", fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: covered ? "rgba(255,255,255,0.5)" : "rgba(83,96,69,0.5)", transition: "color 0.5s ease, opacity 0.3s ease", opacity: textVisible ? 1 : 0 }}>
              match-a-volunteer · match-a-nonprofit
            </div>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "calc(100% + 80px)", background: "#7a9e6b", transform: pos, transition: trans, zIndex: 2 }}>
            <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ position: "absolute", top: "-79px", left: 0, width: "100%", height: "80px", display: "block" }}>
              <path fill="#7a9e6b"><animate attributeName="d" dur="7s" repeatCount="indefinite" values="M0,50 Q360,15 720,50 Q1080,80 1440,50 L1440,80 L0,80 Z;M0,50 Q360,80 720,50 Q1080,15 1440,50 L1440,80 L0,80 Z;M0,50 Q360,15 720,50 Q1080,80 1440,50 L1440,80 L0,80 Z" /></path>
              <path fill="#6b8e5c" opacity="0.4"><animate attributeName="d" dur="9s" repeatCount="indefinite" values="M0,55 Q400,30 800,55 Q1200,75 1440,55 L1440,80 L0,80 Z;M0,55 Q400,75 800,55 Q1200,30 1440,55 L1440,80 L0,80 Z;M0,55 Q400,30 800,55 Q1200,75 1440,55 L1440,80 L0,80 Z" /></path>
            </svg>
          </div>
        </div>
      )}
    </>
  );
}
