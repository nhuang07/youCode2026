import { EngagementLog } from "./types";

// ============================================
// SYNTHETIC ENGAGEMENT DATA GENERATOR
// Creates realistic volunteer activity patterns
// for demo purposes. In production, this would
// come from real shift tracking.
// ============================================

type Pattern = "active" | "cooling" | "at-risk" | "new" | "crisis-hero";

function randomDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
}

function generateLogsForPattern(
  volunteerId: string,
  orgId: string,
  pattern: Pattern
): EngagementLog[] {
  const logs: EngagementLog[] = [];
  const base = {
    org_id: orgId,
    volunteer_id: volunteerId,
    opportunity_id: null,
    urgent_request_id: null,
    created_at: new Date().toISOString(),
  };

  switch (pattern) {
    case "active":
      // Regular activity, recent shifts, consistent hours
      for (let i = 0; i < 12; i++) {
        logs.push({
          ...base,
          id: `synth-${volunteerId}-${i}`,
          type: i % 4 === 0 ? "crisis-response" : "shift",
          date: randomDate(i * 5 + Math.floor(Math.random() * 3)),
          hours: 3 + Math.floor(Math.random() * 3),
          impact_notes: [
            "Delivered meals to 45 families",
            "Helped sort 200kg of donated food",
            "Assisted 8 newcomer families with intake",
            "Led youth tutoring session, 12 students",
            "Organized community event, 60 attendees",
          ][i % 5],
        });
      }
      break;

    case "cooling":
      // Was active, recent activity dropped off
      for (let i = 0; i < 8; i++) {
        const daysAgo = i < 2 ? 10 + i * 5 : 20 + i * 8;
        logs.push({
          ...base,
          id: `synth-${volunteerId}-${i}`,
          type: "shift",
          date: randomDate(daysAgo),
          hours: i < 2 ? 2 : 4,
          impact_notes: "Completed assigned tasks",
        });
      }
      break;

    case "at-risk":
      // Haven't been active in 3+ weeks, declining before that
      for (let i = 0; i < 5; i++) {
        logs.push({
          ...base,
          id: `synth-${volunteerId}-${i}`,
          type: "shift",
          date: randomDate(21 + i * 12),
          hours: 2,
          impact_notes: "Assisted with event setup",
        });
      }
      break;

    case "new":
      // Just started, 1-2 shifts only
      logs.push({
        ...base,
        id: `synth-${volunteerId}-0`,
        type: "shift",
        date: randomDate(5),
        hours: 3,
        impact_notes: "First shift — completed onboarding and orientation",
      });
      break;

    case "crisis-hero":
      // Mostly responds to crisis requests, very engaged
      for (let i = 0; i < 10; i++) {
        logs.push({
          ...base,
          id: `synth-${volunteerId}-${i}`,
          type: i % 2 === 0 ? "crisis-response" : "shift",
          date: randomDate(i * 4 + Math.floor(Math.random() * 2)),
          hours: 3 + Math.floor(Math.random() * 4),
          impact_notes: [
            "Emergency meal delivery — covered 3 routes",
            "Filled in as Mandarin interpreter for intake day",
            "Drove supplies to shelter on short notice",
            "Covered evening shift at food bank",
            "Translated urgent community notice into Cantonese",
          ][i % 5],
        });
      }
      break;
  }

  return logs;
}

// ============================================
// GENERATE DEMO DATA
// Assigns patterns to volunteer IDs to create
// a realistic mix of engagement states.
// ============================================

export function generateDemoEngagement(
  volunteerIds: string[],
  orgIds: string[]
): EngagementLog[] {
  const patterns: Pattern[] = [
    "active",
    "active",
    "active",
    "cooling",
    "cooling",
    "at-risk",
    "at-risk",
    "new",
    "new",
    "crisis-hero",
  ];

  const allLogs: EngagementLog[] = [];

  volunteerIds.forEach((volId, index) => {
    const pattern = patterns[index % patterns.length];
    const orgId = orgIds[index % orgIds.length];
    const logs = generateLogsForPattern(volId, orgId, pattern);
    allLogs.push(...logs);
  });

  return allLogs;
}

// ============================================
// DEMO VOLUNTEER ENGAGEMENT SUMMARIES
// Pre-built summaries for coordinator dashboard
// without needing real DB data.
// ============================================

export interface DemoVolunteerSummary {
  name: string;
  status: "active" | "cooling" | "at-risk";
  last_active_days_ago: number;
  total_hours: number;
  total_shifts: number;
  crisis_responses: number;
  streak: number;
  trend: string;
  suggested_action: string;
}

export const DEMO_VOLUNTEER_SUMMARIES: DemoVolunteerSummary[] = [
  {
    name: "Grace Johansson",
    status: "active",
    last_active_days_ago: 2,
    total_hours: 36,
    total_shifts: 12,
    crisis_responses: 3,
    streak: 8,
    trend: "Consistent weekly engagement",
    suggested_action: "No action needed",
  },
  {
    name: "Ryan Wang",
    status: "active",
    last_active_days_ago: 4,
    total_hours: 28,
    total_shifts: 9,
    crisis_responses: 1,
    streak: 5,
    trend: "Hours increasing month over month",
    suggested_action: "No action needed",
  },
  {
    name: "Sarah Torres",
    status: "at-risk",
    last_active_days_ago: 18,
    total_hours: 16,
    total_shifts: 6,
    crisis_responses: 0,
    streak: 0,
    trend: "Hours declining, missed last 2 shifts",
    suggested_action:
      "Send personal check-in. Consider offering a new opportunity matching her interest in Arts & culture.",
  },
  {
    name: "James Haddad",
    status: "cooling",
    last_active_days_ago: 10,
    total_hours: 12,
    total_shifts: 4,
    crisis_responses: 0,
    streak: 0,
    trend: "Activity dropped 60% from prior month",
    suggested_action:
      "Share impact summary — he helped serve 120+ meals. Suggest a micro-task to re-engage.",
  },
  {
    name: "Amara Khalid",
    status: "active",
    last_active_days_ago: 1,
    total_hours: 42,
    total_shifts: 14,
    crisis_responses: 5,
    streak: 10,
    trend: "Top crisis responder, very reliable",
    suggested_action: "No action needed — consider recognizing her contributions",
  },
  {
    name: "Kofi Williams",
    status: "cooling",
    last_active_days_ago: 12,
    total_hours: 8,
    total_shifts: 3,
    crisis_responses: 0,
    streak: 0,
    trend: "Reduced availability noted, may be scheduling conflict",
    suggested_action:
      "Check in about schedule changes. Suggest remote micro-tasks as alternative.",
  },
  {
    name: "Elena Martinez",
    status: "active",
    last_active_days_ago: 3,
    total_hours: 20,
    total_shifts: 7,
    crisis_responses: 2,
    streak: 4,
    trend: "Steady engagement, good crisis response rate",
    suggested_action: "No action needed",
  },
  {
    name: "Ben Dubois",
    status: "at-risk",
    last_active_days_ago: 24,
    total_hours: 40,
    total_shifts: 10,
    crisis_responses: 2,
    streak: 0,
    trend: "Was highly active, sudden stop 3 weeks ago",
    suggested_action:
      "Urgent check-in — long-tenured volunteer going silent. Prompt handoff documentation for his roles.",
  },
];
