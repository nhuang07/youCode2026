"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Org, UrgentRequest } from "@/lib/types";
import { DEMO_VOLUNTEER_SUMMARIES, DemoVolunteerSummary } from "@/lib/demo-data";

type Tab = "overview" | "urgent" | "volunteers" | "handoffs";

export default function CoordinatorDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showUrgentForm, setShowUrgentForm] = useState(false);
  const [org, setOrg] = useState<Org | null>(null);
  const [allOrgs, setAllOrgs] = useState<Org[]>([]);
  const [claimSearch, setClaimSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [urgentForm, setUrgentForm] = useState({
    title: "",
    description: "",
    deadline: "",
    people_needed: 1,
    skills: "",
    languages: "",
  });
  const [postedRequests, setPostedRequests] = useState<UrgentRequest[]>([]);

  const [orgsLoading, setOrgsLoading] = useState(true);

  const volunteers = DEMO_VOLUNTEER_SUMMARIES;
  const activeVols = volunteers.filter((v) => v.status === "active");
  const coolingVols = volunteers.filter((v) => v.status === "cooling");
  const atRiskVols = volunteers.filter((v) => v.status === "at-risk");

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

  // Fetch and subscribe to urgent requests for this org
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

    // Real-time: listen for updates to this org's requests (e.g. people_confirmed changing)
    const channel = supabase
      .channel("coord-urgent")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "urgent_requests", filter: `org_id=eq.${org.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setPostedRequests((prev) => [payload.new as UrgentRequest, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setPostedRequests((prev) =>
              prev.map((r) => (r.id === (payload.new as UrgentRequest).id ? (payload.new as UrgentRequest) : r))
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [org]);

  const filteredOrgs = claimSearch.length > 1
    ? allOrgs.filter((o) =>
        ((o.legal_name || "") + " " + (o.account_name || "")).toLowerCase().includes(claimSearch.toLowerCase())
      )
    : [];

  const handleClaimOrg = (o: Org) => {
    setOrg(o);
    setClaimSearch("");
  };

  const handlePostUrgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setSubmitting(true);

    const { data, error } = await supabase.from("urgent_requests").insert({
      org_id: org.id,
      title: urgentForm.title,
      description: urgentForm.description,
      deadline: new Date(urgentForm.deadline).toISOString(),
      people_needed: urgentForm.people_needed,
      people_confirmed: 0,
      skills_required: urgentForm.skills.split(",").map((s) => s.trim()).filter(Boolean),
      languages_required: urgentForm.languages.split(",").map((l) => l.trim()).filter(Boolean),
      background_check_required: org.background_check_required,
      is_remote: false,
      status: "active",
    }).select();

    if (!error && data) {
      setPostedRequests((prev) => [data[0] as UrgentRequest, ...prev]);
      setShowUrgentForm(false);
      setUrgentForm({ title: "", description: "", deadline: "", people_needed: 1, skills: "", languages: "" });
    }

    setSubmitting(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "var(--status-active)";
      case "cooling": return "var(--status-cooling)";
      case "at-risk": return "var(--status-at-risk)";
      default: return "var(--text-muted)";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "active": return "var(--accent-green-light)";
      case "cooling": return "var(--accent-yellow-light)";
      case "at-risk": return "var(--accent-orange-light)";
      default: return "var(--bg-secondary)";
    }
  };

  // If no org claimed yet, show claim flow
  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-3xl font-bold tracking-tight mb-2" style={{ color: "var(--accent-green)" }}>match-a</div>
            <p style={{ color: "var(--text-secondary)" }}>Find and claim your organization</p>
          </div>
          <div className="card p-6">
            <input
              type="text"
              value={claimSearch}
              onChange={(e) => setClaimSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm mb-3"
              style={{ border: "1.5px solid var(--border-light)", background: "var(--bg-primary)" }}
              placeholder="Search for your organization..."
            />
            {orgsLoading && (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
                Loading organizations...
              </p>
            )}
            {!orgsLoading && filteredOrgs.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredOrgs.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => handleClaimOrg(o)}
                    className="w-full text-left p-3 rounded-lg transition-colors hover:bg-gray-50"
                    style={{ border: "1px solid var(--border-light)" }}
                  >
                    <div className="font-semibold text-sm">{o.account_name || o.legal_name}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {o.sector} • {o.org_size} • {o.city}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {!orgsLoading && claimSearch.length > 1 && filteredOrgs.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
                No organizations found. Try a different search.
              </p>
            )}
            {!orgsLoading && claimSearch.length <= 1 && (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
                {allOrgs.length} organizations loaded. Start typing to search.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Top bar */}
      <nav className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-light)" }}>
        <Link href="/" className="text-xl font-bold tracking-tight" style={{ color: "var(--accent-green)" }}>
          match-a
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {org.account_name || org.legal_name}
          </span>
          <button
            onClick={() => { setActiveTab("urgent"); setShowUrgentForm(true); }}
            className="btn btn-urgent text-sm"
          >
            Post Urgent Request
          </button>
          <Link href="/" className="btn btn-ghost text-sm">Sign Out</Link>
        </div>
      </nav>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 pb-0" style={{ borderBottom: "1px solid var(--border-light)" }}>
        {(["overview", "urgent", "volunteers", "handoffs"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-3 text-sm font-medium transition-colors capitalize"
            style={{
              color: activeTab === tab ? "var(--accent-green)" : "var(--text-muted)",
              borderBottom: activeTab === tab ? "2px solid var(--accent-green)" : "2px solid transparent",
            }}
          >
            {tab === "overview" ? "Dashboard" : tab === "urgent" ? "Crisis Requests" : tab === "volunteers" ? "My Volunteers" : "Knowledge Base"}
          </button>
        ))}
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* ==================== DASHBOARD TAB ==================== */}
        {activeTab === "overview" && (
          <div className="stagger-children">
            <h2 className="text-2xl font-bold mb-6">Organization Health</h2>

            {/* Org info banner */}
            <div className="card p-5 mb-6 flex items-center justify-between">
              <div>
                <div className="font-bold text-lg">{org.account_name || org.legal_name}</div>
                <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {org.sector} • {org.org_size} • {org.city}
                </div>
              </div>
              <div className={`urgency-badge urgency-${org.volunteer_urgency.toLowerCase()}`}>
                {org.volunteer_urgency} need
              </div>
            </div>

            {/* Health stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="card p-5 text-center">
                <div className="text-3xl font-bold" style={{ color: "var(--urgency-critical)" }}>{org.volunteers_currently_needed}</div>
                <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Volunteers needed</div>
              </div>
              <div className="card p-5 text-center">
                <div className="text-3xl font-bold" style={{ color: "var(--accent-green)" }}>{activeVols.length}</div>
                <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Active</div>
              </div>
              <div className="card p-5 text-center">
                <div className="text-3xl font-bold" style={{ color: "var(--status-cooling)" }}>{coolingVols.length}</div>
                <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Cooling off</div>
              </div>
              <div className="card p-5 text-center">
                <div className="text-3xl font-bold" style={{ color: "var(--status-at-risk)" }}>{atRiskVols.length}</div>
                <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>At risk</div>
              </div>
            </div>

            {/* Churn alerts */}
            <div className="card p-6 mb-6">
              <h3 className="text-lg font-bold mb-4">
                Suggested Check-ins
                <span className="text-sm font-normal ml-2" style={{ color: "var(--text-muted)" }}>
                  powered by engagement pattern detection
                </span>
              </h3>
              <div className="space-y-3">
                {[...atRiskVols, ...coolingVols].map((vol) => (
                  <div
                    key={vol.name}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: getStatusBg(vol.status) }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="status-dot" style={{ background: getStatusColor(vol.status) }} />
                      <div>
                        <div className="text-sm font-semibold">{vol.name}</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Last active {vol.last_active_days_ago} days ago — {vol.trend}
                        </div>
                      </div>
                    </div>
                    <button className="btn btn-outline text-xs py-1.5 px-3">Send Check-in</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Knowledge coverage */}
            <div className="card p-6">
              <h3 className="text-lg font-bold mb-4">Knowledge Coverage</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Meal Delivery Coordinator</span>
                  <span className="tag tag-skill">Handoff complete</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Saturday Kitchen Lead</span>
                  <span className="tag" style={{ background: "var(--accent-orange-light)", color: "var(--accent-orange)" }}>No handoff yet</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Event Setup Volunteer</span>
                  <span className="tag tag-skill">Handoff complete</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Weekend Sorting Lead</span>
                  <span className="tag" style={{ background: "var(--accent-orange-light)", color: "var(--accent-orange)" }}>No handoff yet</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== CRISIS REQUESTS TAB ==================== */}
        {activeTab === "urgent" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Crisis Requests</h2>
              <button onClick={() => setShowUrgentForm(!showUrgentForm)} className="btn btn-urgent text-sm">
                + New Request
              </button>
            </div>

            {showUrgentForm && (
              <div className="card p-6 mb-6 animate-fade-in">
                <h3 className="text-lg font-bold mb-4">Post an Urgent Request</h3>
                <form onSubmit={handlePostUrgent} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                      What do you need?
                    </label>
                    <input
                      type="text"
                      required
                      value={urgentForm.title}
                      onChange={(e) => setUrgentForm({ ...urgentForm, title: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg text-sm"
                      style={{ border: "1.5px solid var(--border-light)", background: "var(--bg-primary)" }}
                      placeholder="e.g. 2 delivery drivers for meal distribution"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                      Description
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={urgentForm.description}
                      onChange={(e) => setUrgentForm({ ...urgentForm, description: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg text-sm"
                      style={{ border: "1.5px solid var(--border-light)", background: "var(--bg-primary)" }}
                      placeholder="Tell volunteers what they'll be doing and why it matters..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>When</label>
                      <input
                        type="datetime-local"
                        required
                        value={urgentForm.deadline}
                        onChange={(e) => setUrgentForm({ ...urgentForm, deadline: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg text-sm"
                        style={{ border: "1.5px solid var(--border-light)", background: "var(--bg-primary)" }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>How many people</label>
                      <input
                        type="number"
                        min={1}
                        value={urgentForm.people_needed}
                        onChange={(e) => setUrgentForm({ ...urgentForm, people_needed: parseInt(e.target.value) })}
                        className="w-full px-4 py-2.5 rounded-lg text-sm"
                        style={{ border: "1.5px solid var(--border-light)", background: "var(--bg-primary)" }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                        Skills needed (comma separated)
                      </label>
                      <input
                        type="text"
                        value={urgentForm.skills}
                        onChange={(e) => setUrgentForm({ ...urgentForm, skills: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg text-sm"
                        style={{ border: "1.5px solid var(--border-light)", background: "var(--bg-primary)" }}
                        placeholder="e.g. Driving/transportation, Cooking/food prep"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                        Languages needed (comma separated)
                      </label>
                      <input
                        type="text"
                        value={urgentForm.languages}
                        onChange={(e) => setUrgentForm({ ...urgentForm, languages: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg text-sm"
                        style={{ border: "1.5px solid var(--border-light)", background: "var(--bg-primary)" }}
                        placeholder="e.g. English, Cantonese"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={submitting} className="btn btn-primary">
                      {submitting ? "Posting..." : "Post & Notify Volunteers"}
                    </button>
                    <button type="button" onClick={() => setShowUrgentForm(false)} className="btn btn-outline">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Posted requests */}
            <div className="stagger-children">
              {postedRequests.map((req) => (
                <div
                  key={req.id}
                  className="card p-6 mb-4"
                  style={{ borderLeft: `4px solid ${req.status === "active" ? "var(--urgency-critical)" : "var(--accent-green)"}` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className={`urgency-badge ${req.status === "active" ? "urgency-critical" : "urgency-low"}`}>
                        {req.status === "active" ? "Active" : req.status === "fulfilled" ? "Fulfilled" : req.status}
                      </span>
                      <h3 className="text-lg font-bold mt-2">{req.title}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold" style={{ color: "var(--urgency-critical)" }}>
                        {new Date(req.deadline).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </div>
                      <div className="text-lg font-bold mt-1" style={{ color: req.people_confirmed >= req.people_needed ? "var(--accent-green)" : "var(--accent-orange)" }}>
                        {req.people_confirmed} / {req.people_needed}
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>volunteers confirmed</div>
                    </div>
                  </div>

                  <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>{req.description}</p>

                  <div className="flex gap-2 flex-wrap mb-3">
                    {req.skills_required?.map((skill) => (
                      <span key={skill} className="tag tag-skill">{skill}</span>
                    ))}
                    {req.languages_required?.map((lang) => (
                      <span key={lang} className="tag tag-language">{lang}</span>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="score-bar w-full">
                    <div
                      className="score-bar-fill"
                      style={{
                        width: `${Math.min((req.people_confirmed / req.people_needed) * 100, 100)}%`,
                        background: req.people_confirmed >= req.people_needed ? "var(--accent-green)" : "var(--accent-orange)",
                      }}
                    />
                  </div>
                </div>
              ))}

              {postedRequests.length === 0 && !showUrgentForm && (
                <div className="card p-8 text-center">
                  <p style={{ color: "var(--text-muted)" }}>
                    No crisis requests posted yet. Click &quot;+ New Request&quot; to mobilize volunteers.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== VOLUNTEERS TAB ==================== */}
        {activeTab === "volunteers" && (
          <div>
            <h2 className="text-2xl font-bold mb-2">My Volunteers</h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              Engagement status powered by churn prediction model. Green = active, yellow = cooling off, red = at risk of leaving.
            </p>

            <div className="stagger-children">
              {volunteers
                .sort((a, b) => {
                  const order = { "at-risk": 0, cooling: 1, active: 2 };
                  return order[a.status] - order[b.status];
                })
                .map((vol) => (
                  <VolunteerRow key={vol.name} vol={vol} getStatusColor={getStatusColor} getStatusBg={getStatusBg} />
                ))}
            </div>
          </div>
        )}

        {/* ==================== KNOWLEDGE BASE TAB ==================== */}
        {activeTab === "handoffs" && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-2">Knowledge Base</h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              When volunteers leave, their knowledge stays. Handoff documents are attached to roles, not people.
            </p>

            <div className="card p-6 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">Meal Delivery — East Van Route</h3>
                <span className="tag tag-skill">Complete</span>
              </div>
              <div className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <div><span className="font-semibold" style={{ color: "var(--text-primary)" }}>Key contacts: </span>Maria (kitchen, ext 204), Joe (warehouse, arrives 7am)</div>
                <div><span className="font-semibold" style={{ color: "var(--text-primary)" }}>Tasks: </span>Pick up by 9am from 4885 Valley Dr, follow route sheet, return bins by 1pm</div>
                <div><span className="font-semibold" style={{ color: "var(--text-primary)" }}>Tips: </span>Buzzer code 7742 at 41st. Mrs. Chen (3rd floor) needs door delivery. Bring extra bags.</div>
              </div>
              <div className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>Left by: Previous volunteer • 3 weeks ago</div>
            </div>

            <div className="card p-6 mb-4" style={{ borderLeft: "3px solid var(--accent-orange)" }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">Saturday Kitchen Lead</h3>
                <span className="tag" style={{ background: "var(--accent-orange-light)", color: "var(--accent-orange)" }}>Missing</span>
              </div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No handoff documentation yet. The current volunteer (Ben Dubois) has been flagged as at-risk.
              </p>
              <button className="btn btn-outline text-sm mt-3">Request Handoff from Ben</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// VOLUNTEER ROW COMPONENT
// ============================================

function VolunteerRow({
  vol,
  getStatusColor,
  getStatusBg,
}: {
  vol: DemoVolunteerSummary;
  getStatusColor: (s: string) => string;
  getStatusBg: (s: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card mb-3 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="status-dot" style={{ background: getStatusColor(vol.status) }} />
          <div>
            <div className="font-semibold text-sm">{vol.name}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {vol.total_hours} hours • {vol.total_shifts} shifts • {vol.crisis_responses} crisis responses
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-semibold px-2 py-1 rounded-full capitalize"
            style={{ background: getStatusBg(vol.status), color: getStatusColor(vol.status) }}
          >
            {vol.status === "at-risk" ? "At Risk" : vol.status}
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 animate-fade-in" style={{ borderTop: "1px solid var(--border-light)" }}>
          <div className="grid grid-cols-2 gap-4 pt-3 text-sm">
            <div>
              <span style={{ color: "var(--text-muted)" }}>Last active: </span>
              <span className="font-medium">{vol.last_active_days_ago} days ago</span>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Streak: </span>
              <span className="font-medium">{vol.streak} weeks</span>
            </div>
            <div className="col-span-2">
              <span style={{ color: "var(--text-muted)" }}>Trend: </span>
              <span className="font-medium">{vol.trend}</span>
            </div>
            <div className="col-span-2">
              <span style={{ color: "var(--text-muted)" }}>Suggested action: </span>
              <span className="font-medium">{vol.suggested_action}</span>
            </div>
          </div>
          {vol.status !== "active" && (
            <button className="btn btn-primary text-sm mt-3">Send Check-in</button>
          )}
        </div>
      )}
    </div>
  );
}
