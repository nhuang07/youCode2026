"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Org, UrgentRequest } from "@/lib/types";
import {
  DEMO_VOLUNTEER_SUMMARIES,
  DemoVolunteerSummary,
} from "@/lib/demo-data";

type Tab = "overview" | "requests" | "volunteers" | "handoffs";

export default function CoordinatorDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showUrgentForm, setShowUrgentForm] = useState(false);
  const [showGeneralForm, setShowGeneralForm] = useState(false);
  const [org, setOrg] = useState<Org | null>(null);
  const [allOrgs, setAllOrgs] = useState<Org[]>([]);
  const [claimSearch, setClaimSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [postedRequests, setPostedRequests] = useState<UrgentRequest[]>([]);
  const [urgentForm, setUrgentForm] = useState({
    title: "",
    description: "",
    deadline: "",
    people_needed: 1,
    skills: "",
    languages: "",
  });
  const [generalForm, setGeneralForm] = useState({
    title: "",
    description: "",
    people_needed: 1,
    skills: "",
    languages: "",
  });
  const [orgsLoading, setOrgsLoading] = useState(true);

  const volunteers = DEMO_VOLUNTEER_SUMMARIES;
  const activeVols = volunteers.filter((v) => v.status === "active");
  const coolingVols = volunteers.filter((v) => v.status === "cooling");
  const atRiskVols = volunteers.filter((v) => v.status === "at-risk");
  const totalHours = volunteers.reduce((sum, v) => sum + v.total_hours, 0);

  useEffect(() => {
    async function fetchOrgs() {
      setOrgsLoading(true);
      const { data, error } = await supabase.from("orgs").select("*");
      if (error) console.error("Failed to fetch orgs:", error);
      if (data) setAllOrgs(data as Org[]);
      setOrgsLoading(false);
    }
    fetchOrgs();
  }, []);

  useEffect(() => {
    if (!org) return;
    async function fetchRequests() {
      const { data } = await supabase
        .from("urgent_requests")
        .select("*")
        .eq("org_id", org!.id)
        .order("created_at", { ascending: false });
      if (data) setPostedRequests(data as UrgentRequest[]);
    }
    fetchRequests();
    const channel = supabase
      .channel("coord-urgent")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "urgent_requests",
          filter: `org_id=eq.${org.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT")
            setPostedRequests((prev) => [
              payload.new as UrgentRequest,
              ...prev,
            ]);
          else if (payload.eventType === "UPDATE")
            setPostedRequests((prev) =>
              prev.map((r) =>
                r.id === (payload.new as UrgentRequest).id
                  ? (payload.new as UrgentRequest)
                  : r,
              ),
            );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [org]);

  const filteredOrgs =
    claimSearch.length > 1
      ? allOrgs.filter((o) =>
          ((o.legal_name || "") + " " + (o.account_name || ""))
            .toLowerCase()
            .includes(claimSearch.toLowerCase()),
        )
      : [];

  const handlePostUrgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("urgent_requests")
      .insert({
        org_id: org.id,
        title: urgentForm.title,
        description: urgentForm.description,
        deadline: new Date(urgentForm.deadline).toISOString(),
        people_needed: urgentForm.people_needed,
        people_confirmed: 0,
        skills_required: urgentForm.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        languages_required: urgentForm.languages
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean),
        background_check_required: org.background_check_required,
        is_remote: false,
        status: "active",
      })
      .select();
    if (!error && data) {
      setPostedRequests((prev) => [data[0] as UrgentRequest, ...prev]);
      setShowUrgentForm(false);
      setUrgentForm({
        title: "",
        description: "",
        deadline: "",
        people_needed: 1,
        skills: "",
        languages: "",
      });
    }
    setSubmitting(false);
  };

  const handlePostGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setSubmitting(true);
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);
    const { data, error } = await supabase
      .from("urgent_requests")
      .insert({
        org_id: org.id,
        title: generalForm.title,
        description: generalForm.description,
        deadline: deadline.toISOString(),
        people_needed: generalForm.people_needed,
        people_confirmed: 0,
        skills_required: generalForm.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        languages_required: generalForm.languages
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean),
        background_check_required: org.background_check_required,
        is_remote: false,
        status: "active",
      })
      .select();
    if (!error && data) {
      setPostedRequests((prev) => [data[0] as UrgentRequest, ...prev]);
      setShowGeneralForm(false);
      setGeneralForm({
        title: "",
        description: "",
        people_needed: 1,
        skills: "",
        languages: "",
      });
    }
    setSubmitting(false);
  };

  const statusColor = (s: string) =>
    ({
      active: "var(--status-active)",
      cooling: "var(--status-cooling)",
      "at-risk": "var(--status-at-risk)",
    })[s] || "var(--text-muted)";
  const statusBg = (s: string) =>
    ({
      active: "var(--accent-matcha-pale)",
      cooling: "rgba(184,144,31,0.12)",
      "at-risk": "rgba(201,103,62,0.12)",
    })[s] || "var(--bg-secondary)";

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.7rem 1rem",
    borderRadius: "var(--radius-md)",
    border: "1.5px solid var(--border-light)",
    background: "var(--bg-primary)",
    fontSize: "0.9rem",
    fontFamily: "var(--font-body)",
    color: "var(--text-primary)",
    outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.8rem",
    fontWeight: 600,
    marginBottom: "0.4rem",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-body)",
  };

  // ── Claim screen ──
  if (!org) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-primary)",
          fontFamily: "var(--font-body)",
        }}
      >
        <div style={{ width: "100%", maxWidth: "420px", padding: "0 1.5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "2rem",
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
              }}
            >
              match-
              <em style={{ color: "var(--accent-green)", fontStyle: "italic" }}>
                a
              </em>
            </div>
            <p
              style={{
                color: "var(--text-secondary)",
                marginTop: "0.5rem",
                fontSize: "0.95rem",
              }}
            >
              Find your organization to get started
            </p>
          </div>
          <div className="card" style={{ padding: "1.5rem" }}>
            <input
              type="text"
              value={claimSearch}
              onChange={(e) => setClaimSearch(e.target.value)}
              placeholder="Type your organization name..."
              style={{ ...inputStyle, marginBottom: "0.75rem" }}
            />
            {orgsLoading && (
              <p
                style={{
                  fontSize: "0.85rem",
                  textAlign: "center",
                  padding: "1rem",
                  color: "var(--text-muted)",
                }}
              >
                Loading organizations...
              </p>
            )}
            {!orgsLoading && filteredOrgs.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  maxHeight: "260px",
                  overflowY: "auto",
                }}
              >
                {filteredOrgs.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setOrg(o);
                      setClaimSearch("");
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "0.75rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-light)",
                      background: "var(--bg-card)",
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "var(--accent-matcha-pale)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "var(--bg-card)")
                    }
                  >
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      {o.account_name || o.legal_name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        marginTop: "0.15rem",
                      }}
                    >
                      {o.sector} · {o.org_size} · {o.city}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {!orgsLoading &&
              claimSearch.length > 1 &&
              filteredOrgs.length === 0 && (
                <p
                  style={{
                    fontSize: "0.85rem",
                    textAlign: "center",
                    padding: "1rem",
                    color: "var(--text-muted)",
                  }}
                >
                  No organizations found.
                </p>
              )}
            {!orgsLoading && claimSearch.length <= 1 && (
              <p
                style={{
                  fontSize: "0.85rem",
                  textAlign: "center",
                  padding: "1rem",
                  color: "var(--text-muted)",
                }}
              >
                {allOrgs.length} organizations loaded. Start typing to search.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Main dashboard ──
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        fontFamily: "var(--font-body)",
      }}
    >
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 1.5rem",
          borderBottom: "1px solid var(--border-light)",
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.4rem",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            textDecoration: "none",
          }}
        >
          match-
          <em style={{ color: "var(--accent-green)", fontStyle: "italic" }}>
            a
          </em>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            {org.account_name || org.legal_name}
          </span>
          <Link
            href="/"
            className="btn btn-ghost"
            style={{ fontSize: "0.8rem", padding: "8px 14px" }}
          >
            Sign Out
          </Link>
        </div>
      </nav>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          padding: "1rem 1.5rem 0",
          borderBottom: "1px solid var(--border-light)",
        }}
      >
        {[
          { id: "overview" as Tab, label: "Dashboard" },
          { id: "requests" as Tab, label: "Requests" },
          { id: "volunteers" as Tab, label: "Volunteers" },
          { id: "handoffs" as Tab, label: "Knowledge Base" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "0.6rem 1rem",
              fontSize: "0.85rem",
              fontWeight: 500,
              fontFamily: "var(--font-body)",
              color:
                activeTab === tab.id
                  ? "var(--accent-green)"
                  : "var(--text-muted)",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid var(--accent-green)"
                  : "2px solid transparent",
              background: "none",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 1.5rem" }}
      >
        {/* ── DASHBOARD ── */}
        {activeTab === "overview" && (
          <div>
            {/* Welcome + action buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                marginBottom: "2rem",
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.5rem",
                    fontWeight: 500,
                    marginBottom: "0.25rem",
                  }}
                >
                  Welcome back
                </h2>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  {org.account_name || org.legal_name} · {org.sector}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => {
                    setActiveTab("requests");
                    setShowGeneralForm(true);
                  }}
                  className="btn btn-outline"
                  style={{ fontSize: "0.8rem", padding: "8px 16px" }}
                >
                  Post Request
                </button>
                <button
                  onClick={() => {
                    setActiveTab("requests");
                    setShowUrgentForm(true);
                  }}
                  className="btn btn-urgent"
                  style={{ fontSize: "0.8rem", padding: "8px 16px" }}
                >
                  Urgent Request
                </button>
              </div>
            </div>

            {/* At-a-glance stats — human-readable sentences */}
            <div
              className="card"
              style={{ padding: "1.5rem", marginBottom: "1.5rem" }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                  fontSize: "1.05rem",
                  marginBottom: "1rem",
                }}
              >
                Your team right now
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "var(--radius-md)",
                    background: "var(--accent-matcha-pale)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "2rem",
                        fontWeight: 500,
                        color: "var(--accent-green)",
                      }}
                    >
                      {activeVols.length}
                    </span>
                    <span
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--accent-green-dark)",
                      }}
                    >
                      active volunteers
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      marginTop: "0.25rem",
                    }}
                  >
                    {totalHours} total hours contributed
                  </div>
                </div>
                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "var(--radius-md)",
                    background:
                      org.volunteers_currently_needed > 10
                        ? "rgba(192,58,58,0.08)"
                        : "var(--bg-secondary)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "2rem",
                        fontWeight: 500,
                        color:
                          org.volunteers_currently_needed > 10
                            ? "var(--urgency-critical)"
                            : "var(--text-primary)",
                      }}
                    >
                      {org.volunteers_currently_needed}
                    </span>
                    <span
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      more volunteers needed
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      marginTop: "0.25rem",
                    }}
                  >
                    {org.volunteer_urgency === "Critical"
                      ? "Critical — consider posting an urgent request"
                      : org.volunteer_urgency === "High"
                        ? "High need — your team is stretched thin"
                        : "Manageable for now"}
                  </div>
                </div>
              </div>

              {/* Risk summary — only show if there are at-risk or cooling */}
              {(atRiskVols.length > 0 || coolingVols.length > 0) && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(201,103,62,0.08)",
                    fontSize: "0.85rem",
                    color: "var(--urgency-high)",
                  }}
                >
                  ⚠{" "}
                  {atRiskVols.length > 0 && (
                    <strong>
                      {atRiskVols.length} volunteer
                      {atRiskVols.length > 1 ? "s" : ""} at risk of
                      leaving.{" "}
                    </strong>
                  )}
                  {coolingVols.length > 0 && (
                    <span>{coolingVols.length} cooling off. </span>
                  )}
                  <button
                    onClick={() => setActiveTab("volunteers")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                      fontWeight: 600,
                      color: "var(--urgency-high)",
                      textDecoration: "underline",
                      fontSize: "0.85rem",
                    }}
                  >
                    View suggested actions →
                  </button>
                </div>
              )}
            </div>

            {/* Recent requests */}
            {postedRequests.length > 0 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 500,
                      fontSize: "1.05rem",
                    }}
                  >
                    Recent requests
                  </h3>
                  <button
                    onClick={() => setActiveTab("requests")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "var(--accent-green)",
                    }}
                  >
                    View all →
                  </button>
                </div>
                {postedRequests.slice(0, 3).map((req) => (
                  <div
                    key={req.id}
                    className="card"
                    style={{
                      padding: "1rem",
                      marginBottom: "0.5rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                        {req.title}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                          marginTop: "0.15rem",
                        }}
                      >
                        {new Date(req.deadline).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "1.1rem",
                            fontWeight: 500,
                            color:
                              req.people_confirmed >= req.people_needed
                                ? "var(--accent-green)"
                                : "var(--urgency-high)",
                          }}
                        >
                          {req.people_confirmed}/{req.people_needed}
                        </div>
                        <div
                          style={{
                            fontSize: "0.65rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          confirmed
                        </div>
                      </div>
                      <div className="score-bar" style={{ width: "4rem" }}>
                        <div
                          className="score-bar-fill"
                          style={{
                            width: `${Math.min((req.people_confirmed / req.people_needed) * 100, 100)}%`,
                            background:
                              req.people_confirmed >= req.people_needed
                                ? "var(--accent-green)"
                                : "var(--urgency-high)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Suggested check-ins */}
            {(atRiskVols.length > 0 || coolingVols.length > 0) && (
              <div className="card" style={{ padding: "1.5rem" }}>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                    fontSize: "1.05rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  Suggested check-ins
                </h3>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    marginBottom: "1rem",
                  }}
                >
                  These volunteers may need a personal message to stay engaged.
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  {[...atRiskVols, ...coolingVols].map((vol) => (
                    <div
                      key={vol.name}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.75rem",
                        borderRadius: "var(--radius-md)",
                        background: statusBg(vol.status),
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <div
                          className="status-dot"
                          style={{ background: statusColor(vol.status) }}
                        />
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                            {vol.name}
                          </div>
                          <div
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            Last active {vol.last_active_days_ago} days ago ·{" "}
                            {vol.trend}
                          </div>
                        </div>
                      </div>
                      <button
                        className="btn btn-outline"
                        style={{ fontSize: "0.72rem", padding: "6px 12px" }}
                      >
                        Send Check-in
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── REQUESTS ── */}
        {activeTab === "requests" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.5rem",
                  fontWeight: 500,
                }}
              >
                Your Requests
              </h2>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => {
                    setShowGeneralForm(!showGeneralForm);
                    setShowUrgentForm(false);
                  }}
                  className="btn btn-outline"
                  style={{ fontSize: "0.8rem", padding: "8px 16px" }}
                >
                  + General
                </button>
                <button
                  onClick={() => {
                    setShowUrgentForm(!showUrgentForm);
                    setShowGeneralForm(false);
                  }}
                  className="btn btn-urgent"
                  style={{ fontSize: "0.8rem", padding: "8px 16px" }}
                >
                  + Urgent
                </button>
              </div>
            </div>

            {/* Urgent request form */}
            {showUrgentForm && (
              <div
                className="card animate-fade-in"
                style={{
                  padding: "1.5rem",
                  marginBottom: "1.5rem",
                  borderLeft: "4px solid var(--urgency-critical)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                    marginBottom: "0.25rem",
                  }}
                >
                  Urgent Request
                </h3>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    marginBottom: "1rem",
                  }}
                >
                  This will immediately notify matched volunteers.
                </p>
                <form
                  onSubmit={handlePostUrgent}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <label style={labelStyle}>What do you need?</label>
                    <input
                      type="text"
                      required
                      value={urgentForm.title}
                      onChange={(e) =>
                        setUrgentForm({ ...urgentForm, title: e.target.value })
                      }
                      style={inputStyle}
                      placeholder="e.g. 2 delivery drivers for meal distribution"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Description</label>
                    <textarea
                      rows={3}
                      required
                      value={urgentForm.description}
                      onChange={(e) =>
                        setUrgentForm({
                          ...urgentForm,
                          description: e.target.value,
                        })
                      }
                      style={{ ...inputStyle, resize: "vertical" }}
                      placeholder="What will volunteers be doing and why does it matter?"
                    />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <label style={labelStyle}>When is this needed?</label>
                      <input
                        type="datetime-local"
                        required
                        value={urgentForm.deadline}
                        onChange={(e) =>
                          setUrgentForm({
                            ...urgentForm,
                            deadline: e.target.value,
                          })
                        }
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>How many people?</label>
                      <input
                        type="number"
                        min={1}
                        value={urgentForm.people_needed}
                        onChange={(e) =>
                          setUrgentForm({
                            ...urgentForm,
                            people_needed: parseInt(e.target.value),
                          })
                        }
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <label style={labelStyle}>Skills needed</label>
                      <input
                        type="text"
                        value={urgentForm.skills}
                        onChange={(e) =>
                          setUrgentForm({
                            ...urgentForm,
                            skills: e.target.value,
                          })
                        }
                        style={inputStyle}
                        placeholder="e.g. Driving, Cooking"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Languages needed</label>
                      <input
                        type="text"
                        value={urgentForm.languages}
                        onChange={(e) =>
                          setUrgentForm({
                            ...urgentForm,
                            languages: e.target.value,
                          })
                        }
                        style={inputStyle}
                        placeholder="e.g. English, Cantonese"
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn btn-primary"
                    >
                      {submitting ? "Posting..." : "Post & Notify Volunteers"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUrgentForm(false)}
                      className="btn btn-outline"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* General request form */}
            {showGeneralForm && (
              <div
                className="card animate-fade-in"
                style={{
                  padding: "1.5rem",
                  marginBottom: "1.5rem",
                  borderLeft: "4px solid var(--accent-green)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                    marginBottom: "0.25rem",
                  }}
                >
                  General Request
                </h3>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    marginBottom: "1rem",
                  }}
                >
                  Post an ongoing volunteer opportunity. Volunteers will find it
                  when browsing.
                </p>
                <form
                  onSubmit={handlePostGeneral}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <label style={labelStyle}>Role title</label>
                    <input
                      type="text"
                      required
                      value={generalForm.title}
                      onChange={(e) =>
                        setGeneralForm({
                          ...generalForm,
                          title: e.target.value,
                        })
                      }
                      style={inputStyle}
                      placeholder="e.g. Weekend kitchen helper"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Description</label>
                    <textarea
                      rows={3}
                      required
                      value={generalForm.description}
                      onChange={(e) =>
                        setGeneralForm({
                          ...generalForm,
                          description: e.target.value,
                        })
                      }
                      style={{ ...inputStyle, resize: "vertical" }}
                      placeholder="What does this role involve?"
                    />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <label style={labelStyle}>How many people?</label>
                      <input
                        type="number"
                        min={1}
                        value={generalForm.people_needed}
                        onChange={(e) =>
                          setGeneralForm({
                            ...generalForm,
                            people_needed: parseInt(e.target.value),
                          })
                        }
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Skills needed</label>
                      <input
                        type="text"
                        value={generalForm.skills}
                        onChange={(e) =>
                          setGeneralForm({
                            ...generalForm,
                            skills: e.target.value,
                          })
                        }
                        style={inputStyle}
                        placeholder="e.g. Cooking, Event coordination"
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn btn-primary"
                    >
                      {submitting ? "Posting..." : "Post Opportunity"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowGeneralForm(false)}
                      className="btn btn-outline"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Posted requests list */}
            {postedRequests.map((req) => (
              <div
                key={req.id}
                className="card"
                style={{
                  padding: "1.5rem",
                  marginBottom: "1rem",
                  borderLeft: `4px solid ${req.status === "active" ? "var(--urgency-critical)" : "var(--accent-green)"}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div>
                    <span
                      className={`urgency-badge ${req.status === "active" ? "urgency-critical" : "urgency-low"}`}
                    >
                      {req.status === "active" ? "Active" : req.status}
                    </span>
                    <h3
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.1rem",
                        fontWeight: 500,
                        marginTop: "0.5rem",
                      }}
                    >
                      {req.title}
                    </h3>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--urgency-critical)",
                      }}
                    >
                      {new Date(req.deadline).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.25rem",
                        fontWeight: 500,
                        marginTop: "0.25rem",
                        color:
                          req.people_confirmed >= req.people_needed
                            ? "var(--accent-green)"
                            : "var(--urgency-high)",
                      }}
                    >
                      {req.people_confirmed} / {req.people_needed}
                    </div>
                    <div
                      style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
                    >
                      volunteers confirmed
                    </div>
                  </div>
                </div>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    marginBottom: "1rem",
                  }}
                >
                  {req.description}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "0.4rem",
                    flexWrap: "wrap",
                    marginBottom: "0.75rem",
                  }}
                >
                  {req.skills_required?.map((s) => (
                    <span key={s} className="tag tag-skill">
                      {s}
                    </span>
                  ))}
                  {req.languages_required?.map((l) => (
                    <span
                      key={l}
                      className="tag"
                      style={{
                        background: "var(--accent-matcha-pale)",
                        color: "var(--accent-green-dark)",
                        border: "1px solid var(--accent-green-light)",
                      }}
                    >
                      {l}
                    </span>
                  ))}
                </div>
                <div className="score-bar">
                  <div
                    className="score-bar-fill"
                    style={{
                      width: `${Math.min((req.people_confirmed / req.people_needed) * 100, 100)}%`,
                      background:
                        req.people_confirmed >= req.people_needed
                          ? "var(--accent-green)"
                          : "var(--urgency-high)",
                    }}
                  />
                </div>
              </div>
            ))}

            {postedRequests.length === 0 &&
              !showUrgentForm &&
              !showGeneralForm && (
                <div
                  className="card"
                  style={{ padding: "3rem", textAlign: "center" }}
                >
                  <p
                    style={{ color: "var(--text-muted)", marginBottom: "1rem" }}
                  >
                    No requests posted yet.
                  </p>
                  <p
                    style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}
                  >
                    Use the buttons above to ask for help — urgent requests
                    notify volunteers instantly.
                  </p>
                </div>
              )}
          </div>
        )}

        {/* ── VOLUNTEERS ── */}
        {activeTab === "volunteers" && (
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
                fontWeight: 500,
                marginBottom: "0.25rem",
              }}
            >
              Your Volunteers
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                marginBottom: "1.5rem",
              }}
            >
              We track engagement patterns to help you keep your team.{" "}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span
                  className="status-dot"
                  style={{
                    background: "var(--status-active)",
                    width: 7,
                    height: 7,
                  }}
                />{" "}
                Active
              </span>{" "}
              ·{" "}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span
                  className="status-dot"
                  style={{
                    background: "var(--status-cooling)",
                    width: 7,
                    height: 7,
                  }}
                />{" "}
                Cooling off
              </span>{" "}
              ·{" "}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span
                  className="status-dot"
                  style={{
                    background: "var(--status-at-risk)",
                    width: 7,
                    height: 7,
                  }}
                />{" "}
                At risk
              </span>
            </p>

            {volunteers
              .sort(
                (a, b) =>
                  (({ "at-risk": 0, cooling: 1, active: 2 })[a.status] || 0) -
                  ({ "at-risk": 0, cooling: 1, active: 2 }[b.status] || 0),
              )
              .map((vol) => (
                <VolRow
                  key={vol.name}
                  vol={vol}
                  statusColor={statusColor}
                  statusBg={statusBg}
                />
              ))}
          </div>
        )}
        {activeTab === "handoffs" && (
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
                fontWeight: 500,
                marginBottom: "0.25rem",
              }}
            >
              Knowledge Base
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                marginBottom: "1.5rem",
              }}
            >
              When a volunteer leaves, their experience doesn&apos;t have to
              leave with them. Handoff documents capture what they learned so
              the next person can hit the ground running.
            </p>

            <div
              className="card"
              style={{ padding: "1.5rem", marginBottom: "1rem" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <h3
                  style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                >
                  Meal Delivery — East Van Route
                </h3>
                <span className="tag tag-skill">Documented</span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                }}
              >
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>
                    Key contacts:
                  </strong>{" "}
                  Maria (kitchen, ext 204), Joe (warehouse, arrives 7am)
                </div>
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>
                    Tasks:
                  </strong>{" "}
                  Pick up by 9am from 4885 Valley Dr, follow route sheet, return
                  bins by 1pm
                </div>
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>
                    Tips:
                  </strong>{" "}
                  Buzzer code 7742 at 41st. Mrs. Chen (3rd floor) needs door
                  delivery. Bring extra bags.
                </div>
              </div>
              <div
                style={{
                  marginTop: "0.6rem",
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                }}
              >
                Written by: Previous volunteer · 3 weeks ago
              </div>
            </div>

            <div
              className="card"
              style={{ padding: "1.5rem", marginBottom: "1rem" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <h3
                  style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                >
                  Event Setup Coordinator
                </h3>
                <span className="tag tag-skill">Documented</span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                }}
              >
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>
                    Key contacts:
                  </strong>{" "}
                  Priya (venue liaison), building manager Sam (604-555-0142)
                </div>
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>
                    Tasks:
                  </strong>{" "}
                  Arrive 2hrs early, unlock storage room B, set up 12 tables +
                  48 chairs, test AV
                </div>
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>
                    Tips:
                  </strong>{" "}
                  Projector remote is in the top drawer, not the AV cabinet.
                  Always bring extension cords — venue never has enough.
                </div>
              </div>
              <div
                style={{
                  marginTop: "0.6rem",
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                }}
              >
                Written by: Elena Andersen · 1 week ago
              </div>
            </div>

            <div
              className="card"
              style={{
                padding: "1.5rem",
                borderLeft: "3px solid var(--urgency-high)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <h3
                  style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                >
                  Saturday Kitchen Lead
                </h3>
                <span
                  className="tag"
                  style={{
                    background: "rgba(201,103,62,0.12)",
                    color: "var(--urgency-high)",
                    border: "1px solid rgba(201,103,62,0.2)",
                  }}
                >
                  Not yet documented
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                  marginBottom: "0.75rem",
                }}
              >
                Ben Dubois has been in this role for 6 months but is flagged as
                at-risk. If he leaves without documenting, the next volunteer
                starts from scratch.
              </p>
              <button
                className="btn btn-outline"
                style={{ fontSize: "0.8rem" }}
              >
                Ask Ben to document this role
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VolRow({
  vol,
  statusColor,
  statusBg,
}: {
  vol: DemoVolunteerSummary;
  statusColor: (s: string) => string;
  statusBg: (s: string) => string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="card"
      style={{ marginBottom: "0.5rem", overflow: "hidden" }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem",
          textAlign: "left",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--font-body)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            className="status-dot"
            style={{ background: statusColor(vol.status) }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
              {vol.name}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {vol.total_hours} hrs · {vol.total_shifts} shifts ·{" "}
              {vol.crisis_responses} crisis responses
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: "var(--radius-full)",
              background: statusBg(vol.status),
              color: statusColor(vol.status),
            }}
          >
            {vol.status === "at-risk"
              ? "At Risk"
              : vol.status.charAt(0).toUpperCase() + vol.status.slice(1)}
          </span>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
            {open ? "▲" : "▼"}
          </span>
        </div>
      </button>
      {open && (
        <div
          style={{
            padding: "0 1rem 1rem",
            borderTop: "1px solid var(--border-light)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
              paddingTop: "0.75rem",
              fontSize: "0.85rem",
            }}
          >
            <div>
              <span style={{ color: "var(--text-muted)" }}>Last active: </span>
              <strong>{vol.last_active_days_ago} days ago</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Streak: </span>
              <strong>{vol.streak} weeks</strong>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={{ color: "var(--text-muted)" }}>Trend: </span>
              <strong>{vol.trend}</strong>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={{ color: "var(--text-muted)" }}>Suggested: </span>
              <strong>{vol.suggested_action}</strong>
            </div>
          </div>
          {vol.status !== "active" && (
            <button
              className="btn btn-primary"
              style={{ marginTop: "0.75rem", fontSize: "0.8rem" }}
            >
              Send Check-in
            </button>
          )}
        </div>
      )}
    </div>
  );
}
