"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Org, Volunteer, UrgentRequest } from "@/lib/types";
import { computeMatchScore, rankOpportunitiesForVolunteer } from "@/lib/matching";

type Tab = "urgent" | "opportunities" | "impact" | "handoffs";

const DEMO_VOLUNTEER: Volunteer = {
  id: "demo", user_id: null, name: "Demo Volunteer", age: 24, neighbourhood: "Kitsilano",
  languages: ["English", "Mandarin"],
  skills: ["Driving/transportation", "Tutoring/mentorship", "Translation/interpretation", "Event coordination"],
  interests: ["Food security", "Newcomer & immigrant support", "Youth services"],
  availability: "Flexible / as needed", hours_per_month: 12, has_vehicle: true,
  has_background_check: true, prior_experience: "Some (1-2 orgs)", created_at: new Date().toISOString(),
};

export default function VolunteerDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("urgent");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [urgentRequests, setUrgentRequests] = useState<(UrgentRequest & { org?: Org })[]>([]);
  const [rankedOrgs, setRankedOrgs] = useState<{ org: Org; score: number; breakdown: ReturnType<typeof computeMatchScore>["breakdown"] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondedRequests, setRespondedRequests] = useState<Record<string, "accepted" | "declined">>({});
  const volunteer = DEMO_VOLUNTEER;

  const handleAcceptUrgent = async (requestId: string) => {
    await supabase.from("urgent_responses").insert({ urgent_request_id: requestId, volunteer_id: volunteer.id, status: "accepted", responded_at: new Date().toISOString() });
    const req = urgentRequests.find((r) => r.id === requestId);
    if (req) {
      await supabase.from("urgent_requests").update({ people_confirmed: (req.people_confirmed || 0) + 1 }).eq("id", requestId);
      setUrgentRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, people_confirmed: (r.people_confirmed || 0) + 1 } : r));
    }
    setRespondedRequests((prev) => ({ ...prev, [requestId]: "accepted" }));
  };

  const handleDeclineUrgent = async (requestId: string) => {
    await supabase.from("urgent_responses").insert({ urgent_request_id: requestId, volunteer_id: volunteer.id, status: "declined", responded_at: new Date().toISOString() });
    setRespondedRequests((prev) => ({ ...prev, [requestId]: "declined" }));
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: orgData } = await supabase.from("orgs").select("*");
      const fetchedOrgs = (orgData || []) as Org[];
      setOrgs(fetchedOrgs);
      setRankedOrgs(rankOpportunitiesForVolunteer(volunteer, fetchedOrgs));
      const { data: urgentData } = await supabase.from("urgent_requests").select("*").eq("status", "active");
      if (urgentData && urgentData.length > 0) {
        setUrgentRequests((urgentData as UrgentRequest[]).map((req) => ({ ...req, org: fetchedOrgs.find((o) => o.id === req.org_id) })));
      }
      setLoading(false);
    }
    fetchData();
    const channel = supabase.channel("urgent-requests")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "urgent_requests" }, (payload) => {
        const nr = payload.new as UrgentRequest;
        setUrgentRequests((prev) => [{ ...nr, org: orgs.find((o) => o.id === nr.org_id) }, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "urgent_requests" }, (payload) => {
        const u = payload.new as UrgentRequest;
        setUrgentRequests((prev) => prev.map((r) => r.id === u.id ? { ...r, ...u, org: r.org } : r));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const criticalOrgs = rankedOrgs.filter(({ org }) => org.volunteer_urgency === "Critical" || org.volunteer_urgency === "High");

  const tabs: { id: Tab; label: string; alert?: boolean }[] = [
    { id: "urgent", label: "Crisis Alerts", alert: criticalOrgs.length > 0 || urgentRequests.length > 0 },
    { id: "opportunities", label: "Browse" },
    { id: "impact", label: "My Impact" },
    { id: "handoffs", label: "Handoffs" },
  ];

  const urgencyColor = (u: string) => ({ Critical: "var(--urgency-critical)", High: "var(--urgency-high)", Medium: "var(--urgency-medium)" }[u] || "var(--urgency-low)");
  const urgencyClass = (u: string) => ({ Critical: "urgency-critical", High: "urgency-high", Medium: "urgency-medium" }[u] || "urgency-low");
  const scoreColor = (s: number) => s >= 60 ? "var(--accent-green)" : s >= 35 ? "var(--urgency-medium)" : "var(--urgency-high)";

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", fontFamily: "var(--font-body)" }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.5rem", borderBottom: "1px solid var(--border-light)" }}>
        <Link href="/" style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text-primary)", textDecoration: "none" }}>
          match-<em style={{ color: "var(--accent-green)", fontStyle: "italic" }}>a</em>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{volunteer.name}</span>
          <Link href="/" className="btn btn-ghost" style={{ fontSize: "0.8rem", padding: "8px 14px" }}>Sign Out</Link>
        </div>
      </nav>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", padding: "1rem 1.5rem 0", borderBottom: "1px solid var(--border-light)" }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            position: "relative", padding: "0.6rem 1rem", fontSize: "0.85rem", fontWeight: 500, fontFamily: "var(--font-body)",
            color: activeTab === tab.id ? "var(--accent-green)" : "var(--text-muted)",
            borderBottom: activeTab === tab.id ? "2px solid var(--accent-green)" : "2px solid transparent",
            background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", cursor: "pointer",
          }}>
            {tab.label}
            {tab.alert && <span style={{ position: "absolute", top: 2, right: 2, width: 7, height: 7, borderRadius: "50%", background: "var(--urgency-critical)" }} />}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* ── CRISIS ALERTS ── */}
        {activeTab === "urgent" && (
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 500, marginBottom: "1.5rem" }}>
              <span style={{ color: "var(--urgency-critical)" }}>●</span> Organizations that need help now
            </h2>

            {urgentRequests.map((req) => {
              const score = req.org ? computeMatchScore(volunteer, req.org).score : 0;
              return (
                <div key={req.id} className="card" style={{ padding: "1.5rem", marginBottom: "1rem", borderLeft: "4px solid var(--urgency-critical)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.75rem" }}>
                    <div>
                      <span className="urgency-badge urgency-critical">Urgent Request</span>
                      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 500, marginTop: "0.5rem" }}>{req.title}</h3>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>{req.org?.account_name || req.org?.legal_name} — Vancouver</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--urgency-critical)" }}>
                        {new Date(req.deadline).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{req.people_confirmed} of {req.people_needed} spots filled</div>
                    </div>
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>{req.description}</p>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                    {req.skills_required?.map((s) => <span key={s} className="tag tag-skill">{s}</span>)}
                    {req.languages_required?.map((l) => <span key={l} className="tag" style={{ background: "var(--accent-matcha-pale)", color: "var(--accent-green-dark)", border: "1px solid var(--accent-green-light)" }}>{l}</span>)}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div className="score-bar" style={{ width: "6rem" }}><div className="score-bar-fill" style={{ width: `${score}%`, background: scoreColor(score) }} /></div>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: scoreColor(score) }}>{score}% match</span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {respondedRequests[req.id] === "accepted" ? (
                        <div className="btn" style={{ background: "var(--accent-matcha-pale)", color: "var(--accent-green)", cursor: "default", fontSize: "0.8rem" }}>✓ You&apos;re signed up!</div>
                      ) : respondedRequests[req.id] === "declined" ? (
                        <div className="btn" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)", cursor: "default", fontSize: "0.8rem" }}>Declined</div>
                      ) : (<>
                        <button onClick={() => handleDeclineUrgent(req.id)} className="btn btn-outline" style={{ fontSize: "0.8rem", padding: "8px 16px" }}>Decline</button>
                        <button onClick={() => handleAcceptUrgent(req.id)} className="btn btn-urgent" style={{ fontSize: "0.8rem", padding: "8px 16px" }}>I Can Help</button>
                      </>)}
                    </div>
                  </div>
                </div>
              );
            })}

            {criticalOrgs.map(({ org, score }) => (
              <div key={org.id} className="card card-interactive" style={{ padding: "1.5rem", marginBottom: "1rem", borderLeft: `4px solid ${urgencyColor(org.volunteer_urgency)}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.75rem" }}>
                  <div>
                    <span className={`urgency-badge ${urgencyClass(org.volunteer_urgency)}`}>{org.volunteer_urgency}</span>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 500, marginTop: "0.5rem" }}>{org.account_name || org.legal_name}</h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>{org.sector} — {org.city} · {org.org_size}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 500, color: urgencyColor(org.volunteer_urgency) }}>{org.volunteers_currently_needed}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>volunteers needed</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                  {org.skills_needed?.map((s) => <span key={s} className="tag tag-skill">{s}</span>)}
                  {org.languages_needed?.map((l) => <span key={l} className="tag" style={{ background: "var(--accent-matcha-pale)", color: "var(--accent-green-dark)", border: "1px solid var(--accent-green-light)" }}>{l}</span>)}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div className="score-bar" style={{ width: "6rem" }}><div className="score-bar-fill" style={{ width: `${score}%`, background: scoreColor(score) }} /></div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: scoreColor(score) }}>{score}% match</span>
                  </div>
                  <button className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "8px 16px" }}>I Can Help</button>
                </div>
              </div>
            ))}

            {criticalOrgs.length === 0 && urgentRequests.length === 0 && (
              <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
                <p style={{ color: "var(--text-muted)" }}>No active crisis alerts right now. Check back soon, or browse opportunities.</p>
              </div>
            )}
          </div>
        )}

        {/* ── BROWSE OPPORTUNITIES ── */}
        {activeTab === "opportunities" && (
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 500, marginBottom: "0.25rem" }}>Opportunities for you</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Ranked by compatibility with your skills, languages, and availability.</p>

            {rankedOrgs.map(({ org, score, breakdown }) => (
              <div key={org.id} className="card card-interactive" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.75rem" }}>
                  <div>
                    <span className={`urgency-badge ${urgencyClass(org.volunteer_urgency)}`}>{org.volunteer_urgency} need</span>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 500, marginTop: "0.5rem" }}>{org.account_name || org.legal_name}</h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>{org.sector} — {org.city} · {org.org_size}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 500, color: scoreColor(score) }}>{score}%</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>match</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  <span>Skills: {breakdown.skills}/35</span><span>Language: {breakdown.language}/25</span>
                  <span>Availability: {breakdown.availability}/20</span><span>Cause: {breakdown.cause_alignment}/10</span>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                  {org.skills_needed?.map((s) => {
                    const has = volunteer.skills.some((vs) => vs.toLowerCase() === s.toLowerCase());
                    return <span key={s} className={`tag ${has ? "tag-selected" : "tag-skill"}`}>{has ? "✓ " : ""}{s}</span>;
                  })}
                  {org.languages_needed?.map((l) => {
                    const has = volunteer.languages.some((vl) => vl.toLowerCase() === l.toLowerCase());
                    return <span key={l} className={`tag ${has ? "tag-selected" : ""}`} style={has ? {} : { background: "var(--accent-matcha-pale)", color: "var(--accent-green-dark)", border: "1px solid var(--accent-green-light)" }}>{has ? "✓ " : ""}{l}</span>;
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{org.volunteers_currently_needed} needed · {org.availability_preference}</span>
                  <button className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "8px 16px" }}>Volunteer</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── MY IMPACT ── */}
        {activeTab === "impact" && (
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 500, marginBottom: "1.5rem" }}>Your Impact</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
              {[
                { n: "24", label: "Hours volunteered", c: "var(--accent-green)" },
                { n: "8", label: "Shifts completed", c: "var(--accent-green)" },
                { n: "3", label: "Crisis responses", c: "var(--urgency-critical)" },
                { n: "5", label: "Week streak", c: "var(--urgency-medium)" },
              ].map((s) => (
                <div key={s.label} className="card" style={{ padding: "1.25rem", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 500, color: s.c }}>{s.n}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: "2rem", textAlign: "center", maxWidth: "360px", margin: "0 auto", background: "var(--accent-matcha-pale)" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--accent-green)", marginBottom: "0.5rem" }}>match-a</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 500, marginBottom: "0.25rem" }}>{volunteer.name}</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>volunteered 24 hours this month</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 500, color: "var(--accent-green)", marginBottom: "0.25rem" }}>200+</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>families helped through meal delivery</div>
              <button className="btn btn-primary" style={{ marginTop: "1.25rem", fontSize: "0.85rem" }}>Share Your Impact</button>
            </div>
          </div>
        )}

        {/* ── HANDOFFS ── */}
        {activeTab === "handoffs" && (
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 500, marginBottom: "0.5rem" }}>Role Handoffs</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              When you take on a role, any knowledge left by previous volunteers appears here.
            </p>
            <div className="card" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>Meal Delivery — East Van Route</h3>
                <span className="tag tag-skill">Inherited</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                <div><strong style={{ color: "var(--text-primary)" }}>Key contacts:</strong> Maria (kitchen coordinator, ext 204), Joe (warehouse, arrives 7am)</div>
                <div><strong style={{ color: "var(--text-primary)" }}>Recurring tasks:</strong> Pick up from 4885 Valley Dr by 9am, follow route sheet in shared drive, return bins by 1pm</div>
                <div><strong style={{ color: "var(--text-primary)" }}>Tips:</strong> Building at 41st needs buzzer code 7742. Mrs. Chen on 3rd floor needs meals left at door (mobility issues). Always bring extra bags.</div>
              </div>
              <div style={{ marginTop: "0.75rem", fontSize: "0.72rem", color: "var(--text-muted)" }}>Left by: Previous volunteer · 3 weeks ago</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
