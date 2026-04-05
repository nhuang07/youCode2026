"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Org, Volunteer, UrgentRequest } from "@/lib/types";
import { computeMatchScore, rankOpportunitiesForVolunteer } from "@/lib/matching";

type Tab = "urgent" | "opportunities" | "impact" | "handoffs";

// Demo volunteer profile — replace with real auth + profile lookup later
const DEMO_VOLUNTEER: Volunteer = {
  id: "demo",
  user_id: null,
  name: "Demo Volunteer",
  age: 24,
  neighbourhood: "Kitsilano",
  languages: ["English", "Mandarin"],
  skills: ["Driving/transportation", "Tutoring/mentorship", "Translation/interpretation", "Event coordination"],
  interests: ["Food security", "Newcomer & immigrant support", "Youth services"],
  availability: "Flexible / as needed",
  hours_per_month: 12,
  has_vehicle: true,
  has_background_check: true,
  prior_experience: "Some (1-2 orgs)",
  created_at: new Date().toISOString(),
};

export default function VolunteerDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("urgent");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [urgentRequests, setUrgentRequests] = useState<(UrgentRequest & { org?: Org })[]>([]);
  const [rankedOrgs, setRankedOrgs] = useState<{ org: Org; score: number; breakdown: ReturnType<typeof computeMatchScore>["breakdown"] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondedRequests, setRespondedRequests] = useState<Record<string, "accepted" | "declined">>({});

  const volunteer = DEMO_VOLUNTEER;

  // Handle accepting an urgent request
  const handleAcceptUrgent = async (requestId: string) => {
    // Insert response
    await supabase.from("urgent_responses").insert({
      urgent_request_id: requestId,
      volunteer_id: volunteer.id,
      status: "accepted",
      responded_at: new Date().toISOString(),
    });

    // Increment people_confirmed
    const req = urgentRequests.find((r) => r.id === requestId);
    if (req) {
      await supabase
        .from("urgent_requests")
        .update({ people_confirmed: (req.people_confirmed || 0) + 1 })
        .eq("id", requestId);

      // Update local state
      setUrgentRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, people_confirmed: (r.people_confirmed || 0) + 1 }
            : r
        )
      );
    }

    setRespondedRequests((prev) => ({ ...prev, [requestId]: "accepted" }));
  };

  // Handle declining an urgent request
  const handleDeclineUrgent = async (requestId: string) => {
    await supabase.from("urgent_responses").insert({
      urgent_request_id: requestId,
      volunteer_id: volunteer.id,
      status: "declined",
      responded_at: new Date().toISOString(),
    });

    setRespondedRequests((prev) => ({ ...prev, [requestId]: "declined" }));
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Fetch all orgs
      const { data: orgData } = await supabase.from("orgs").select("*");
      const fetchedOrgs = (orgData || []) as Org[];
      setOrgs(fetchedOrgs);

      // Rank orgs by match score
      const ranked = rankOpportunitiesForVolunteer(volunteer, fetchedOrgs);
      setRankedOrgs(ranked);

      // Fetch urgent requests with org info
      const { data: urgentData } = await supabase
        .from("urgent_requests")
        .select("*")
        .eq("status", "active");

      if (urgentData && urgentData.length > 0) {
        const withOrgs = (urgentData as UrgentRequest[]).map((req) => ({
          ...req,
          org: fetchedOrgs.find((o) => o.id === req.org_id),
        }));
        setUrgentRequests(withOrgs);
      }

      setLoading(false);
    }

    fetchData();

    // Subscribe to new and updated urgent requests in real-time
    const channel = supabase
      .channel("urgent-requests")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "urgent_requests" },
        (payload) => {
          const newRequest = payload.new as UrgentRequest;
          const matchedOrg = orgs.find((o) => o.id === newRequest.org_id);
          setUrgentRequests((prev) => [
            { ...newRequest, org: matchedOrg },
            ...prev,
          ]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "urgent_requests" },
        (payload) => {
          const updated = payload.new as UrgentRequest;
          setUrgentRequests((prev) =>
            prev.map((r) =>
              r.id === updated.id
                ? { ...r, ...updated, org: r.org }
                : r
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get critical/high urgency orgs as implicit crisis alerts when no urgent_requests exist
  const criticalOrgs = rankedOrgs.filter(
    ({ org }) => org.volunteer_urgency === "Critical" || org.volunteer_urgency === "High"
  );

  const tabs: { id: Tab; label: string; alert?: boolean }[] = [
    { id: "urgent", label: "Crisis Alerts", alert: criticalOrgs.length > 0 || urgentRequests.length > 0 },
    { id: "opportunities", label: "Browse Opportunities" },
    { id: "impact", label: "My Impact" },
    { id: "handoffs", label: "Handoffs" },
  ];

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "Critical": return "var(--urgency-critical)";
      case "High": return "var(--urgency-high)";
      case "Medium": return "var(--urgency-medium)";
      default: return "var(--urgency-low)";
    }
  };

  const getUrgencyClass = (urgency: string) => {
    switch (urgency) {
      case "Critical": return "urgency-critical";
      case "High": return "urgency-high";
      case "Medium": return "urgency-medium";
      default: return "urgency-low";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Top bar */}
      <nav
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid var(--border-light)" }}
      >
        <Link
          href="/"
          className="text-xl font-bold tracking-tight"
          style={{ color: "var(--accent-green)" }}
        >
          match-a
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {volunteer.name}
          </span>
          <Link href="/" className="btn btn-ghost text-sm">
            Sign Out
          </Link>
        </div>
      </nav>

      {/* Tabs */}
      <div
        className="flex gap-1 px-6 pt-4 pb-0"
        style={{ borderBottom: "1px solid var(--border-light)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="relative px-4 py-3 text-sm font-medium transition-colors"
            style={{
              color: activeTab === tab.id ? "var(--accent-green)" : "var(--text-muted)",
              borderBottom: activeTab === tab.id ? "2px solid var(--accent-green)" : "2px solid transparent",
            }}
          >
            {tab.label}
            {tab.alert && (
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                style={{ background: "var(--urgency-critical)" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* ==================== CRISIS ALERTS TAB ==================== */}
        {activeTab === "urgent" && (
          <div className="stagger-children">
            <h2 className="text-2xl font-bold mb-6">
              <span style={{ color: "var(--urgency-critical)" }}>●</span>{" "}
              Organizations That Need Help Now
            </h2>

            {/* Show posted urgent requests first */}
            {urgentRequests.map((req) => {
              const score = req.org ? computeMatchScore(volunteer, req.org).score : 0;
              return (
                <div
                  key={req.id}
                  className="card p-6 mb-4 card-interactive"
                  style={{ borderLeft: "4px solid var(--urgency-critical)" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="urgency-badge urgency-critical mb-2">Urgent Request</span>
                      <h3 className="text-lg font-bold mt-2">{req.title}</h3>
                      <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                        {req.org?.account_name || req.org?.legal_name} — Vancouver
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold" style={{ color: "var(--urgency-critical)" }}>
                        {new Date(req.deadline).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </div>
                      <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        {req.people_confirmed} of {req.people_needed} spots filled
                      </div>
                    </div>
                  </div>
                  <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>{req.description}</p>
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {req.skills_required?.map((skill) => (
                      <span key={skill} className="tag tag-skill">{skill}</span>
                    ))}
                    {req.languages_required?.map((lang) => (
                      <span key={lang} className="tag tag-language">{lang}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="score-bar w-24">
                        <div className="score-bar-fill" style={{ width: `${score}%`, background: "var(--accent-green)" }} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: "var(--accent-green)" }}>{score}% match</span>
                    </div>
                    <div className="flex gap-2">
                      {respondedRequests[req.id] === "accepted" ? (
                        <div className="btn text-sm" style={{ background: "var(--accent-green-light)", color: "var(--accent-green)", cursor: "default" }}>
                          ✓ You&apos;re signed up!
                        </div>
                      ) : respondedRequests[req.id] === "declined" ? (
                        <div className="btn text-sm" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)", cursor: "default" }}>
                          Declined
                        </div>
                      ) : (
                        <>
                          <button onClick={() => handleDeclineUrgent(req.id)} className="btn btn-outline text-sm">Decline</button>
                          <button onClick={() => handleAcceptUrgent(req.id)} className="btn btn-urgent text-sm">I Can Help</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Show critical/high urgency orgs as implicit alerts */}
            {criticalOrgs.map(({ org, score }) => (
              <div
                key={org.id}
                className="card p-6 mb-4 card-interactive"
                style={{ borderLeft: `4px solid ${getUrgencyColor(org.volunteer_urgency)}` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className={`urgency-badge ${getUrgencyClass(org.volunteer_urgency)} mb-2`}>
                      {org.volunteer_urgency}
                    </span>
                    <h3 className="text-lg font-bold mt-2">
                      {org.account_name || org.legal_name}
                    </h3>
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                      {org.sector} — {org.city} • {org.org_size}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold" style={{ color: getUrgencyColor(org.volunteer_urgency) }}>
                      {org.volunteers_currently_needed}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      volunteers needed
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mb-4 flex-wrap">
                  {org.skills_needed?.map((skill) => (
                    <span key={skill} className="tag tag-skill">{skill}</span>
                  ))}
                  {org.languages_needed?.map((lang) => (
                    <span key={lang} className="tag tag-language">{lang}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="score-bar w-24">
                      <div
                        className="score-bar-fill"
                        style={{
                          width: `${score}%`,
                          background: score >= 60 ? "var(--accent-green)" : score >= 35 ? "var(--accent-yellow)" : "var(--accent-orange)",
                        }}
                      />
                    </div>
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color: score >= 60 ? "var(--accent-green)" : score >= 35 ? "#946b00" : "var(--accent-orange)",
                      }}
                    >
                      {score}% match
                    </span>
                  </div>
                  <button className="btn btn-primary text-sm">
                    I Can Help
                  </button>
                </div>
              </div>
            ))}

            {criticalOrgs.length === 0 && urgentRequests.length === 0 && (
              <div className="card p-8 text-center">
                <p style={{ color: "var(--text-muted)" }}>
                  No active crisis alerts right now. Check back soon, or browse opportunities.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ==================== BROWSE OPPORTUNITIES TAB ==================== */}
        {activeTab === "opportunities" && (
          <div>
            <h2 className="text-2xl font-bold mb-2">Opportunities For You</h2>
            <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>
              Ranked by compatibility with your skills, languages, and availability.
            </p>

            <div className="stagger-children">
              {rankedOrgs.map(({ org, score, breakdown }) => (
                <div key={org.id} className="card p-6 mb-4 card-interactive">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className={`urgency-badge ${getUrgencyClass(org.volunteer_urgency)} mb-2`}>
                        {org.volunteer_urgency} need
                      </span>
                      <h3 className="text-lg font-bold mt-2">
                        {org.account_name || org.legal_name}
                      </h3>
                      <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                        {org.sector} — {org.city} • {org.org_size}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className="text-2xl font-bold"
                        style={{
                          color: score >= 60 ? "var(--accent-green)" : score >= 35 ? "#946b00" : "var(--accent-orange)",
                        }}
                      >
                        {score}%
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        match
                      </div>
                    </div>
                  </div>

                  {/* Score breakdown */}
                  <div className="flex gap-4 mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span>Skills: {breakdown.skills}/{35}</span>
                    <span>Language: {breakdown.language}/{25}</span>
                    <span>Availability: {breakdown.availability}/{20}</span>
                    <span>Cause: {breakdown.cause_alignment}/{10}</span>
                    <span>Background: {breakdown.background_check}/{10}</span>
                  </div>

                  <div className="flex gap-2 mb-4 flex-wrap">
                    {org.skills_needed?.map((skill) => {
                      const hasSkill = volunteer.skills.some(
                        (s) => s.toLowerCase() === skill.toLowerCase()
                      );
                      return (
                        <span
                          key={skill}
                          className={`tag ${hasSkill ? "tag-selected" : "tag-skill"}`}
                        >
                          {hasSkill ? "✓ " : ""}{skill}
                        </span>
                      );
                    })}
                    {org.languages_needed?.map((lang) => {
                      const hasLang = volunteer.languages.some(
                        (l) => l.toLowerCase() === lang.toLowerCase()
                      );
                      return (
                        <span
                          key={lang}
                          className={`tag ${hasLang ? "tag-selected" : "tag-language"}`}
                        >
                          {hasLang ? "✓ " : ""}{lang}
                        </span>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {org.volunteers_currently_needed} volunteers needed • {org.availability_preference}
                    </span>
                    <button className="btn btn-primary text-sm">
                      Volunteer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== IMPACT TAB ==================== */}
        {activeTab === "impact" && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">Your Impact</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="card p-5 text-center">
                <div className="text-3xl font-bold" style={{ color: "var(--accent-green)" }}>24</div>
                <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Hours volunteered</div>
              </div>
              <div className="card p-5 text-center">
                <div className="text-3xl font-bold" style={{ color: "var(--accent-green)" }}>8</div>
                <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Shifts completed</div>
              </div>
              <div className="card p-5 text-center">
                <div className="text-3xl font-bold" style={{ color: "var(--urgency-critical)" }}>3</div>
                <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Crisis responses</div>
              </div>
              <div className="card p-5 text-center">
                <div className="text-3xl font-bold" style={{ color: "var(--accent-yellow)" }}>5</div>
                <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Week streak</div>
              </div>
            </div>

            {/* Shareable impact card preview */}
            <div className="card p-8 text-center max-w-sm mx-auto" style={{ background: "var(--accent-green-light)" }}>
              <div className="text-sm font-semibold mb-2" style={{ color: "var(--accent-green)" }}>match-a</div>
              <div className="text-lg font-bold mb-1">{volunteer.name}</div>
              <div className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>volunteered 24 hours this month</div>
              <div className="text-3xl font-bold mb-1" style={{ color: "var(--accent-green)" }}>200+</div>
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>families helped through meal delivery</div>
              <button className="btn btn-primary text-sm mt-6">Share Your Impact</button>
            </div>
          </div>
        )}

        {/* ==================== HANDOFFS TAB ==================== */}
        {activeTab === "handoffs" && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">Role Handoffs</h2>
            <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
              When you take on a role, any knowledge left by previous volunteers appears here.
              When you move on, you&apos;ll be prompted to leave your own.
            </p>

            <div className="card p-6 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">Meal Delivery — East Van Route</h3>
                <span className="tag tag-skill">Inherited</span>
              </div>
              <div className="space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                <div>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Key contacts: </span>
                  Maria (kitchen coordinator, ext 204), Joe (warehouse, arrives 7am)
                </div>
                <div>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Recurring tasks: </span>
                  Pick up from 4885 Valley Dr by 9am, follow route sheet in shared drive, return bins by 1pm
                </div>
                <div>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Tips: </span>
                  Building at 41st needs buzzer code 7742. Mrs. Chen on 3rd floor needs meals left at door (mobility issues). Always bring extra bags.
                </div>
              </div>
              <div className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
                Left by: Previous volunteer • 3 weeks ago
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
