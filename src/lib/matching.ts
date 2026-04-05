import { Volunteer, Org, UrgentRequest } from "./types";

// ============================================
// WEIGHTS - tune these to adjust matching priority
// ============================================
const WEIGHTS = {
  skills: 40,
  language: 10,
  availability: 15,
  cause_alignment: 25,
  background_check: 10,
};

// ============================================
// AVAILABILITY COMPATIBILITY MAP
// ============================================
const AVAILABILITY_COMPAT: Record<string, string[]> = {
  "Flexible / as needed": [
    "Flexible",
    "Weekdays preferred",
    "Weekday mornings",
    "Weekday afternoons",
    "Weekday evenings",
    "Weekends",
    "Weekend mornings",
    "Weekend afternoons",
  ],
  "Weekdays only": [
    "Weekdays preferred",
    "Weekday mornings",
    "Weekday afternoons",
    "Weekday evenings",
    "Flexible",
  ],
  "Weekday mornings": ["Weekday mornings", "Weekdays preferred", "Flexible"],
  "Weekday afternoons": [
    "Weekday afternoons",
    "Weekdays preferred",
    "Flexible",
  ],
  "Weekday evenings": ["Weekday evenings", "Weekdays preferred", "Flexible"],
  "Weekends only": [
    "Weekends",
    "Weekend mornings",
    "Weekend afternoons",
    "Flexible",
  ],
  "Weekend mornings": ["Weekend mornings", "Weekends", "Flexible"],
  "Weekend afternoons": ["Weekend afternoons", "Weekends", "Flexible"],
  "Evenings only": ["Weekday evenings", "Flexible"],
};

// ============================================
// CORE MATCHING FUNCTION
// ============================================

export function computeMatchScore(
  volunteer: Volunteer,
  org: Org,
): {
  score: number;
  breakdown: {
    skills: number;
    language: number;
    availability: number;
    cause_alignment: number;
    background_check: number;
  };
} {
  // 1. Skills overlap
  const orgSkills = org.skills_needed || [];
  const volSkills = volunteer.skills || [];
  const skillOverlap = orgSkills.filter((s) =>
    volSkills.some((vs) => vs.toLowerCase() === s.toLowerCase()),
  ).length;
  const skillScore =
    orgSkills.length > 0
      ? (skillOverlap / orgSkills.length) * WEIGHTS.skills
      : WEIGHTS.skills * 0.5; // partial credit if org has no specific requirements

  // 2. Language match
  const orgLangs = org.languages_needed || [];
  const volLangs = volunteer.languages || [];
  const langMatch = orgLangs.some((l) =>
    volLangs.some((vl) => vl.toLowerCase() === l.toLowerCase()),
  );
  const languageScore = langMatch ? WEIGHTS.language : 0;

  // 3. Availability alignment
  const volAvail = volunteer.availability || "";
  const orgAvail = org.availability_preference || "";
  const compatibleSlots = AVAILABILITY_COMPAT[volAvail] || [];
  const availMatch =
    volAvail === orgAvail ||
    compatibleSlots.some(
      (slot) => slot.toLowerCase() === orgAvail.toLowerCase(),
    );
  const availabilityScore = availMatch ? WEIGHTS.availability : 0;

  // 4. Cause alignment (volunteer interests vs org sector)
  const volInterests = volunteer.interests || [];
  const causeMatch = volInterests.some(
    (interest) =>
      interest.toLowerCase().includes(org.sector.toLowerCase()) ||
      org.sector.toLowerCase().includes(interest.toLowerCase()),
  );
  const causeScore = causeMatch ? WEIGHTS.cause_alignment : 0;

  // 5. Background check
  let bgScore = WEIGHTS.background_check;
  if (org.background_check_required && !volunteer.has_background_check) {
    bgScore = 0; // hard penalty — can't serve if required and not cleared
  }

  const totalScore = Math.round(
    skillScore + languageScore + availabilityScore + causeScore + bgScore,
  );

  return {
    score: Math.min(totalScore, 100),
    breakdown: {
      skills: Math.round(skillScore),
      language: Math.round(languageScore),
      availability: Math.round(availabilityScore),
      cause_alignment: Math.round(causeScore),
      background_check: Math.round(bgScore),
    },
  };
}

// ============================================
// MATCH VOLUNTEERS TO AN URGENT REQUEST
// ============================================

export function matchVolunteersToUrgent(
  volunteers: Volunteer[],
  request: UrgentRequest,
  org: Org,
): { volunteer: Volunteer; score: number }[] {
  const scored = volunteers
    .map((vol) => {
      const { score } = computeMatchScore(vol, {
        ...org,
        skills_needed: request.skills_required,
        languages_needed: request.languages_required,
        background_check_required: request.background_check_required,
      });
      return { volunteer: vol, score };
    })
    .filter(({ score }) => score >= 30) // minimum threshold to be considered
    .sort((a, b) => b.score - a.score);

  return scored;
}

// ============================================
// RANK OPPORTUNITIES FOR A VOLUNTEER
// ============================================

export function rankOpportunitiesForVolunteer(
  volunteer: Volunteer,
  orgs: Org[],
): {
  org: Org;
  score: number;
  breakdown: ReturnType<typeof computeMatchScore>["breakdown"];
}[] {
  return orgs
    .map((org) => {
      const { score, breakdown } = computeMatchScore(volunteer, org);
      return { org, score, breakdown };
    })
    .sort((a, b) => b.score - a.score);
}
