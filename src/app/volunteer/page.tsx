"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Org, Volunteer, UrgentRequest } from "@/lib/types";
import { computeMatchScore, rankOpportunitiesForVolunteer } from "@/lib/matching";

type Tab = "browse" | "plans" | "impact" | "handoffs";

type RankedOrg = {
  org: Org;
  score: number;
  breakdown: ReturnType<typeof computeMatchScore>["breakdown"];
};

type PlannedContribution = {
  id: string;
  title: string;
  orgName: string;
  location: string;
  timing: string;
  details: string;
  match: number;
  type: "urgent" | "opportunity";
};

const DEMO_VOLUNTEER: Volunteer = {
  id: "demo",
  user_id: null,
  name: "Demo Volunteer",
  age: 24,
  neighbourhood: "Kitsilano",
  languages: ["English", "Mandarin"],
  skills: [
    "Driving/transportation",
    "Tutoring/mentorship",
    "Translation/interpretation",
    "Event coordination",
  ],
  interests: ["Food security", "Newcomer & immigrant support", "Youth services"],
  availability: "Flexible / as needed",
  hours_per_month: 12,
  has_vehicle: true,
  has_background_check: true,
  prior_experience: "Some (1-2 orgs)",
  created_at: new Date().toISOString(),
};

// ── Card hover style helper ───────────────────────────────────────
// Lifts the card, deepens the shadow, and "glows" the left border via box-shadow.
function cardHoverStyle(isHovered: boolean, accentColor: string): React.CSSProperties {
  return {
    transform: isHovered ? "translateY(-3px)" : "translateY(0px)",
    boxShadow: isHovered
      ? `0 14px 40px rgba(0,0,0,0.10), -3px 0 0 0 ${accentColor}`
      : "var(--shadow-sm)",
    background: isHovered ? "rgba(255,255,255,1)" : "var(--bg-card)",
    transition:
      "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 300ms ease, background 200ms ease",
  };
}

// ── Score bar — stretches to full value on hover ──────────────────
function ScoreBar({ score, color, animate }: { score: number; color: string; animate: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

  return (
    <div style={{ width: "6rem", height: "5px", borderRadius: "4px", background: "var(--border-light)", overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          borderRadius: "4px",
          background: color,
          width: mounted ? `${score}%` : "0%",
          transition: animate
            ? "width 520ms cubic-bezier(0.34, 1.2, 0.64, 1)"
            : "width 700ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      />
    </div>
  );
}

// ── Score/number — pops on hover with a spring scale ─────────────
function ScoreNumber({
  value, color, isHovered, unit,
}: { value: number; color: string; isHovered: boolean; unit?: string }) {
  return (
    <div style={{ textAlign: "right" }}>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.5rem",
          fontWeight: 500,
          color,
          display: "inline-block",
          transform: isHovered ? "scale(1.14)" : "scale(1)",
          transition: "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), color 200ms ease",
        }}
      >
        {value}
      </span>
      {unit && (
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>{unit}</div>
      )}
    </div>
  );
}

// ── Expandable details — grid-template-rows trick (no maxHeight jank) ──
function ExpandedDetails({ expanded, children }: { expanded: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: expanded ? "1fr" : "0fr",
        opacity: expanded ? 1 : 0,
        marginTop: expanded ? "1rem" : "0",
        paddingTop: expanded ? "1rem" : "0",
        borderTop: expanded ? "1px solid var(--border-light)" : "1px solid transparent",
        transition:
          "grid-template-rows 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 260ms ease, margin 320ms ease, padding 320ms ease, border-color 200ms ease",
      }}
    >
      <div
        style={{
          overflow: "hidden",
          display: "grid",
          gap: "0.45rem",
          transform: expanded ? "translateY(0)" : "translateY(-6px)",
          transition: "transform 320ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function VolunteerDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("browse");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [urgentRequests, setUrgentRequests] = useState<(UrgentRequest & { org?: Org })[]>([]);
  const [rankedOrgs, setRankedOrgs] = useState<RankedOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondedRequests, setRespondedRequests] = useState<Record<string, "accepted" | "declined">>({});
  const [plannedContributions, setPlannedContributions] = useState<PlannedContribution[]>([]);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [hoveredCancelPlan, setHoveredCancelPlan] = useState<string | null>(null);
  const volunteer = DEMO_VOLUNTEER;

  const urgencyColor = (urgency: string) =>
    ({ Critical: "var(--urgency-critical)", High: "var(--urgency-high)", Medium: "var(--urgency-medium)" }[urgency] || "var(--urgency-low)");
  const urgencyClass = (urgency: string) =>
    ({ Critical: "urgency-critical", High: "urgency-high", Medium: "urgency-medium" }[urgency] || "urgency-low");
  const scoreColor = (score: number) =>
    score >= 60 ? "var(--accent-green)" : score >= 35 ? "var(--urgency-medium)" : "var(--urgency-high)";
  const describeAvailability = (value: string) => {
    if (value === "Flexible / as needed") return "Flexible, short notice";
    if (value === "Weekdays only") return "Weekdays";
    if (value === "Weekends only") return "Weekends";
    return value.toLowerCase();
  };
  const describeOrgCommitment = (org: Org) =>
    `${org.volunteer_urgency === "Critical" ? "2-3 hrs" : "1-2 hrs"} on ${describeAvailability(org.availability_preference)}`;
  const describeUrgentCommitment = (request: UrgentRequest) =>
    `${request.duration_hours} hr${request.duration_hours === 1 ? "" : "s"} · ${new Date(request.deadline).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}`;

  const addPlannedContribution = (contribution: PlannedContribution) => {
    setPlannedContributions((prev) =>
      prev.some((item) => item.id === contribution.id) ? prev : [contribution, ...prev]
    );
  };

  const removePlannedContribution = (id: string) => {
    setPlannedContributions((prev) => prev.filter((item) => item.id !== id));
    if (id.startsWith("urgent-")) {
      const requestId = id.replace("urgent-", "");
      setRespondedRequests((prev) => { const next = { ...prev }; delete next[requestId]; return next; });
      setUrgentRequests((prev) =>
        prev.map((item) =>
          item.id === requestId && item.people_confirmed > 0
            ? { ...item, people_confirmed: item.people_confirmed - 1 }
            : item
        )
      );
    }
  };

  const handleAcceptUrgent = async (requestId: string) => {
    const request = urgentRequests.find((item) => item.id === requestId);
    try {
      await supabase.from("urgent_responses").insert({
        urgent_request_id: requestId, volunteer_id: volunteer.id,
        status: "accepted", responded_at: new Date().toISOString(),
      });
    } catch { /* demo fallback */ }

    if (request) {
      setUrgentRequests((prev) =>
        prev.map((item) => item.id === requestId ? { ...item, people_confirmed: (item.people_confirmed || 0) + 1 } : item)
      );
      addPlannedContribution({
        id: `urgent-${request.id}`,
        title: request.title,
        orgName: request.org?.account_name || request.org?.legal_name || "Organization",
        location: request.is_remote ? "Remote" : request.org?.city || "BC",
        timing: describeUrgentCommitment(request),
        details: request.description,
        match: request.org ? computeMatchScore(volunteer, request.org).score : 0,
        type: "urgent",
      });
    }
    setRespondedRequests((prev) => ({ ...prev, [requestId]: "accepted" }));
    setActiveTab("plans");
  };

  const handleDeclineUrgent = async (requestId: string) => {
    try {
      await supabase.from("urgent_responses").insert({
        urgent_request_id: requestId, volunteer_id: volunteer.id,
        status: "declined", responded_at: new Date().toISOString(),
      });
    } catch { /* demo fallback */ }
    setRespondedRequests((prev) => ({ ...prev, [requestId]: "declined" }));
  };

  const handleVolunteerForOrg = (org: Org, score: number) => {
    addPlannedContribution({
      id: `org-${org.id}`,
      title: `${org.account_name || org.legal_name} shift`,
      orgName: org.account_name || org.legal_name,
      location: `${org.city}, ${org.province}`,
      timing: describeOrgCommitment(org),
      details: `${org.volunteers_currently_needed} volunteers needed for ${org.sector.toLowerCase()} support.`,
      match: score,
      type: "opportunity",
    });
    setActiveTab("plans");
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
        setUrgentRequests((urgentData as UrgentRequest[]).map((r) => ({ ...r, org: fetchedOrgs.find((o) => o.id === r.org_id) })));
      }
      setLoading(false);
    }
    fetchData();

    const channel = supabase
      .channel("urgent-requests")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "urgent_requests" }, (payload) => {
        const r = payload.new as UrgentRequest;
        setUrgentRequests((prev) => [{ ...r, org: orgs.find((o) => o.id === r.org_id) }, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "urgent_requests" }, (payload) => {
        const updated = payload.new as UrgentRequest;
        setUrgentRequests((prev) =>
          prev.map((r) => r.id === updated.id ? { ...r, ...updated, org: r.org } : r)
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs: { id: Tab; label: string; alert?: boolean }[] = [
    { id: "browse", label: "Browse", alert: urgentRequests.length > 0 },
    { id: "plans", label: "My Plans" },
    { id: "impact", label: "My Impact" },
    { id: "handoffs", label: "Handoffs" },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", fontFamily: "var(--font-body)" }}>

      {/* ── Nav ── */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.5rem", borderBottom: "1px solid var(--border-light)" }}>
        <Link href="/" style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text-primary)", textDecoration: "none" }}>
          match-<em style={{ color: "var(--accent-green)", fontStyle: "italic" }}>a</em>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{volunteer.name}</span>
          <Link href="/" className="btn btn-ghost" style={{ fontSize: "0.8rem", padding: "8px 14px" }}>Sign Out</Link>
        </div>
      </nav>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: "4px", padding: "1rem 1.5rem 0", borderBottom: "1px solid var(--border-light)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              position: "relative", padding: "0.6rem 1rem",
              fontSize: "0.85rem", fontWeight: 500, fontFamily: "var(--font-body)",
              color: activeTab === tab.id ? "var(--accent-green)" : "var(--text-muted)",
              borderBottom: activeTab === tab.id ? "2px solid var(--accent-green)" : "2px solid transparent",
              background: "none", borderTop: "none", borderLeft: "none", borderRight: "none",
              cursor: "pointer", transition: "color 180ms ease",
            }}
          >
            {tab.label}
            {tab.alert && (
              <span style={{ position: "absolute", top: 2, right: 2, width: 7, height: 7, borderRadius: "50%", background: "var(--urgency-critical)" }} />
            )}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* ══ BROWSE ══ */}
        {activeTab === "browse" && (
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 500, marginBottom: "0.25rem" }}>
              Browse ways to help
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Hover to see more details, then check in when something fits.
            </p>

            {/* Urgent request cards */}
            {urgentRequests.map((request) => {
              const score = request.org ? computeMatchScore(volunteer, request.org).score : 0;
              const cardId = `urgent-${request.id}`;
              const isHovered = hoveredCard === cardId;

              return (
                <div
                  key={request.id}
                  className="card card-interactive"
                  onMouseEnter={() => setHoveredCard(cardId)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    padding: "1.5rem",
                    marginBottom: "1rem",
                    borderLeft: "4px solid var(--urgency-critical)",
                    cursor: "default",
                    ...cardHoverStyle(isHovered, "var(--urgency-critical)"),
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.75rem" }}>
                    <div>
                      <span className="urgency-badge urgency-critical">Urgent Request</span>
                      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 500, marginTop: "0.5rem" }}>
                        {request.title}
                      </h3>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                        {request.org?.account_name || request.org?.legal_name} · {request.org?.city || "BC"}
                      </p>
                    </div>
                    <ScoreNumber
                      value={request.people_needed - request.people_confirmed}
                      color="var(--urgency-critical)"
                      isHovered={isHovered}
                      unit="spots left"
                    />
                  </div>

                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                    {request.description}
                  </p>

                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                    {request.skills_required?.map((skill) => (
                      <span key={skill} className="tag tag-skill">{skill}</span>
                    ))}
                    {request.languages_required?.map((language) => (
                      <span key={language} className="tag tag-language">{language}</span>
                    ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <ScoreBar score={score} color={scoreColor(score)} animate={isHovered} />
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: scoreColor(score), transition: "color 200ms ease" }}>
                        {score}% match
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {respondedRequests[request.id] === "accepted" ? (
                        <div className="btn" style={{ background: "var(--accent-green-light)", color: "var(--accent-green)", cursor: "default", fontSize: "0.8rem" }}>Checked in</div>
                      ) : respondedRequests[request.id] === "declined" ? (
                        <div className="btn" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)", cursor: "default", fontSize: "0.8rem" }}>Declined</div>
                      ) : (
                        <>
                          <button onClick={() => handleDeclineUrgent(request.id)} className="btn btn-outline" style={{ fontSize: "0.8rem", padding: "8px 16px" }}>Decline</button>
                          <button onClick={() => handleAcceptUrgent(request.id)} className="btn btn-urgent" style={{ fontSize: "0.8rem", padding: "8px 16px" }}>I Can Help</button>
                        </>
                      )}
                    </div>
                  </div>

                  <ExpandedDetails expanded={isHovered}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      <strong style={{ color: "var(--text-primary)" }}>Location:</strong>{" "}
                      {request.is_remote ? "Remote" : request.org?.city || "BC"}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      <strong style={{ color: "var(--text-primary)" }}>Availability:</strong>{" "}
                      {describeAvailability(request.org?.availability_preference || volunteer.availability)}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      <strong style={{ color: "var(--text-primary)" }}>When & length:</strong>{" "}
                      {describeUrgentCommitment(request)}
                    </div>
                  </ExpandedDetails>
                </div>
              );
            })}

            {/* Org opportunity cards */}
            {rankedOrgs.map(({ org, score, breakdown }) => {
              const cardId = `org-${org.id}`;
              const isHovered = hoveredCard === cardId;
              const isPlanned = plannedContributions.some((item) => item.id === cardId);
              const accentColor = urgencyColor(org.volunteer_urgency);

              return (
                <div
                  key={org.id}
                  className="card card-interactive"
                  onMouseEnter={() => setHoveredCard(cardId)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    padding: "1.5rem",
                    marginBottom: "1rem",
                    borderLeft: `4px solid ${accentColor}`,
                    cursor: "default",
                    ...cardHoverStyle(isHovered, accentColor),
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.75rem" }}>
                    <div>
                      <span className={`urgency-badge ${urgencyClass(org.volunteer_urgency)}`}>
                        {org.volunteer_urgency} need
                      </span>
                      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 500, marginTop: "0.5rem" }}>
                        {org.account_name || org.legal_name}
                      </h3>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                        {org.sector} · {org.city}
                      </p>
                    </div>
                    <ScoreNumber value={score} color={scoreColor(score)} isHovered={isHovered} unit="match" />
                  </div>

                  {/* Score breakdown — fades up to full opacity on hover */}
                  <div style={{
                    display: "flex", gap: "1rem", marginBottom: "1rem",
                    fontSize: "0.72rem", color: "var(--text-muted)", flexWrap: "wrap",
                    opacity: isHovered ? 1 : 0.38,
                    transform: isHovered ? "translateY(0)" : "translateY(2px)",
                    transition: "opacity 250ms ease, transform 250ms ease",
                  }}>
                    <span>Skills {breakdown.skills}/35</span>
                    <span>Language {breakdown.language}/25</span>
                    <span>Availability {breakdown.availability}/20</span>
                    <span>Cause {breakdown.cause_alignment}/10</span>
                  </div>

                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                    {org.skills_needed?.map((skill) => {
                      const hasSkill = volunteer.skills.some((v) => v.toLowerCase() === skill.toLowerCase());
                      return (
                        <span key={skill} className={`tag ${hasSkill ? "tag-selected" : "tag-skill"}`}>
                          {hasSkill ? "✓ " : ""}{skill}
                        </span>
                      );
                    })}
                    {org.languages_needed?.map((language) => {
                      const hasLanguage = volunteer.languages.some((v) => v.toLowerCase() === language.toLowerCase());
                      return (
                        <span key={language} className={`tag ${hasLanguage ? "tag-selected" : ""}`}
                          style={hasLanguage ? {} : { background: "var(--accent-green-light)", color: "var(--accent-green)", border: "1px solid var(--accent-green-light)" }}>
                          {hasLanguage ? "✓ " : ""}{language}
                        </span>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <ScoreBar score={score} color={scoreColor(score)} animate={isHovered} />
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: scoreColor(score) }}>
                        {score}% match
                      </span>
                    </div>
                    {isPlanned ? (
                      <div className="btn" style={{ background: "var(--accent-green-light)", color: "var(--accent-green)", cursor: "default", fontSize: "0.8rem" }}>Checked in</div>
                    ) : (
                      <button onClick={() => handleVolunteerForOrg(org, score)} className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "8px 16px" }}>
                        I Can Help
                      </button>
                    )}
                  </div>

                  <ExpandedDetails expanded={isHovered}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      <strong style={{ color: "var(--text-primary)" }}>Location:</strong> {org.city}, {org.province}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      <strong style={{ color: "var(--text-primary)" }}>Availability:</strong> {describeAvailability(org.availability_preference)}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      <strong style={{ color: "var(--text-primary)" }}>When & length:</strong> {describeOrgCommitment(org)}
                    </div>
                  </ExpandedDetails>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ PLANS ══ */}
        {activeTab === "plans" && (
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 500, marginBottom: "0.25rem" }}>My Plans</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Events and shifts you&apos;ve checked into appear here.
            </p>
            {plannedContributions.map((item) => (
              <div key={item.id} className="card" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.75rem" }}>
                  <div>
                    <span className={`urgency-badge ${item.type === "urgent" ? "urgency-critical" : "urgency-low"}`}>
                      {item.type === "urgent" ? "Checked in" : "Planned"}
                    </span>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 500, marginTop: "0.5rem" }}>{item.title}</h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>{item.orgName}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 500, color: scoreColor(item.match) }}>{item.match}%</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>match</div>
                  </div>
                </div>
                <div style={{ display: "grid", gap: "0.45rem", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  <div><strong style={{ color: "var(--text-primary)" }}>Location:</strong> {item.location}</div>
                  <div><strong style={{ color: "var(--text-primary)" }}>Availability:</strong> {item.timing}</div>
                  <div><strong style={{ color: "var(--text-primary)" }}>Details:</strong> {item.details}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                  <button
                    type="button"
                    onClick={() => removePlannedContribution(item.id)}
                    onMouseEnter={() => setHoveredCancelPlan(item.id)}
                    onMouseLeave={() => setHoveredCancelPlan(null)}
                    className="btn"
                    style={{
                      fontSize: "0.8rem", padding: "8px 16px",
                      background: hoveredCancelPlan === item.id ? "var(--urgency-critical)" : "rgba(214, 40, 40, 0.08)",
                      color: hoveredCancelPlan === item.id ? "white" : "var(--urgency-critical)",
                      border: hoveredCancelPlan === item.id ? "1.5px solid var(--urgency-critical)" : "1.5px solid rgba(214, 40, 40, 0.22)",
                      transition: "background 180ms ease, color 180ms ease, border-color 180ms ease",
                    }}
                  >
                    Cancel plan
                  </button>
                </div>
              </div>
            ))}
            {plannedContributions.length === 0 && (
              <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
                <p style={{ color: "var(--text-muted)" }}>You haven&apos;t checked into anything yet. Browse opportunities to get started.</p>
              </div>
            )}
          </div>
        )}

        {/* ══ IMPACT ══ */}
        {activeTab === "impact" && (
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 500, marginBottom: "1.5rem" }}>Your Impact</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
              {[
                { n: "24", label: "Hours volunteered", c: "var(--accent-green)" },
                { n: "8", label: "Shifts completed", c: "var(--accent-green)" },
                { n: "3", label: "Crisis responses", c: "var(--urgency-critical)" },
                { n: "5", label: "Week streak", c: "var(--urgency-medium)" },
              ].map((stat) => (
                <div key={stat.label} className="card" style={{ padding: "1.25rem", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 500, color: stat.c }}>{stat.n}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{stat.label}</div>
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

        {/* ══ HANDOFFS ══ */}
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
                <div><strong style={{ color: "var(--text-primary)" }}>Tips:</strong> Building at 41st needs buzzer code 7742. Mrs. Chen on 3rd floor needs meals left at door. Always bring extra bags.</div>
              </div>
              <div style={{ marginTop: "0.75rem", fontSize: "0.72rem", color: "var(--text-muted)" }}>Left by: Previous volunteer · 3 weeks ago</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}