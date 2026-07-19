"use client";

export interface LatestConsultation {
  id: string;
  athlete_id: string;
  initials: string;
  date_of_consult: string;
  date_of_next_follow_up: string;
  time_of_next_follow_up: string;
  nutritionist_name: string;
  consultation_objective_id: string | null;
  consultation_objective: string | null;
  type_of_consult: string;
  type_of_consult_id: string;
  venue: string;
  time_of_consult: string;
  title_description: string;
  is_scheduled_booking?: boolean;
  status?: "scheduled" | "expired" | "completed" | "cancelled";
  ssp?: boolean;
}

export interface ConsultType {
  id: string;
  type_of_consult: string;
}

export type UpdateForm = {
  type_of_consult_id: string;
  title_description: string;
  venue: string;
  date_of_consult: string;
  time_of_consult: string;
  date_of_next_follow_up: string;
  time_of_next_follow_up: string;
  consultation_objective_id: string;
  ssp: boolean;
};

export const EMPTY_UPDATE_FORM: UpdateForm = {
  type_of_consult_id: "",
  title_description: "",
  venue: "",
  date_of_consult: "",
  time_of_consult: "",
  date_of_next_follow_up: "",
  time_of_next_follow_up: "",
  consultation_objective_id: "",
  ssp: false,
};

// export type UpdateForm = typeof EMPTY_UPDATE_FORM;

export function normalizeUpdateForm(form: UpdateForm): UpdateForm {
  return {
    type_of_consult_id: form.type_of_consult_id || "",
    title_description: form.title_description || "",
    venue: form.venue || "",
    date_of_consult: form.date_of_consult || "",
    time_of_consult: form.time_of_consult || "",
    date_of_next_follow_up: form.date_of_next_follow_up || "",
    time_of_next_follow_up: form.time_of_next_follow_up || "",
    consultation_objective_id: form.consultation_objective_id || "",
    ssp: form.ssp,
  };
}

export function hasUpdateFormData(form: UpdateForm): boolean {
  return Object.values(normalizeUpdateForm(form)).some((value) => value !== "");
}

export const STEPS = [
  { id: 1, label: "Consultation Details" },
  { id: 2, label: "Anthropometry" },
  { id: 3, label: "Medical History" },
  { id: 4, label: "Training Schedule" },
  { id: 5, label: "Meal Logs" },
  { id: 6, label: "Nutrition Requirements" },
  { id: 7, label: "Nutrition Diagnosis Summary" },
  { id: 8, label: "Actionables" },
  { id: 9, label: "Supplement Dispensing" },
] as const;

export const TOTAL_STEPS = STEPS.length;

export type StepStatus = "default" | "viewing" | "dirty" | "saved";
