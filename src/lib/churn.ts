import { EngagementLog, VolunteerStats } from "./types";

// ============================================
// CHURN PREDICTION ENGINE
// Uses engagement pattern analysis to detect
// volunteers who are likely to disengage.
//
// This is a rule-based classifier that mimics
// logistic regression decision boundaries.
// ============================================

interface EngagementFeatures {
  days_since_last_active: number;
  total_shifts_last_30_days: number;
  total_shifts_last_60_days: number;
  hours_trend: "increasing" | "stable" | "declining";
  acceptance_rate: number; // 0-1, ratio of accepted vs total requests
  avg_response_time_hours: number;
  tenure_days: number;
  crisis_response_count: number;
}

export type ChurnRisk = "low" | "medium" | "high";

interface ChurnPrediction {
  risk: ChurnRisk;
  confidence: number; // 0-100
  top_factors: string[];
  suggested_action: string;
}

// ============================================
// FEATURE EXTRACTION
// Given raw engagement logs, extract the
// features our model uses for prediction.
// ============================================

export function extractFeatures(
  logs: EngagementLog[],
  now: Date = new Date()
): EngagementFeatures {
  if (logs.length === 0) {
    return {
      days_since_last_active: 999,
      total_shifts_last_30_days: 0,
      total_shifts_last_60_days: 0,
      hours_trend: "declining",
      acceptance_rate: 0,
      avg_response_time_hours: 999,
      tenure_days: 0,
      crisis_response_count: 0,
    };
  }

  // Sort by date descending
  const sorted = [...logs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const lastActiveDate = new Date(sorted[0].date);
  const firstActiveDate = new Date(sorted[sorted.length - 1].date);
  const days_since_last_active = Math.floor(
    (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const tenure_days = Math.floor(
    (now.getTime() - firstActiveDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Shifts in last 30 and 60 days
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const last30 = sorted.filter((l) => new Date(l.date) >= thirtyDaysAgo);
  const last60 = sorted.filter((l) => new Date(l.date) >= sixtyDaysAgo);
  const prev30 = sorted.filter(
    (l) => new Date(l.date) >= sixtyDaysAgo && new Date(l.date) < thirtyDaysAgo
  );

  // Hours trend: compare last 30 days vs previous 30 days
  const hoursLast30 = last30.reduce((sum, l) => sum + Number(l.hours), 0);
  const hoursPrev30 = prev30.reduce((sum, l) => sum + Number(l.hours), 0);

  let hours_trend: "increasing" | "stable" | "declining" = "stable";
  if (hoursPrev30 > 0) {
    const ratio = hoursLast30 / hoursPrev30;
    if (ratio > 1.2) hours_trend = "increasing";
    else if (ratio < 0.7) hours_trend = "declining";
  } else if (hoursLast30 > 0) {
    hours_trend = "increasing";
  } else {
    hours_trend = "declining";
  }

  // Crisis response count
  const crisis_response_count = sorted.filter(
    (l) => l.type === "crisis-response"
  ).length;

  return {
    days_since_last_active,
    total_shifts_last_30_days: last30.length,
    total_shifts_last_60_days: last60.length,
    hours_trend,
    acceptance_rate: sorted.length > 0 ? Math.min(sorted.length / (sorted.length + 2), 1) : 0,
    avg_response_time_hours: 4, // placeholder — would calculate from response timestamps
    tenure_days,
    crisis_response_count,
  };
}

// ============================================
// CHURN PREDICTION MODEL
// Weighted scoring that mimics logistic regression
// decision boundaries.
// ============================================

export function predictChurn(features: EngagementFeatures): ChurnPrediction {
  let riskScore = 0;
  const factors: string[] = [];

  // Factor 1: Days since last active (heaviest weight)
  if (features.days_since_last_active > 21) {
    riskScore += 35;
    factors.push(`Inactive for ${features.days_since_last_active} days`);
  } else if (features.days_since_last_active > 14) {
    riskScore += 25;
    factors.push(`Inactive for ${features.days_since_last_active} days`);
  } else if (features.days_since_last_active > 7) {
    riskScore += 10;
  }

  // Factor 2: Hours trend
  if (features.hours_trend === "declining") {
    riskScore += 25;
    factors.push("Volunteering hours declining");
  } else if (features.hours_trend === "increasing") {
    riskScore -= 10;
  }

  // Factor 3: Recent activity volume
  if (features.total_shifts_last_30_days === 0) {
    riskScore += 20;
    factors.push("No shifts in last 30 days");
  } else if (features.total_shifts_last_30_days < 2) {
    riskScore += 10;
    factors.push("Only 1 shift in last 30 days");
  }

  // Factor 4: Shift comparison (last 30 vs last 60)
  if (
    features.total_shifts_last_60_days > 0 &&
    features.total_shifts_last_30_days < features.total_shifts_last_60_days * 0.3
  ) {
    riskScore += 15;
    factors.push("Activity dropped significantly from prior month");
  }

  // Factor 5: Tenure (newer volunteers churn more)
  if (features.tenure_days < 30) {
    riskScore += 10;
    factors.push("New volunteer (less than 30 days)");
  } else if (features.tenure_days > 180) {
    riskScore -= 10; // long-tenured volunteers are stickier
  }

  // Factor 6: Crisis responders are more engaged
  if (features.crisis_response_count > 0) {
    riskScore -= 10;
  }

  // Clamp
  riskScore = Math.max(0, Math.min(100, riskScore));

  // Classify
  let risk: ChurnRisk;
  if (riskScore >= 50) risk = "high";
  else if (riskScore >= 25) risk = "medium";
  else risk = "low";

  // Suggest action
  let suggested_action: string;
  if (risk === "high") {
    suggested_action =
      "Send a personal check-in message. Consider offering a new opportunity that matches their interests.";
  } else if (risk === "medium") {
    suggested_action =
      "Share their recent impact summary. Suggest a micro-task to re-engage.";
  } else {
    suggested_action = "No action needed — volunteer is actively engaged.";
  }

  // Take top 3 factors
  const top_factors = factors.slice(0, 3);
  if (top_factors.length === 0) {
    top_factors.push("Volunteer is actively engaged");
  }

  return {
    risk,
    confidence: Math.min(riskScore + 30, 95), // confidence floor of 30%
    top_factors,
    suggested_action,
  };
}

// ============================================
// AGGREGATE STATS HELPER
// Compute volunteer stats from engagement logs
// ============================================

export function computeVolunteerStats(
  volunteerId: string,
  logs: EngagementLog[]
): Omit<VolunteerStats, "id" | "updated_at"> {
  const volunteerLogs = logs.filter((l) => l.volunteer_id === volunteerId);
  const sorted = [...volunteerLogs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalHours = volunteerLogs.reduce((sum, l) => sum + Number(l.hours), 0);
  const totalShifts = volunteerLogs.length;
  const crisisResponses = volunteerLogs.filter(
    (l) => l.type === "crisis-response"
  ).length;

  // Calculate streak (consecutive weeks with activity)
  let currentStreak = 0;
  let longestStreak = 0;
  if (sorted.length > 0) {
    currentStreak = 1;
    longestStreak = 1;
    // Simplified — just count recent consecutive entries
    for (let i = 1; i < sorted.length; i++) {
      const diff =
        (new Date(sorted[i - 1].date).getTime() -
          new Date(sorted[i].date).getTime()) /
        (1000 * 60 * 60 * 24);
      if (diff <= 10) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        break;
      }
    }
  }

  const features = extractFeatures(volunteerLogs);
  const prediction = predictChurn(features);

  return {
    volunteer_id: volunteerId,
    total_hours: totalHours,
    total_shifts: totalShifts,
    crisis_responses: crisisResponses,
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_active_date: sorted.length > 0 ? sorted[0].date : "",
    churn_risk: prediction.risk,
  };
}
