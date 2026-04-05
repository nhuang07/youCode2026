"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type UserRole = "volunteer" | "coordinator";
type VolunteerSignupStep = "account" | "survey";

interface VolunteerSurveyState {
  firstName: string;
  lastName: string;
  age: string;
  neighbourhood: string;
  languages: string[];
  skills: string[];
  interests: string[];
  availability: string;
  hoursPerMonth: string;
  priorExperience: string;
  hasVehicle: boolean | null;
}

const NEIGHBOURHOODS = [
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
const LANGUAGES = [
  "English",
  "Arabic",
  "Cantonese",
  "Farsi",
  "French",
  "Hindi",
  "Korean",
  "Mandarin",
  "Punjabi",
  "Somali",
  "Spanish",
  "Tagalog",
  "Tigrinya",
  "Vietnamese",
];
const SKILLS = [
  "Accounting/bookkeeping",
  "Administrative support",
  "Arts facilitation",
  "Childcare support",
  "Cooking/food prep",
  "Data entry",
  "Driving/transportation",
  "Elder care",
  "Event coordination",
  "First aid/CPR",
  "Fundraising",
  "Grant writing",
  "Graphic design",
  "IT support",
  "Legal knowledge",
  "Mental health support",
  "Outreach/community engagement",
  "Photography",
  "Public speaking",
  "Research",
  "Social media",
  "Teaching/training",
  "Translation/interpretation",
  "Tutoring/mentorship",
];
const CAUSE_AREAS = [
  "Animal welfare",
  "Anti-poverty",
  "Arts & culture",
  "Disability services",
  "Education & literacy",
  "Environment",
  "Food security",
  "Housing & homelessness",
  "Indigenous community support",
  "Legal aid",
  "Mental health",
  "Newcomer & immigrant support",
  "Senior services",
  "Women & gender equity",
  "Youth services",
];
const AVAILABILITY_OPTIONS = [
  "Flexible / as needed",
  "Weekdays only",
  "Weekday mornings",
  "Weekday afternoons",
  "Weekday evenings",
  "Weekends only",
  "Weekend mornings",
  "Weekend afternoons",
  "Evenings only",
];
const EXPERIENCE_OPTIONS = ["None", "Some (1–2 orgs)", "Experienced (3+ orgs)"];


const initialSurveyState: VolunteerSurveyState = {
  firstName: "",
  lastName: "",
  age: "",
  neighbourhood: "",
  languages: ["English"],
  skills: [],
  interests: [],
  availability: "",
  hoursPerMonth: "",
  priorExperience: "",
  hasVehicle: null,
};

function toggleMultiValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((i) => i !== value)
    : [...values, value];
}

// ── Shared style tokens ────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 15px",
  borderRadius: "10px",
  border: "1.5px solid var(--border-light)",
  background: "var(--bg-primary)",
  fontSize: "0.875rem",
  color: "var(--text-primary)",
  outline: "none",
  transition: "border-color 0.2s",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.68rem",
  fontWeight: 600,
  letterSpacing: "0.09em",
  textTransform: "uppercase" as const,
  color: "var(--text-muted)",
  marginBottom: "7px",
};

const sectionHeadStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "1.05rem",
  fontWeight: 500,
  letterSpacing: "-0.01em",
  color: "var(--text-primary)",
  marginBottom: "1rem",
  paddingBottom: "0.6rem",
  borderBottom: "1px solid var(--border-light)",
};

// ── Chip / tag button ──────────────────────────────────────────────
function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "5px 13px",
        borderRadius: "100px",
        border: "1.5px solid",
        borderColor: selected ? "var(--accent-green)" : "var(--border-light)",
        background: selected
          ? "var(--accent-green-light)"
          : "var(--bg-primary)",
        color: selected ? "var(--accent-green)" : "var(--text-secondary)",
        fontSize: "0.78rem",
        fontWeight: selected ? 600 : 400,
        cursor: "pointer",
        transition: "all 0.18s ease",
        whiteSpace: "nowrap" as const,
      }}
    >
      {label}
    </button>
  );
}

// ── Tile select ───────────────────────────────────────────────────
function Tile({
  label,
  selected,
  onClick,
  flex,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  flex?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: flex ? 1 : undefined,
        padding: "10px 14px",
        borderRadius: "10px",
        border: "1.5px solid",
        borderColor: selected ? "var(--accent-green)" : "var(--border-light)",
        background: selected
          ? "var(--accent-green-light)"
          : "var(--bg-primary)",
        color: selected ? "var(--accent-green)" : "var(--text-secondary)",
        fontSize: "0.82rem",
        fontWeight: selected ? 600 : 400,
        cursor: "pointer",
        textAlign: "left" as const,
        transition: "all 0.18s ease",
      }}
    >
      {label}
    </button>
  );
}

// ── Left panel — branding sidebar ─────────────────────────────────
function AuthSidebar({
  role,
  isLogin,
  step,
}: {
  role: UserRole;
  isLogin: boolean;
  step: VolunteerSignupStep;
}) {
  const headlines: Record<string, { tag: string; h: string; sub: string }> = {
    login: {
      tag: "Welcome back",
      h: "Good to see\nyou again.",
      sub: "Your community is still out there — and they still need you.",
    },
    volunteer_account: {
      tag: "Join as a volunteer",
      h: "Let's find your\nperfect match.",
      sub: "Tell us a bit about yourself and we'll connect you with an organization that fits your schedule and skills.",
    },
    volunteer_survey: {
      tag: "Almost there",
      h: "Help us\nknow you.",
      sub: "These questions let us surface opportunities that actually fit — not just what's nearby.",
    },
    coordinator: {
      tag: "Register your org",
      h: "Your people\nare waiting.",
      sub: "Create coordinator access to post shifts, track volunteers, and fill gaps when it matters most.",
    },
  };

  const key = isLogin
    ? "login"
    : role === "coordinator"
      ? "coordinator"
      : step === "survey"
        ? "volunteer_survey"
        : "volunteer_account";

  const { tag, h, sub } = headlines[key];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "1.5rem 2.5rem 3rem",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-light)",
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none" }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2rem",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            lineHeight: 1,
          }}
        >
          match-
          <em style={{ color: "var(--accent-green)", fontStyle: "italic" }}>
            a
          </em>
        </div>
      </Link>

      {/* Main copy */}
      <div>
        <div
          style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--accent-green)",
            marginBottom: "1rem",
          }}
        >
          {tag}
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 3.5vw, 2.8rem)",
            fontWeight: 500,
            lineHeight: 1.08,
            letterSpacing: "-0.04em",
            color: "var(--text-primary)",
            whiteSpace: "pre-line",
            marginBottom: "1.25rem",
          }}
        >
          {h}
        </h2>
        <p
          style={{
            fontSize: "0.9rem",
            lineHeight: 1.75,
            color: "var(--text-secondary)",
            maxWidth: "260px",
          }}
        >
          {sub}
        </p>
      </div>

      {/* Step indicator (volunteer signup only) */}
      {!isLogin && role === "volunteer" && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          {[
            { s: "account", label: "Account details" },
            { s: "survey", label: "Volunteer questionnaire" },
          ].map(({ s, label }, i) => {
            const done = step === "survey" && s === "account";
            const active = step === s;
            return (
              <div
                key={s}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    background: done
                      ? "var(--accent-green)"
                      : active
                        ? "var(--accent-green-light)"
                        : "transparent",
                    border: `1.5px solid ${done || active ? "var(--accent-green)" : "var(--border-light)"}`,
                    color: done
                      ? "white"
                      : active
                        ? "var(--accent-green)"
                        : "var(--text-muted)",
                    flexShrink: 0,
                    transition: "all 0.3s",
                  }}
                >
                  {done ? "✓" : i + 1}
                </div>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: active ? 600 : 400,
                    color: active
                      ? "var(--text-primary)"
                      : done
                        ? "var(--text-secondary)"
                        : "var(--text-muted)",
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      <div
        style={{
          fontSize: "0.7rem",
          color: "var(--text-muted)",
          lineHeight: 1.6,
        }}
      >
        youCode 2026 — SAP Challenge
        <br />
        Strengthening BC&apos;s Nonprofit Workforce
      </div>
    </div>
  );
}

// ── Main content ──────────────────────────────────────────────────
function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roleParam = searchParams.get("role") || "volunteer";

  const [role, setRole] = useState<UserRole>(
    roleParam === "coordinator" ? "coordinator" : "volunteer",
  );
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [survey, setSurvey] =
    useState<VolunteerSurveyState>(initialSurveyState);
  const [volunteerSignupStep, setVolunteerSignupStep] =
    useState<VolunteerSignupStep>("account");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (roleParam === "coordinator" || roleParam === "volunteer")
      setRole(roleParam);
  }, [roleParam]);
  useEffect(() => {
    if (role === "coordinator") setSurvey(initialSurveyState);
  }, [role]);
  useEffect(() => {
    setVolunteerSignupStep("account");
    setError("");
  }, [role, isLogin]);

  const volunteerName =
    `${survey.firstName} ${survey.lastName}`.trim() || name.trim();

  const handleVolunteerToggle = (
    field: "languages" | "skills" | "interests",
    value: string,
  ) => {
    setSurvey((c) => ({ ...c, [field]: toggleMultiValue(c[field], value) }));
  };

  const validateVolunteerSurvey = () => {
    if (!survey.firstName.trim() || !survey.lastName.trim())
      return "Please enter your first and last name.";
    if (!survey.age || Number(survey.age) < 13)
      return "Please enter a valid age.";
    if (!survey.neighbourhood) return "Please choose your neighbourhood.";
    if (survey.languages.length === 0)
      return "Please select at least one language.";
    if (survey.skills.length === 0) return "Please select at least one skill.";
    if (survey.interests.length === 0)
      return "Please select at least one cause area.";
    if (!survey.availability) return "Please choose your availability.";
    if (!survey.hoursPerMonth || Number(survey.hoursPerMonth) <= 0)
      return "Please enter hours per month.";
    if (!survey.priorExperience) return "Please choose your prior experience.";
    if (survey.hasVehicle === null)
      return "Please tell us whether you have access to a vehicle.";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    const form = e.target as HTMLFormElement;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isLogin) {
        if (!email.trim() || !password.trim())
          throw new Error("Enter any email and password to continue.");
        router.push(role === "volunteer" ? "/volunteer" : "/coordinator");
        return;
      }
      const resolvedName = role === "volunteer" ? volunteerName : name.trim();
      if (role === "volunteer" && volunteerSignupStep === "account") {
        if (!survey.firstName.trim() || !survey.lastName.trim())
          throw new Error("Please enter your first and last name.");
        if (!email.trim() || !password.trim())
          throw new Error("Enter any email and password to continue.");
        setVolunteerSignupStep("survey");
        return;
      }
      if (!resolvedName)
        throw new Error("Please enter your name before creating an account.");
      if (role === "volunteer") {
        const err = validateVolunteerSurvey();
        if (err) throw new Error(err);
      } else if (!email.trim() || !password.trim()) {
        throw new Error("Enter any email and password to continue.");
      }
      router.push(role === "volunteer" ? "/volunteer" : "/coordinator");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const showSurvey =
    !isLogin && role === "volunteer" && volunteerSignupStep === "survey";

  return (
    <div
      style={{
        height: "100vh",
        display: "grid",
        gridTemplateColumns: "340px 1fr",
        background: "var(--bg-primary)",
        overflow: "hidden",
      }}
    >
      {/* ── Left sidebar ── */}
      <AuthSidebar role={role} isLogin={isLogin} step={volunteerSignupStep} />

      {/* ── Right: scrollable form panel ── */}
      <div
        style={{
          overflowY: "auto",
          height: "100vh",
          display: "flex",
          alignItems: showSurvey ? "flex-start" : "center",
          justifyContent: "center",
          padding: showSurvey ? "3rem 3.5rem" : "2rem 3.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2.5rem",
            maxWidth: "580px",
            width: "100%",
          }}
        >
          {/* Role toggle */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-light)",
              borderRadius: "12px",
              padding: "4px",
              width: "fit-content",
              gap: "2px",
            }}
          >
            {(["volunteer", "coordinator"] as UserRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "9px",
                  border: "none",
                  background: role === r ? "var(--bg-card)" : "transparent",
                  color:
                    role === r ? "var(--accent-green)" : "var(--text-muted)",
                  fontSize: "0.82rem",
                  fontWeight: role === r ? 600 : 400,
                  cursor: "pointer",
                  boxShadow: role === r ? "var(--shadow-sm)" : "none",
                  transition: "all 0.2s",
                }}
              >
                {r === "volunteer" ? "I'm a Volunteer" : "I run an org"}
              </button>
            ))}
          </div>

          {/* Page heading */}
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
                fontWeight: 500,
                lineHeight: 1.08,
                letterSpacing: "-0.035em",
                color: "var(--text-primary)",
                marginBottom: "0.5rem",
              }}
            >
              {isLogin
                ? "Welcome back."
                : showSurvey
                  ? "Tell us about yourself."
                  : role === "volunteer"
                    ? "Create your profile."
                    : "Register your organization."}
            </h1>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
              }}
            >
              {isLogin
                ? "Use any email and password for the demo."
                : showSurvey
                  ? "A few quick questions to personalize your matches."
                  : "Any email and password will take you straight to the demo."}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}
          >
            {/* ── Account fields ── */}
            {!showSurvey && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                <div style={sectionHeadStyle}>Account details</div>

                {!isLogin && role === "volunteer" && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <label style={labelStyle}>First name</label>
                      <input
                        style={inputStyle}
                        type="text"
                        placeholder="Grace"
                        value={survey.firstName}
                        onChange={(e) =>
                          setSurvey((c) => ({
                            ...c,
                            firstName: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Last name</label>
                      <input
                        style={inputStyle}
                        type="text"
                        placeholder="Johansson"
                        value={survey.lastName}
                        onChange={(e) =>
                          setSurvey((c) => ({ ...c, lastName: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                )}

                {!isLogin && role === "coordinator" && (
                  <div>
                    <label style={labelStyle}>Full name</label>
                    <input
                      style={inputStyle}
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      style={inputStyle}
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Password</label>
                    <input
                      style={inputStyle}
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Survey ── */}
            {showSurvey && (
              <>
                {/* About you */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.25rem",
                  }}
                >
                  <div style={sectionHeadStyle}>About you</div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <label style={labelStyle}>Age</label>
                      <input
                        style={inputStyle}
                        type="number"
                        min={13}
                        placeholder="19"
                        value={survey.age}
                        onChange={(e) =>
                          setSurvey((c) => ({ ...c, age: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Hours available / month</label>
                      <input
                        style={inputStyle}
                        type="number"
                        min={1}
                        placeholder="8"
                        value={survey.hoursPerMonth}
                        onChange={(e) =>
                          setSurvey((c) => ({
                            ...c,
                            hoursPerMonth: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Neighbourhood</label>
                    <select
                      style={{ ...inputStyle, appearance: "none" as const }}
                      value={survey.neighbourhood}
                      onChange={(e) =>
                        setSurvey((c) => ({
                          ...c,
                          neighbourhood: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select your neighbourhood</option>
                      {NEIGHBOURHOODS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Languages & availability */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.25rem",
                  }}
                >
                  <div style={sectionHeadStyle}>Languages & availability</div>
                  <div>
                    <label style={labelStyle}>Languages spoken</label>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "7px",
                        marginTop: "2px",
                      }}
                    >
                      {LANGUAGES.map((l) => (
                        <Chip
                          key={l}
                          label={l}
                          selected={survey.languages.includes(l)}
                          onClick={() => handleVolunteerToggle("languages", l)}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Availability</label>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "8px",
                      }}
                    >
                      {AVAILABILITY_OPTIONS.map((o) => (
                        <Tile
                          key={o}
                          label={o}
                          selected={survey.availability === o}
                          onClick={() =>
                            setSurvey((c) => ({ ...c, availability: o }))
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Skills & causes */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.25rem",
                  }}
                >
                  <div style={sectionHeadStyle}>What you can help with</div>
                  <div>
                    <label style={labelStyle}>Skills</label>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "7px",
                        marginTop: "2px",
                      }}
                    >
                      {SKILLS.map((s) => (
                        <Chip
                          key={s}
                          label={s}
                          selected={survey.skills.includes(s)}
                          onClick={() => handleVolunteerToggle("skills", s)}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Cause areas</label>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "7px",
                        marginTop: "2px",
                      }}
                    >
                      {CAUSE_AREAS.map((c) => (
                        <Chip
                          key={c}
                          label={c}
                          selected={survey.interests.includes(c)}
                          onClick={() => handleVolunteerToggle("interests", c)}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Experience & readiness */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.25rem",
                  }}
                >
                  <div style={sectionHeadStyle}>Experience & readiness</div>
                  <div>
                    <label style={labelStyle}>Prior volunteer experience</label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {EXPERIENCE_OPTIONS.map((o) => (
                        <Tile
                          key={o}
                          label={o}
                          flex
                          selected={survey.priorExperience === o}
                          onClick={() =>
                            setSurvey((c) => ({ ...c, priorExperience: o }))
                          }
                        />
                      ))}
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
                      <label style={labelStyle}>Vehicle access?</label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {[
                          { label: "Yes", value: true },
                          { label: "No", value: false },
                        ].map((o) => (
                          <Tile
                            key={o.label}
                            label={o.label}
                            flex
                            selected={survey.hasVehicle === o.value}
                            onClick={() =>
                              setSurvey((c) => ({ ...c, hasVehicle: o.value }))
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "7px",
                          marginTop: "2px",
                        }}
                      >
                      
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div
                style={{
                  padding: "11px 16px",
                  borderRadius: "10px",
                  background: "var(--accent-orange-light)",
                  color: "var(--accent-orange)",
                  fontSize: "0.825rem",
                  fontWeight: 500,
                  border: "1px solid rgba(200,80,40,0.15)",
                }}
              >
                {error}
              </div>
            )}

            {/* Actions */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                paddingBottom: "2rem",
              }}
            >
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  width: "100%",
                  padding: "13px",
                  fontSize: "0.9rem",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading
                  ? "Loading..."
                  : isLogin
                    ? `Sign in as ${role === "volunteer" ? "Volunteer" : "Coordinator"}`
                    : role === "volunteer" && volunteerSignupStep === "account"
                      ? "Continue to questionnaire →"
                      : `Enter as ${role === "volunteer" ? "Volunteer" : "Coordinator"} →`}
              </button>

              {showSurvey && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setVolunteerSignupStep("account");
                    setError("");
                  }}
                  style={{ width: "100%", padding: "13px", fontSize: "0.9rem" }}
                >
                  ← Back to account details
                </button>
              )}

              <div style={{ textAlign: "center", paddingTop: "0.25rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontWeight: 500,
                    color: "var(--accent-green)",
                  }}
                >
                  {isLogin
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
            }}
          >
            Loading…
          </p>
        </main>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
