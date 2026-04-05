"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Org, Volunteer, UrgentRequest } from "@/lib/types";
import {
  computeMatchScore,
  rankOpportunitiesForVolunteer,
} from "@/lib/matching";
import { useRouter } from "next/navigation";

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

type DisplayUrgentRequest = UrgentRequest & { org?: Org; is_urgent?: boolean };

// ── Card hover style helper ───────────────────────────────────────
// Lifts the card, deepens the shadow, and "glows" the left border via box-shadow.
function cardHoverStyle(
  isHovered: boolean,
  accentColor: string,
): React.CSSProperties {
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
function ScoreBar({
  score,
  color,
  animate,
}: {
  score: number;
  color: string;
  animate: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        width: "6rem",
        height: "5px",
        borderRadius: "4px",
        background: "var(--border-light)",
        overflow: "hidden",
      }}
    >
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
  value,
  color,
  isHovered,
  unit,
}: {
  value: number;
  color: string;
  isHovered: boolean;
  unit?: string;
}) {
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
          transition:
            "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), color 200ms ease",
        }}
      >
        {value}
      </span>
      {unit && (
        <div
          style={{
            fontSize: "0.7rem",
            color: "var(--text-muted)",
            marginTop: "2px",
          }}
        >
          {unit}
        </div>
      )}
    </div>
  );
}

// ── Expandable details — grid-template-rows trick (no maxHeight jank) ──
function ExpandedDetails({
  expanded,
  children,
}: {
  expanded: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: expanded ? "1fr" : "0fr",
        opacity: expanded ? 1 : 0,
        marginTop: expanded ? "1rem" : "0",
        paddingTop: expanded ? "1rem" : "0",
        borderTop: expanded
          ? "1px solid var(--border-light)"
          : "1px solid transparent",
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
  const router = useRouter();
  const buildOnboardingForm = (profile: Volunteer) => ({
    name: profile.name || "",
    age: profile.age ? String(profile.age) : "",
    neighbourhood: profile.neighbourhood || "",
    languages: profile.languages || [],
    skills: profile.skills || [],
    interests: profile.interests || [],
    availability: profile.availability || "",
    hours_per_month: profile.hours_per_month || 8,
    has_vehicle: profile.has_vehicle || false,
    has_background_check: profile.has_background_check || false,
  });
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState({
    name: "",
    age: "",
    neighbourhood: "",
    languages: [] as string[],
    skills: [] as string[],
    interests: [] as string[],
    availability: "",
    hours_per_month: 8,
    has_vehicle: false,
    has_background_check: false,
  });
  const [activeTab, setActiveTab] = useState<Tab>("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [urgentRequests, setUrgentRequests] = useState<DisplayUrgentRequest[]>(
    [],
  );
  const [rankedOrgs, setRankedOrgs] = useState<RankedOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondedRequests, setRespondedRequests] = useState<
    Record<string, "accepted" | "declined">
  >({});
  const [plannedContributions, setPlannedContributions] = useState<
    PlannedContribution[]
  >([]);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [hoveredCancelPlan, setHoveredCancelPlan] = useState<string | null>(
    null,
  );
  const [impactChartReady, setImpactChartReady] = useState(false);
  const impactSlices = [
    { company: "Harvest of Hope Society", hours: 9, color: "#5f7f52" },
    { company: "Immigrant Services Society", hours: 6, color: "#cf5f5f" },
    { company: "South Van Neighbourhood House", hours: 5, color: "#d6a548" },
    { company: "Youth Futures Hub", hours: 4, color: "#6f8f7f" },
  ];
  const totalImpactHours = impactSlices.reduce(
    (sum, slice) => sum + slice.hours,
    0,
  );
  const impactChartSize = 220;
  const impactRadius = 82;
  const impactStrokeWidth = 56;
  const impactCircumference = 2 * Math.PI * impactRadius;
  const impactChartSlices = impactSlices.reduce(
    (acc, slice) => {
      const length = (slice.hours / totalImpactHours) * impactCircumference;
      acc.items.push({
        ...slice,
        length,
        offset: -acc.offset,
        percent: Math.round((slice.hours / totalImpactHours) * 100),
      });
      acc.offset += length;
      return acc;
    },
    {
      offset: 0,
      items: [] as Array<
        (typeof impactSlices)[number] & {
          length: number;
          offset: number;
          percent: number;
        }
      >,
    },
  ).items;

  // ── Auth + profile loading ──
  useEffect(() => {
    async function loadProfile() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth?role=volunteer");
        return;
      }
      const { data: vol } = await supabase
        .from("volunteers")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (vol) {
        const volunteerProfile = vol as Volunteer;
        setVolunteer(volunteerProfile);
        setOnboardingForm(buildOnboardingForm(volunteerProfile));
      } else {
        setShowOnboarding(true);
      }
      setAuthLoading(false);
    }
    loadProfile();
  }, [router]);

  const handleOnboardingSubmit = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const volunteerPayload = {
      user_id: session.user.id,
      name: onboardingForm.name,
      age: parseInt(onboardingForm.age) || null,
      neighbourhood: onboardingForm.neighbourhood,
      languages: onboardingForm.languages,
      skills: onboardingForm.skills,
      interests: onboardingForm.interests,
      availability: onboardingForm.availability,
      hours_per_month: onboardingForm.hours_per_month,
      has_vehicle: onboardingForm.has_vehicle,
      has_background_check: onboardingForm.has_background_check,
      prior_experience: volunteer?.prior_experience || "None",
    };

    const query = volunteer
      ? supabase
          .from("volunteers")
          .update(volunteerPayload)
          .eq("id", volunteer.id)
      : supabase.from("volunteers").insert({
          ...volunteerPayload,
        });

    const { data, error } = await query.select().single();
    if (!error && data) {
      const updatedVolunteer = data as Volunteer;
      setVolunteer(updatedVolunteer);
      setOnboardingForm(buildOnboardingForm(updatedVolunteer));
      setShowOnboarding(false);
    }
  };

  const openPreferencesEditor = () => {
    if (volunteer) {
      setOnboardingForm(buildOnboardingForm(volunteer));
    }
    setShowOnboarding(true);
  };

  const urgencyColor = (urgency: string) =>
    ({
      Critical: "var(--urgency-critical)",
      High: "var(--urgency-high)",
      Medium: "var(--urgency-medium)",
    })[urgency] || "var(--urgency-low)";
  const urgencyClass = (urgency: string) =>
    ({
      Critical: "urgency-critical",
      High: "urgency-high",
      Medium: "urgency-medium",
    })[urgency] || "urgency-low";
  const scoreColor = (score: number) =>
    score >= 60
      ? "var(--accent-green)"
      : score >= 35
        ? "var(--urgency-medium)"
        : "var(--urgency-high)";
  const describeAvailability = (value: string) => {
    if (value === "Flexible / as needed") return "Flexible, short notice";
    if (value === "Weekdays only") return "Weekdays";
    if (value === "Weekends only") return "Weekends";
    return value.toLowerCase();
  };
  const describeOrgCommitment = (org: Org) =>
    `${org.volunteer_urgency === "Critical" ? "2-3 hrs" : "1-2 hrs"} on ${describeAvailability(org.availability_preference)}`;
  const describeUrgentCommitment = (request: UrgentRequest) =>
    `${request.duration_hours ? `${request.duration_hours} hr${request.duration_hours === 1 ? "" : "s"} · ` : ""}${new Date(request.deadline).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}`;

  const addPlannedContribution = (contribution: PlannedContribution) => {
    setPlannedContributions((prev) =>
      prev.some((item) => item.id === contribution.id)
        ? prev
        : [contribution, ...prev],
    );
  };

  const removePlannedContribution = (id: string) => {
    setPlannedContributions((prev) => prev.filter((item) => item.id !== id));
    if (id.startsWith("urgent-")) {
      const requestId = id.replace("urgent-", "");
      setRespondedRequests((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
      setUrgentRequests((prev) =>
        prev.map((item) =>
          item.id === requestId && item.people_confirmed > 0
            ? { ...item, people_confirmed: item.people_confirmed - 1 }
            : item,
        ),
      );
    }
  };

  const handleAcceptUrgent = async (requestId: string) => {
    const request = urgentRequests.find((item) => item.id === requestId);
    if (!request || request.people_confirmed >= request.people_needed) return;
    try {
      await supabase.from("urgent_responses").insert({
        urgent_request_id: requestId,
        volunteer_id: volunteer!.id,
        status: "accepted",
        responded_at: new Date().toISOString(),
      });
    } catch {
      /* demo fallback */
    }
    await supabase
      .from("urgent_requests")
      .update({ people_confirmed: (request?.people_confirmed || 0) + 1 })
      .eq("id", requestId);

    if (request) {
      setUrgentRequests((prev) =>
        prev.map((item) =>
          item.id === requestId
            ? { ...item, people_confirmed: (item.people_confirmed || 0) + 1 }
            : item,
        ),
      );
      addPlannedContribution({
        id: `urgent-${request.id}`,
        title: request.title,
        orgName:
          request.org?.account_name ||
          request.org?.legal_name ||
          "Organization",
        location: request.is_remote ? "Remote" : request.org?.city || "BC",
        timing: describeUrgentCommitment(request),
        details: request.description,
        match: request.org
          ? computeMatchScore(volunteer!, request.org).score
          : 0,
        type: "urgent",
      });
    }
    setRespondedRequests((prev) => ({ ...prev, [requestId]: "accepted" }));
    setActiveTab("plans");
  };

  const handleDeclineUrgent = async (requestId: string) => {
    try {
      await supabase.from("urgent_responses").insert({
        urgent_request_id: requestId,
        volunteer_id: volunteer!.id,
        status: "declined",
        responded_at: new Date().toISOString(),
      });
    } catch {
      /* demo fallback */
    }
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
    if (!volunteer) return;
    async function fetchData() {
      setLoading(true);
      const { data: orgData } = await supabase.from("orgs").select("*");
      const fetchedOrgs = (orgData || []) as Org[];
      setOrgs(fetchedOrgs);
      setRankedOrgs(rankOpportunitiesForVolunteer(volunteer!, fetchedOrgs));
      const { data: urgentData } = await supabase
        .from("urgent_requests")
        .select("*")
        .eq("status", "active");
      if (urgentData && urgentData.length > 0) {
        setUrgentRequests(
          (urgentData as UrgentRequest[]).map((r) => ({
            ...r,
            org: fetchedOrgs.find((o) => o.id === r.org_id),
          })),
        );
      }
      setLoading(false);
    }
    fetchData();

    const channel = supabase
      .channel("urgent-requests")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "urgent_requests" },
        (payload) => {
          const r = payload.new as UrgentRequest;
          setUrgentRequests((prev) => [
            { ...r, org: orgs.find((o) => o.id === r.org_id) },
            ...prev,
          ]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "urgent_requests" },
        (payload) => {
          const updated = payload.new as UrgentRequest;
          setUrgentRequests((prev) =>
            prev.map((r) =>
              r.id === updated.id ? { ...r, ...updated, org: r.org } : r,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "urgent_requests" },
        (payload) => {
          const deleted = payload.old as UrgentRequest;
          setUrgentRequests((prev) => prev.filter((r) => r.id !== deleted.id));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volunteer]);

  useEffect(() => {
    if (activeTab !== "impact") {
      setImpactChartReady(false);
      return;
    }
    setImpactChartReady(false);
    const timer = window.setTimeout(() => setImpactChartReady(true), 80);
    return () => window.clearTimeout(timer);
  }, [activeTab]);

  const tabs: { id: Tab; label: string; alert?: boolean }[] = [
    { id: "browse", label: "Browse", alert: urgentRequests.length > 0 },
    { id: "plans", label: "My Plans" },
    { id: "impact", label: "My Impact" },
    { id: "handoffs", label: "Handoffs" },
  ];

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const matchesSearch = (...values: Array<string | undefined | null>) =>
    normalizedSearch.length === 0 ||
    values.some((value) =>
      (value || "").toLowerCase().includes(normalizedSearch),
    );

  const actualUrgent = urgentRequests.filter((r) => r.is_urgent !== false);
  const generalOpportunities = urgentRequests.filter(
    (r) => r.is_urgent === false,
  );

  const filteredUrgentRequests = actualUrgent.filter((request) =>
    matchesSearch(
      request.title,
      request.description,
      request.org?.account_name,
      request.org?.legal_name,
      request.org?.city,
      request.org?.availability_preference,
      request.skills_required?.join(" "),
      request.languages_required?.join(" "),
    ),
  );

  const filteredRankedOrgs = rankedOrgs.filter(({ org }) =>
    matchesSearch(
      org.account_name,
      org.legal_name,
      org.sector,
      org.city,
      org.province,
      org.org_size,
      org.availability_preference,
      org.skills_needed?.join(" "),
      org.languages_needed?.join(" "),
    ),
  );

  const filteredGeneralOpportunities = generalOpportunities.filter((request) =>
    matchesSearch(
      request.title,
      request.description,
      request.org?.account_name,
      request.org?.legal_name,
      request.skills_required?.join(" "),
      request.languages_required?.join(" "),
    ),
  );

  const filteredPlannedContributions = plannedContributions.filter((item) =>
    matchesSearch(
      item.title,
      item.orgName,
      item.location,
      item.timing,
      item.details,
    ),
  );

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-primary)",
        }}
      >
        <p
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
        >
          Loading your dashboard...
        </p>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-primary)",
        }}
      >
        <p
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
        >
          Loading...
        </p>
      </div>
    );
  }

  if (showOnboarding || !volunteer) {
    const NEIGHBOURHOOD_OPTIONS = [
      "Downtown",
      "Dunbar-Southlands",
      "Fairview",
      "Grandview-Woodland",
      "Hastings-Sunrise",
      "Kensington-Cedar Cottage",
      "Kerrisdale",
      "Kitsilano",
      "Marpole",
      "Mount Pleasant",
      "Oakridge",
      "Point Grey",
      "Renfrew-Collingwood",
      "Riley Park",
      "Shaughnessy",
      "South Cambie",
      "Strathcona",
      "Sunset",
      "Victoria-Fraserview",
      "West End",
    ];
    const SKILL_OPTIONS = [
      "Driving/transportation",
      "Tutoring/mentorship",
      "Translation/interpretation",
      "Event coordination",
      "Cooking/food prep",
      "Administrative support",
      "Mental health support",
      "First aid/CPR",
      "Photography",
      "Social media",
      "Data entry",
      "Grant writing",
      "IT support",
      "Arts facilitation",
      "Outreach/community engagement",
      "Teaching/training",
      "Elder care",
      "Childcare support",
    ];
    const INTEREST_OPTIONS = [
      "Food security",
      "Youth services",
      "Senior services",
      "Mental health",
      "Housing & homelessness",
      "Newcomer & immigrant support",
      "Arts & culture",
      "Environment",
      "Women & gender equity",
      "Indigenous services",
      "Disability services",
      "Community health",
      "Education & literacy",
      "Anti-poverty",
    ];
    const LANGUAGE_OPTIONS = [
      "English",
      "Mandarin",
      "Cantonese",
      "Punjabi",
      "Tagalog",
      "Vietnamese",
      "Korean",
      "Spanish",
      "French",
      "Arabic",
      "Hindi",
      "Farsi",
      "Somali",
      "Tigrinya",
    ];
    const AVAILABILITY_OPTIONS = [
      "Flexible / as needed",
      "Weekday mornings",
      "Weekday afternoons",
      "Weekday evenings",
      "Weekends only",
      "Weekend mornings",
      "Weekend afternoons",
      "Evenings only",
    ];
    const toggleArray = (arr: string[], item: string) =>
      arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
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

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-primary)",
          fontFamily: "var(--font-body)",
          display: "flex",
          justifyContent: "center",
          padding: "3rem 1.5rem",
        }}
      >
        <div style={{ maxWidth: "580px", width: "100%" }}>
          <div style={{ marginBottom: "2rem" }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.6rem",
                fontWeight: 500,
                letterSpacing: "-0.02em",
                marginBottom: "0.25rem",
              }}
            >
              match-
              <em style={{ color: "var(--accent-green)", fontStyle: "italic" }}>
                a
              </em>
              -volunteer
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              {volunteer
                ? "Update your interests and availability so we can refresh your matches."
                : "Tell us about yourself so we can find the right opportunities."}
            </p>
          </div>
          <div className="card" style={{ padding: "2rem" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: "1rem",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    marginBottom: "0.4rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Your name
                </label>
                <input
                  type="text"
                  value={onboardingForm.name}
                  onChange={(e) =>
                    setOnboardingForm({
                      ...onboardingForm,
                      name: e.target.value,
                    })
                  }
                  style={inputStyle}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    marginBottom: "0.4rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Age
                </label>
                <input
                  type="number"
                  value={onboardingForm.age}
                  onChange={(e) =>
                    setOnboardingForm({
                      ...onboardingForm,
                      age: e.target.value,
                    })
                  }
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  marginBottom: "0.4rem",
                  color: "var(--text-secondary)",
                }}
              >
                Neighbourhood
              </label>
              <select
                value={onboardingForm.neighbourhood}
                onChange={(e) =>
                  setOnboardingForm({
                    ...onboardingForm,
                    neighbourhood: e.target.value,
                  })
                }
                style={{ ...inputStyle, appearance: "none" as const }}
              >
                <option value="">Select your neighbourhood</option>
                {NEIGHBOURHOOD_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                  color: "var(--text-secondary)",
                }}
              >
                Languages you speak
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {LANGUAGE_OPTIONS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() =>
                      setOnboardingForm({
                        ...onboardingForm,
                        languages: toggleArray(onboardingForm.languages, l),
                      })
                    }
                    className={`tag ${onboardingForm.languages.includes(l) ? "tag-selected" : ""}`}
                    style={{ cursor: "pointer", border: "none" }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                  color: "var(--text-secondary)",
                }}
              >
                Causes you care about
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {INTEREST_OPTIONS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setOnboardingForm({
                        ...onboardingForm,
                        interests: toggleArray(onboardingForm.interests, i),
                      })
                    }
                    className={`tag ${onboardingForm.interests.includes(i) ? "tag-selected" : ""}`}
                    style={{ cursor: "pointer", border: "none" }}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                  color: "var(--text-secondary)",
                }}
              >
                Skills you can offer
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {SKILL_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setOnboardingForm({
                        ...onboardingForm,
                        skills: toggleArray(onboardingForm.skills, s),
                      })
                    }
                    className={`tag ${onboardingForm.skills.includes(s) ? "tag-selected" : ""}`}
                    style={{ cursor: "pointer", border: "none" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                  color: "var(--text-secondary)",
                }}
              >
                When are you available?
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {AVAILABILITY_OPTIONS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() =>
                      setOnboardingForm({ ...onboardingForm, availability: a })
                    }
                    className={`tag ${onboardingForm.availability === a ? "tag-selected" : ""}`}
                    style={{ cursor: "pointer", border: "none" }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    marginBottom: "0.4rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Hours/month
                </label>
                <input
                  type="number"
                  min={1}
                  value={onboardingForm.hours_per_month}
                  onChange={(e) =>
                    setOnboardingForm({
                      ...onboardingForm,
                      hours_per_month: parseInt(e.target.value) || 1,
                    })
                  }
                  style={inputStyle}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    marginBottom: "0.4rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Vehicle access?
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[
                    { label: "Yes", value: true },
                    { label: "No", value: false },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() =>
                        setOnboardingForm({
                          ...onboardingForm,
                          has_vehicle: option.value,
                        })
                      }
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1.5px solid",
                        borderColor:
                          onboardingForm.has_vehicle === option.value
                            ? "var(--accent-green)"
                            : "var(--border-light)",
                        background:
                          onboardingForm.has_vehicle === option.value
                            ? "var(--accent-green-light)"
                            : "var(--bg-primary)",
                        color:
                          onboardingForm.has_vehicle === option.value
                            ? "var(--accent-green)"
                            : "var(--text-secondary)",
                        fontSize: "0.82rem",
                        fontWeight:
                          onboardingForm.has_vehicle === option.value
                            ? 600
                            : 400,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.18s ease",
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {volunteer && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setOnboardingForm(buildOnboardingForm(volunteer));
                    setShowOnboarding(false);
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleOnboardingSubmit}
                className="btn btn-primary"
                style={{ width: "100%", flex: 1 }}
                disabled={
                  !onboardingForm.name ||
                  onboardingForm.languages.length === 0 ||
                  onboardingForm.interests.length === 0
                }
              >
                {volunteer ? "Save updates" : "Find my matches"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!volunteer) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* ── Nav ── */}
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
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: "0.8rem", padding: "8px 14px" }}
            onClick={openPreferencesEditor}
          >
            Update Preferences
          </button>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {volunteer.name}
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

      {/* ── Tabs ── */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          padding: "1rem 1.5rem 0",
          borderBottom: "1px solid var(--border-light)",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              position: "relative",
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
              transition: "color 180ms ease",
            }}
          >
            {tab.label}
            {tab.alert && (
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--urgency-critical)",
                }}
              />
            )}
          </button>
        ))}
      </div>

      <div
        style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 1.5rem" }}
      >
        {(activeTab === "browse" || activeTab === "plans") && (
          <div style={{ marginBottom: "1.5rem" }}>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === "plans"
                  ? "Search your plans"
                  : "Search organizations, skills, locations..."
              }
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1.5px solid var(--border-light)",
                background: "var(--bg-card)",
                fontSize: "0.9rem",
                color: "var(--text-primary)",
                outline: "none",
                boxShadow: "var(--shadow-sm)",
              }}
            />
          </div>
        )}

        {/* ══ BROWSE ══ */}
        {activeTab === "browse" && (
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
                fontWeight: 500,
                marginBottom: "0.25rem",
              }}
            >
              Browse ways to help
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                marginBottom: "1.5rem",
              }}
            >
              Hover to see more details, then check in when something fits.
            </p>

            {filteredUrgentRequests.map((request) => {
              const score = request.org
                ? computeMatchScore(volunteer, request.org).score
                : 0;
              const cardId = `urgent-${request.id}`;
              const isHovered = hoveredCard === cardId;
              const spotsLeft = Math.max(
                1,
                (request.people_needed || 0) - (request.people_confirmed || 0),
              );
              const isFull =
                (request.people_confirmed || 0) >= (request.people_needed || 0);

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
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div>
                      <span className="urgency-badge urgency-critical">
                        Urgent Request
                      </span>
                      <h3
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "1.1rem",
                          fontWeight: 500,
                          marginTop: "0.5rem",
                        }}
                      >
                        {request.title}
                      </h3>
                      <p
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                          marginTop: "0.25rem",
                        }}
                      >
                        {request.org?.account_name || request.org?.legal_name} ·{" "}
                        {request.org?.city || "BC"}
                      </p>
                    </div>
                    <ScoreNumber
                      value={spotsLeft}
                      color="var(--urgency-critical)"
                      isHovered={isHovered}
                      unit="spots left"
                    />
                  </div>

                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                      marginBottom: "1rem",
                    }}
                  >
                    {request.description}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: "0.4rem",
                      flexWrap: "wrap",
                      marginBottom: "1rem",
                    }}
                  >
                    {request.skills_required?.map((skill) => (
                      <span key={skill} className="tag tag-skill">
                        {skill}
                      </span>
                    ))}
                    {request.languages_required?.map((language) => (
                      <span key={language} className="tag tag-language">
                        {language}
                      </span>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <ScoreBar
                        score={score}
                        color={scoreColor(score)}
                        animate={isHovered}
                      />
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: scoreColor(score),
                          transition: "color 200ms ease",
                        }}
                      >
                        {score}% match
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {respondedRequests[request.id] === "accepted" ? (
                        <div
                          className="btn"
                          style={{
                            background: "var(--accent-green-light)",
                            color: "var(--accent-green)",
                            cursor: "default",
                            fontSize: "0.8rem",
                          }}
                        >
                          Checked in
                        </div>
                      ) : respondedRequests[request.id] === "declined" ? (
                        <div
                          className="btn"
                          style={{
                            background: "var(--bg-secondary)",
                            color: "var(--text-muted)",
                            cursor: "default",
                            fontSize: "0.8rem",
                          }}
                        >
                          Declined
                        </div>
                      ) : isFull ? (
                        <div
                          className="btn"
                          style={{
                            background: "var(--bg-secondary)",
                            color: "var(--text-muted)",
                            cursor: "default",
                            fontSize: "0.8rem",
                          }}
                        >
                          Filled
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleDeclineUrgent(request.id)}
                            className="btn btn-outline"
                            style={{ fontSize: "0.8rem", padding: "8px 16px" }}
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleAcceptUrgent(request.id)}
                            className="btn btn-urgent"
                            style={{ fontSize: "0.8rem", padding: "8px 16px" }}
                          >
                            I Can Help
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <ExpandedDetails expanded={isHovered}>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <strong style={{ color: "var(--text-primary)" }}>
                        Location:
                      </strong>{" "}
                      {request.is_remote ? "Remote" : request.org?.city || "BC"}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <strong style={{ color: "var(--text-primary)" }}>
                        Availability:
                      </strong>{" "}
                      {describeAvailability(
                        request.org?.availability_preference ||
                          volunteer.availability,
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <strong style={{ color: "var(--text-primary)" }}>
                        When & length:
                      </strong>{" "}
                      {describeUrgentCommitment(request)}
                    </div>
                  </ExpandedDetails>
                </div>
              );
            })}

            {filteredGeneralOpportunities.map((req) => {
              const score = req.org
                ? computeMatchScore(volunteer!, req.org).score
                : 0;
              const cardId = `gen-${req.id}`;
              const isHovered = hoveredCard === cardId;
              const isFull = req.people_confirmed >= req.people_needed;

              return (
                <div
                  key={cardId}
                  className="card card-interactive"
                  onMouseEnter={() => setHoveredCard(cardId)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    padding: "1.5rem",
                    marginBottom: "1rem",
                    borderLeft: "4px solid var(--accent-green)",
                    cursor: "default",
                    ...cardHoverStyle(isHovered, "var(--accent-green)"),
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
                      <span className="urgency-badge urgency-low">
                        Open Request
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
                      <p
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                          marginTop: "0.25rem",
                        }}
                      >
                        {req.org?.account_name || req.org?.legal_name} ·{" "}
                        {req.org?.city || "BC"}
                      </p>
                    </div>
                    <ScoreNumber
                      value={Math.max(
                        0,
                        (req.people_needed || 0) - (req.people_confirmed || 0),
                      )}
                      color="var(--accent-green)"
                      isHovered={isHovered}
                      unit="spots left"
                    />
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
                      marginBottom: "1rem",
                    }}
                  >
                    {req.skills_required?.map((skill) => (
                      <span key={skill} className="tag tag-skill">
                        {skill}
                      </span>
                    ))}
                    {req.languages_required?.map((language) => (
                      <span key={language} className="tag tag-language">
                        {language}
                      </span>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <ScoreBar
                        score={score}
                        color={scoreColor(score)}
                        animate={isHovered}
                      />
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: scoreColor(score),
                          transition: "color 200ms ease",
                        }}
                      >
                        {score}% match
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {respondedRequests[req.id] === "accepted" ? (
                        <div
                          className="btn"
                          style={{
                            background: "var(--accent-green-light)",
                            color: "var(--accent-green)",
                            cursor: "default",
                            fontSize: "0.8rem",
                          }}
                        >
                          Checked in
                        </div>
                      ) : isFull ? (
                        <div
                          className="btn"
                          style={{
                            background: "var(--bg-secondary)",
                            color: "var(--text-muted)",
                            cursor: "default",
                            fontSize: "0.8rem",
                          }}
                        >
                          Filled
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAcceptUrgent(req.id)}
                          className="btn btn-primary"
                          style={{ fontSize: "0.8rem", padding: "8px 16px" }}
                        >
                          I Can Help
                        </button>
                      )}
                    </div>
                  </div>

                  <ExpandedDetails expanded={isHovered}>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <strong style={{ color: "var(--text-primary)" }}>
                        Location:
                      </strong>{" "}
                      {req.is_remote ? "Remote" : req.org?.city || "BC"}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <strong style={{ color: "var(--text-primary)" }}>
                        Availability:
                      </strong>{" "}
                      {describeAvailability(
                        req.org?.availability_preference ||
                          volunteer!.availability,
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <strong style={{ color: "var(--text-primary)" }}>
                        When:
                      </strong>{" "}
                      {describeUrgentCommitment(req)}
                    </div>
                  </ExpandedDetails>
                </div>
              );
            })}

            {/* Org opportunity cards */}
            {filteredRankedOrgs.map(({ org, score, breakdown }) => {
              const cardId = `org-${org.id}`;
              const isHovered = hoveredCard === cardId;
              const isPlanned = plannedContributions.some(
                (item) => item.id === cardId,
              );
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
                        className={`urgency-badge ${urgencyClass(org.volunteer_urgency)}`}
                      >
                        {org.volunteer_urgency} need
                      </span>
                      <h3
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "1.1rem",
                          fontWeight: 500,
                          marginTop: "0.5rem",
                        }}
                      >
                        {org.account_name || org.legal_name}
                      </h3>
                      <p
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                          marginTop: "0.25rem",
                        }}
                      >
                        {org.sector} · {org.city}
                      </p>
                    </div>
                    <ScoreNumber
                      value={score}
                      color={scoreColor(score)}
                      isHovered={isHovered}
                      unit="match"
                    />
                  </div>

                  {/* Score breakdown — fades up to full opacity on hover */}
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      marginBottom: "1rem",
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      flexWrap: "wrap",
                      opacity: isHovered ? 1 : 0.38,
                      transform: isHovered
                        ? "translateY(0)"
                        : "translateY(2px)",
                      transition: "opacity 250ms ease, transform 250ms ease",
                    }}
                  >
                    <span>Skills {breakdown.skills}/35</span>
                    <span>Language {breakdown.language}/25</span>
                    <span>Availability {breakdown.availability}/20</span>
                    <span>Cause {breakdown.cause_alignment}/10</span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "0.4rem",
                      flexWrap: "wrap",
                      marginBottom: "1rem",
                    }}
                  >
                    {org.skills_needed?.map((skill) => {
                      const hasSkill = volunteer.skills.some(
                        (v) => v.toLowerCase() === skill.toLowerCase(),
                      );
                      return (
                        <span
                          key={skill}
                          className={`tag ${hasSkill ? "tag-selected" : "tag-skill"}`}
                        >
                          {hasSkill ? "✓ " : ""}
                          {skill}
                        </span>
                      );
                    })}
                    {org.languages_needed?.map((language) => {
                      const hasLanguage = volunteer.languages.some(
                        (v) => v.toLowerCase() === language.toLowerCase(),
                      );
                      return (
                        <span
                          key={language}
                          className={`tag ${hasLanguage ? "tag-selected" : ""}`}
                          style={
                            hasLanguage
                              ? {}
                              : {
                                  background: "var(--accent-green-light)",
                                  color: "var(--accent-green)",
                                  border: "1px solid var(--accent-green-light)",
                                }
                          }
                        >
                          {hasLanguage ? "✓ " : ""}
                          {language}
                        </span>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <ScoreBar
                        score={score}
                        color={scoreColor(score)}
                        animate={isHovered}
                      />
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: scoreColor(score),
                        }}
                      >
                        {score}% match
                      </span>
                    </div>
                    {isPlanned ? (
                      <div
                        className="btn"
                        style={{
                          background: "var(--accent-green-light)",
                          color: "var(--accent-green)",
                          cursor: "default",
                          fontSize: "0.8rem",
                        }}
                      >
                        Checked in
                      </div>
                    ) : (
                      <button
                        onClick={() => handleVolunteerForOrg(org, score)}
                        className="btn btn-primary"
                        style={{ fontSize: "0.8rem", padding: "8px 16px" }}
                      >
                        I Can Help
                      </button>
                    )}
                  </div>

                  <ExpandedDetails expanded={isHovered}>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <strong style={{ color: "var(--text-primary)" }}>
                        Location:
                      </strong>{" "}
                      {org.city}, {org.province}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <strong style={{ color: "var(--text-primary)" }}>
                        Availability:
                      </strong>{" "}
                      {describeAvailability(org.availability_preference)}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <strong style={{ color: "var(--text-primary)" }}>
                        When & length:
                      </strong>{" "}
                      {describeOrgCommitment(org)}
                    </div>
                  </ExpandedDetails>
                </div>
              );
            })}
            {filteredUrgentRequests.length === 0 &&
              filteredRankedOrgs.length === 0 && (
                <div
                  className="card"
                  style={{ padding: "3rem", textAlign: "center" }}
                >
                  <p style={{ color: "var(--text-muted)" }}>
                    No opportunities match your search right now.
                  </p>
                </div>
              )}
          </div>
        )}

        {/* ══ PLANS ══ */}
        {activeTab === "plans" && (
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
                fontWeight: 500,
                marginBottom: "0.25rem",
              }}
            >
              My Plans
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                marginBottom: "1.5rem",
              }}
            >
              Events and shifts you&apos;ve checked into appear here.
            </p>
            {filteredPlannedContributions.map((item) => (
              <div
                key={item.id}
                className="card"
                style={{ padding: "1.5rem", marginBottom: "1rem" }}
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
                      className={`urgency-badge ${item.type === "urgent" ? "urgency-critical" : "urgency-low"}`}
                    >
                      {item.type === "urgent" ? "Checked in" : "Planned"}
                    </span>
                    <h3
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.1rem",
                        fontWeight: 500,
                        marginTop: "0.5rem",
                      }}
                    >
                      {item.title}
                    </h3>
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                        marginTop: "0.25rem",
                      }}
                    >
                      {item.orgName}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.3rem",
                        fontWeight: 500,
                        color: scoreColor(item.match),
                      }}
                    >
                      {item.match}%
                    </div>
                    <div
                      style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
                    >
                      match
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gap: "0.45rem",
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  <div>
                    <strong style={{ color: "var(--text-primary)" }}>
                      Location:
                    </strong>{" "}
                    {item.location}
                  </div>
                  <div>
                    <strong style={{ color: "var(--text-primary)" }}>
                      Availability:
                    </strong>{" "}
                    {item.timing}
                  </div>
                  <div>
                    <strong style={{ color: "var(--text-primary)" }}>
                      Details:
                    </strong>{" "}
                    {item.details}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "1rem",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => removePlannedContribution(item.id)}
                    onMouseEnter={() => setHoveredCancelPlan(item.id)}
                    onMouseLeave={() => setHoveredCancelPlan(null)}
                    className="btn"
                    style={{
                      fontSize: "0.8rem",
                      padding: "8px 16px",
                      background:
                        hoveredCancelPlan === item.id
                          ? "var(--urgency-critical)"
                          : "rgba(214, 40, 40, 0.08)",
                      color:
                        hoveredCancelPlan === item.id
                          ? "white"
                          : "var(--urgency-critical)",
                      border:
                        hoveredCancelPlan === item.id
                          ? "1.5px solid var(--urgency-critical)"
                          : "1.5px solid rgba(214, 40, 40, 0.22)",
                      transition:
                        "background 180ms ease, color 180ms ease, border-color 180ms ease",
                    }}
                  >
                    Cancel plan
                  </button>
                </div>
              </div>
            ))}
            {filteredPlannedContributions.length === 0 && (
              <div
                className="card"
                style={{ padding: "3rem", textAlign: "center" }}
              >
                <p style={{ color: "var(--text-muted)" }}>
                  {plannedContributions.length === 0
                    ? "You haven't checked into anything yet. Browse opportunities to get started."
                    : "No plans match your search."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ══ IMPACT ══ */}
        {activeTab === "impact" && (
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
                fontWeight: 500,
                marginBottom: "0.35rem",
              }}
            >
              Your Impact
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                marginBottom: "1.5rem",
              }}
            >
              A simple view of how your hours were shared across organizations.
            </p>

            <div
              className="card"
              style={{
                padding: "1.75rem",
                marginBottom: "2rem",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1.25rem",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--accent-green)",
                      marginBottom: "0.35rem",
                    }}
                  >
                    April Breakdown
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.2rem",
                      fontWeight: 500,
                    }}
                  >
                    Hours by organization
                  </div>
                </div>
                <div className="tag tag-skill">
                  {totalImpactHours} total hours
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "280px 1fr",
                  gap: "2rem",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div
                    style={{
                      width: `${impactChartSize}px`,
                      height: `${impactChartSize}px`,
                      borderRadius: "50%",
                      position: "relative",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <svg
                      width={impactChartSize}
                      height={impactChartSize}
                      viewBox={`0 0 ${impactChartSize} ${impactChartSize}`}
                      style={{
                        overflow: "visible",
                        transform: "rotate(-90deg)",
                      }}
                      aria-hidden="true"
                    >
                      <circle
                        cx={impactChartSize / 2}
                        cy={impactChartSize / 2}
                        r={impactRadius}
                        fill="none"
                        stroke="rgba(95, 127, 82, 0.12)"
                        strokeWidth={impactStrokeWidth}
                      />
                      {impactChartSlices.map((slice, index) => (
                        <circle
                          key={slice.company}
                          cx={impactChartSize / 2}
                          cy={impactChartSize / 2}
                          r={impactRadius}
                          fill="none"
                          stroke={slice.color}
                          strokeWidth={impactStrokeWidth}
                          strokeDasharray={
                            impactChartReady
                              ? `${slice.length} ${impactCircumference}`
                              : `0 ${impactCircumference}`
                          }
                          strokeDashoffset={impactChartReady ? slice.offset : 0}
                          strokeLinecap="round"
                          style={{
                            transition: `stroke-dasharray 1100ms cubic-bezier(0.16, 1, 0.3, 1) ${index * 70}ms, opacity 500ms ease ${index * 70}ms`,
                            opacity: impactChartReady ? 1 : 0.55,
                          }}
                        />
                      ))}
                    </svg>
                    <div
                      style={{
                        position: "absolute",
                        inset: "32px",
                        borderRadius: "50%",
                        background: "var(--bg-card)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        boxShadow: "0 0 0 1px var(--border-light)",
                        transform: impactChartReady
                          ? "scale(1)"
                          : "translateY(6px) scale(0.96)",
                        opacity: impactChartReady ? 1 : 0.85,
                        transition:
                          "transform 700ms cubic-bezier(0.22, 1, 0.36, 1) 140ms, opacity 500ms ease 140ms",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: "0.2rem",
                        }}
                      >
                        Total
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "2rem",
                          fontWeight: 500,
                          color: "var(--accent-green)",
                        }}
                      >
                        {totalImpactHours}h
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        this month
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {impactChartSlices.map((slice) => (
                    <div
                      key={slice.company}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "14px 1fr auto",
                        gap: "0.85rem",
                        alignItems: "center",
                        padding: "0.9rem 1rem",
                        borderRadius: "16px",
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border-light)",
                      }}
                    >
                      <span
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          background: slice.color,
                          display: "inline-block",
                        }}
                      />
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            marginBottom: "0.15rem",
                          }}
                        >
                          {slice.company}
                        </div>
                        <div
                          style={{
                            fontSize: "0.82rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {slice.hours} hour{slice.hours === 1 ? "" : "s"}{" "}
                          contributed this month
                        </div>
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "1.15rem",
                          fontWeight: 500,
                          color: slice.color,
                        }}
                      >
                        {slice.percent}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ HANDOFFS ══ */}
        {activeTab === "handoffs" && (
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
                fontWeight: 500,
                marginBottom: "0.5rem",
              }}
            >
              Role Handoffs
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                marginBottom: "1.5rem",
              }}
            >
              When you take on a role, any knowledge left by previous volunteers
              appears here.
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
                <span className="tag tag-skill">Inherited</span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                }}
              >
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>
                    Key contacts:
                  </strong>{" "}
                  Maria (kitchen coordinator, ext 204), Joe (warehouse, arrives
                  7am)
                </div>
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>
                    Recurring tasks:
                  </strong>{" "}
                  Pick up from 4885 Valley Dr by 9am, follow route sheet in
                  shared drive, return bins by 1pm
                </div>
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>
                    Tips:
                  </strong>{" "}
                  Building at 41st needs buzzer code 7742. Mrs. Chen on 3rd
                  floor needs meals left at door. Always bring extra bags.
                </div>
              </div>
              <div
                style={{
                  marginTop: "0.75rem",
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                }}
              >
                Left by: Previous volunteer · 3 weeks ago
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
