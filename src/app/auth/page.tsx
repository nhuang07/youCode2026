"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type UserRole = "volunteer" | "coordinator";
type BackgroundCheckStatus = "Completed" | "In progress" | "Not yet";
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
  backgroundCheckStatus: BackgroundCheckStatus | "";
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

const EXPERIENCE_OPTIONS = [
  "None",
  "Some (1-2 orgs)",
  "Experienced (3+ orgs)",
];

const BACKGROUND_CHECK_OPTIONS: BackgroundCheckStatus[] = [
  "Completed",
  "In progress",
  "Not yet",
];

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
  backgroundCheckStatus: "",
};

function toggleMultiValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roleParam = searchParams.get("role") || "volunteer";

  const [role, setRole] = useState<UserRole>(
    roleParam === "coordinator" ? "coordinator" : "volunteer"
  );
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [survey, setSurvey] = useState<VolunteerSurveyState>(initialSurveyState);
  const [volunteerSignupStep, setVolunteerSignupStep] =
    useState<VolunteerSignupStep>("account");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (roleParam === "coordinator" || roleParam === "volunteer") {
      setRole(roleParam);
    }
  }, [roleParam]);

  useEffect(() => {
    if (role === "coordinator") {
      setSurvey(initialSurveyState);
    }
  }, [role]);

  useEffect(() => {
    setVolunteerSignupStep("account");
    setError("");
  }, [role, isLogin]);

  const volunteerName =
    `${survey.firstName} ${survey.lastName}`.trim() || name.trim();

  const handleVolunteerToggle = (
    field: "languages" | "skills" | "interests",
    value: string
  ) => {
    setSurvey((current) => ({
      ...current,
      [field]: toggleMultiValue(current[field], value),
    }));
  };

  const validateVolunteerSurvey = () => {
    if (!survey.firstName.trim() || !survey.lastName.trim()) {
      return "Please enter your first and last name.";
    }
    if (!survey.age || Number(survey.age) < 13) {
      return "Please enter a valid age.";
    }
    if (!survey.neighbourhood) {
      return "Please choose your neighbourhood.";
    }
    if (survey.languages.length === 0) {
      return "Please select at least one language.";
    }
    if (survey.skills.length === 0) {
      return "Please select at least one skill.";
    }
    if (survey.interests.length === 0) {
      return "Please select at least one cause area.";
    }
    if (!survey.availability) {
      return "Please choose your availability.";
    }
    if (!survey.hoursPerMonth || Number(survey.hoursPerMonth) <= 0) {
      return "Please enter how many hours you can contribute each month.";
    }
    if (!survey.priorExperience) {
      return "Please choose your prior volunteer experience.";
    }
    if (survey.hasVehicle === null) {
      return "Please tell us whether you have access to a vehicle.";
    }
    if (!survey.backgroundCheckStatus) {
      return "Please choose your background check status.";
    }

    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        if (!email.trim() || !password.trim()) {
          throw new Error("Enter any email and password to continue.");
        }

        router.push(role === "volunteer" ? "/volunteer" : "/coordinator");
        return;
      }

      const resolvedName = role === "volunteer" ? volunteerName : name.trim();

      if (role === "volunteer" && volunteerSignupStep === "account") {
        if (!survey.firstName.trim() || !survey.lastName.trim()) {
          throw new Error("Please enter your first and last name.");
        }
        if (!email.trim() || !password.trim()) {
          throw new Error("Enter any email and password to continue.");
        }

        setVolunteerSignupStep("survey");
        return;
      }

      if (!resolvedName) {
        throw new Error("Please enter your name before creating an account.");
      }

      if (role === "volunteer") {
        const surveyError = validateVolunteerSurvey();
        if (surveyError) {
          throw new Error(surveyError);
        }
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

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="text-3xl font-bold tracking-tight"
            style={{ color: "var(--accent-green)" }}
          >
            rooted
          </Link>
          <p className="mt-2" style={{ color: "var(--text-secondary)" }}>
            {isLogin
              ? "Welcome back"
              : role === "volunteer"
                ? volunteerSignupStep === "account"
                  ? "Start your volunteer signup"
                  : "Create your volunteer profile"
                : "Join as an organization coordinator"}
          </p>
        </div>

        <div
          className="flex rounded-xl p-1 mb-6 max-w-md mx-auto"
          style={{ background: "var(--bg-secondary)" }}
        >
          <button
            type="button"
            onClick={() => setRole("volunteer")}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background:
                role === "volunteer" ? "var(--bg-card)" : "transparent",
              color:
                role === "volunteer"
                  ? "var(--accent-green)"
                  : "var(--text-muted)",
              boxShadow: role === "volunteer" ? "var(--shadow-sm)" : "none",
            }}
          >
            I&apos;m a Volunteer
          </button>
          <button
            type="button"
            onClick={() => setRole("coordinator")}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background:
                role === "coordinator" ? "var(--bg-card)" : "transparent",
              color:
                role === "coordinator"
                  ? "var(--accent-green)"
                  : "var(--text-muted)",
              boxShadow: role === "coordinator" ? "var(--shadow-sm)" : "none",
            }}
          >
            I&apos;m a Coordinator
          </button>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">
                  {isLogin
                    ? "Sign in"
                    : role === "volunteer" && volunteerSignupStep === "survey"
                      ? "Volunteer questionnaire"
                      : "Account details"}
                </h2>
                {!isLogin &&
                  role === "volunteer" &&
                  volunteerSignupStep === "survey" && (
                  <span className="tag tag-language">Dataset-shaped survey</span>
                )}
              </div>

              {!isLogin && role === "coordinator" && (
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                    style={{
                      border: "1.5px solid var(--border-light)",
                      background: "var(--bg-primary)",
                    }}
                    placeholder="Your name"
                  />
                </div>
              )}

              {!isLogin &&
                role === "volunteer" &&
                volunteerSignupStep === "account" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      First Name
                    </label>
                    <input
                      type="text"
                      value={survey.firstName}
                      onChange={(e) =>
                        setSurvey((current) => ({
                          ...current,
                          firstName: e.target.value,
                        }))
                      }
                      required
                      className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                      style={{
                        border: "1.5px solid var(--border-light)",
                        background: "var(--bg-primary)",
                      }}
                      placeholder="Grace"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={survey.lastName}
                      onChange={(e) =>
                        setSurvey((current) => ({
                          ...current,
                          lastName: e.target.value,
                        }))
                      }
                      required
                      className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                      style={{
                        border: "1.5px solid var(--border-light)",
                        background: "var(--bg-primary)",
                      }}
                      placeholder="Johansson"
                    />
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                    style={{
                      border: "1.5px solid var(--border-light)",
                      background: "var(--bg-primary)",
                    }}
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                    style={{
                      border: "1.5px solid var(--border-light)",
                      background: "var(--bg-primary)",
                    }}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {!isLogin &&
                role === "volunteer" &&
                volunteerSignupStep === "account" && (
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    For now, signup is local-only. Any email and password will
                    take you to the volunteer questionnaire.
                  </p>
                )}
            </section>

            {!isLogin &&
              role === "volunteer" &&
              volunteerSignupStep === "survey" && (
              <>
                <section className="space-y-4">
                  <h2 className="text-lg font-bold">About you</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label
                        className="block text-sm font-medium mb-1.5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Age
                      </label>
                      <input
                        type="number"
                        min={13}
                        value={survey.age}
                        onChange={(e) =>
                          setSurvey((current) => ({
                            ...current,
                            age: e.target.value,
                          }))
                        }
                        required
                        className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                        style={{
                          border: "1.5px solid var(--border-light)",
                          background: "var(--bg-primary)",
                        }}
                        placeholder="19"
                      />
                    </div>

                    <div>
                      <label
                        className="block text-sm font-medium mb-1.5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Hours available per month
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={survey.hoursPerMonth}
                        onChange={(e) =>
                          setSurvey((current) => ({
                            ...current,
                            hoursPerMonth: e.target.value,
                          }))
                        }
                        required
                        className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                        style={{
                          border: "1.5px solid var(--border-light)",
                          background: "var(--bg-primary)",
                        }}
                        placeholder="8"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Neighbourhood
                    </label>
                    <select
                      value={survey.neighbourhood}
                      onChange={(e) =>
                        setSurvey((current) => ({
                          ...current,
                          neighbourhood: e.target.value,
                        }))
                      }
                      required
                      className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                      style={{
                        border: "1.5px solid var(--border-light)",
                        background: "var(--bg-primary)",
                      }}
                    >
                      <option value="">Select your neighbourhood</option>
                      {NEIGHBOURHOODS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-lg font-bold">Languages & availability</h2>

                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Languages spoken
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES.map((option) => {
                        const selected = survey.languages.includes(option);

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              handleVolunteerToggle("languages", option)
                            }
                            className={`tag ${selected ? "tag-selected" : "tag-language"}`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Availability
                    </label>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {AVAILABILITY_OPTIONS.map((option) => {
                        const selected = survey.availability === option;

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              setSurvey((current) => ({
                                ...current,
                                availability: option,
                              }))
                            }
                            className="text-left p-4 rounded-xl border transition-all"
                            style={{
                              borderColor: selected
                                ? "var(--accent-green)"
                                : "var(--border-light)",
                              background: selected
                                ? "var(--accent-green-light)"
                                : "var(--bg-card)",
                              boxShadow: selected ? "var(--shadow-sm)" : "none",
                            }}
                          >
                            <span className="text-sm font-semibold">{option}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-lg font-bold">What you can help with</h2>

                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Skills
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SKILLS.map((option) => {
                        const selected = survey.skills.includes(option);

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleVolunteerToggle("skills", option)}
                            className={`tag ${selected ? "tag-selected" : "tag-skill"}`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Cause areas of interest
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CAUSE_AREAS.map((option) => {
                        const selected = survey.interests.includes(option);

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              handleVolunteerToggle("interests", option)
                            }
                            className={`tag ${selected ? "tag-selected" : ""}`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-lg font-bold">Experience & readiness</h2>

                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Prior volunteer experience
                    </label>
                    <div className="grid md:grid-cols-3 gap-3">
                      {EXPERIENCE_OPTIONS.map((option) => {
                        const selected = survey.priorExperience === option;

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              setSurvey((current) => ({
                                ...current,
                                priorExperience: option,
                              }))
                            }
                            className="text-left p-4 rounded-xl border transition-all"
                            style={{
                              borderColor: selected
                                ? "var(--accent-green)"
                                : "var(--border-light)",
                              background: selected
                                ? "var(--accent-green-light)"
                                : "var(--bg-card)",
                            }}
                          >
                            <span className="text-sm font-semibold">{option}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label
                        className="block text-sm font-medium mb-2"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Do you have access to a vehicle?
                      </label>
                      <div className="flex gap-3">
                        {[
                          { label: "Yes", value: true },
                          { label: "No", value: false },
                        ].map((option) => {
                          const selected = survey.hasVehicle === option.value;

                          return (
                            <button
                              key={option.label}
                              type="button"
                              onClick={() =>
                                setSurvey((current) => ({
                                  ...current,
                                  hasVehicle: option.value,
                                }))
                              }
                              className="flex-1 p-4 rounded-xl border text-sm font-semibold transition-all"
                              style={{
                                borderColor: selected
                                  ? "var(--accent-green)"
                                  : "var(--border-light)",
                                background: selected
                                  ? "var(--accent-green-light)"
                                  : "var(--bg-card)",
                              }}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label
                        className="block text-sm font-medium mb-2"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Background check status
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {BACKGROUND_CHECK_OPTIONS.map((option) => {
                          const selected = survey.backgroundCheckStatus === option;

                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() =>
                                setSurvey((current) => ({
                                  ...current,
                                  backgroundCheckStatus: option,
                                }))
                              }
                              className={`tag ${selected ? "tag-selected" : ""}`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {error && (
              <div
                className="text-sm px-4 py-2.5 rounded-lg"
                style={{
                  background: "var(--accent-orange-light)",
                  color: "var(--accent-orange)",
                }}
              >
                {error}
              </div>
            )}

            <div className="space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-3 text-base"
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading
                  ? "Loading..."
                  : isLogin
                    ? `Sign In as ${role === "volunteer" ? "Volunteer" : "Coordinator"}`
                    : role === "volunteer" && volunteerSignupStep === "account"
                      ? "Continue to Volunteer Questionnaire"
                      : `Enter as ${role === "volunteer" ? "Volunteer" : "Coordinator"}`}
              </button>

              {!isLogin &&
                role === "volunteer" &&
                volunteerSignupStep === "survey" && (
                  <button
                    type="button"
                    onClick={() => {
                      setVolunteerSignupStep("account");
                      setError("");
                    }}
                    className="btn btn-outline w-full py-3 text-base"
                  >
                    Back to Account Details
                  </button>
                )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError("");
                  }}
                  className="text-sm font-medium"
                  style={{ color: "var(--accent-green)" }}
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
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <p style={{ color: "var(--text-muted)" }}>Loading...</p>
        </main>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
