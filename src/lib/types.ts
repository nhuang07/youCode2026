// ============================================
// DATABASE TYPES
// ============================================

export interface Org {
  id: string;
  bn: string;
  legal_name: string;
  account_name: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  sector: string;
  org_size: string;
  volunteers_currently_needed: number;
  volunteer_urgency: "Low" | "Medium" | "High" | "Critical";
  skills_needed: string[];
  languages_needed: string[];
  availability_preference: string;
  background_check_required: boolean;
  created_at: string;
}

export interface Volunteer {
  id: string;
  user_id: string | null;
  name: string;
  age: number;
  neighbourhood: string;
  languages: string[];
  skills: string[];
  interests: string[];
  availability: string;
  hours_per_month: number;
  has_vehicle: boolean;
  has_background_check: boolean;
  prior_experience: string;
  created_at: string;
}

export interface Coordinator {
  id: string;
  user_id: string;
  org_id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Opportunity {
  id: string;
  org_id: string;
  title: string;
  description: string;
  skills_needed: string[];
  languages_needed: string[];
  type: "ongoing" | "one-time" | "micro-task";
  time_commitment: string;
  availability_preference: string;
  background_check_required: boolean;
  is_remote: boolean;
  spots_available: number;
  spots_filled: number;
  status: "open" | "filled" | "closed";
  created_at: string;
  // joined fields
  org?: Org;
}

export interface UrgentRequest {
  id: string;
  org_id: string;
  coordinator_id: string;
  title: string;
  description: string;
  skills_required: string[];
  languages_required: string[];
  people_needed: number;
  people_confirmed: number;
  deadline: string;
  duration_hours: number;
  background_check_required: boolean;
  is_remote: boolean;
  status: "active" | "fulfilled" | "expired" | "cancelled";
  created_at: string;
  // joined fields
  org?: Org;
}

export interface UrgentResponse {
  id: string;
  urgent_request_id: string;
  volunteer_id: string;
  status: "pending" | "accepted" | "declined" | "completed" | "no-show";
  responded_at: string;
}

export interface EngagementLog {
  id: string;
  volunteer_id: string;
  org_id: string;
  opportunity_id: string | null;
  urgent_request_id: string | null;
  type: "shift" | "micro-task" | "crisis-response";
  date: string;
  hours: number;
  impact_notes: string;
  created_at: string;
}

export interface VolunteerStats {
  id: string;
  volunteer_id: string;
  total_hours: number;
  total_shifts: number;
  crisis_responses: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string;
  churn_risk: "low" | "medium" | "high";
  updated_at: string;
}

export interface Handoff {
  id: string;
  opportunity_id: string;
  volunteer_id: string;
  key_contacts: string;
  recurring_tasks: string;
  tips_and_notes: string;
  access_info: string;
  custom_fields: Record<string, unknown>;
  created_at: string;
}

export interface Match {
  id: string;
  volunteer_id: string;
  opportunity_id: string;
  compatibility_score: number;
  skills_overlap: number;
  language_match: boolean;
  availability_match: boolean;
  background_check_met: boolean;
  created_at: string;
  // joined fields
  opportunity?: Opportunity;
  volunteer?: Volunteer;
}

// ============================================
// APP-LEVEL TYPES
// ============================================

export type UserRole = "volunteer" | "coordinator";

export interface MatchScore {
  opportunity_id: string;
  score: number;
  breakdown: {
    skills: number;
    language: number;
    availability: number;
    background_check: number;
    cause_alignment: number;
  };
}
