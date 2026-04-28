import React, { useState, useEffect } from "react";
import { consultationApi } from "@/utils/consultationApi";
import { getApiErrorMessage } from "@/utils/apiError";
import ConsultationCardLastUpdated from "./ConsultationCardLastUpdated";
import { getBackendUrl } from "@/utils/backendUrl";

const BACKEND_URL = getBackendUrl();

const PAL_UPDATED_EVENT = "consultation-pal-updated";

// ============================================================
// TYPES
// ============================================================

type DayKey =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

const DAY_KEYS: { key: DayKey; label: string }[] = [
  { key: "Monday", label: "Monday" },
  { key: "Tuesday", label: "Tuesday" },
  { key: "Wednesday", label: "Wednesday" },
  { key: "Thursday", label: "Thursday" },
  { key: "Friday", label: "Friday" },
  { key: "Saturday", label: "Saturday" },
  { key: "Sunday", label: "Sunday" },
];

interface ScheduleEntryApi {
  dayOfWeek: DayKey;
  timeStart: string | null;
  timeEnd: string | null;
  activity: string;
  rpe: number | null;
}

interface TrainingInfoApi {
  upcomingMajorCompetitions: string | null;
  upcomingLocalCompetitions: string | null;
  currentPerformance: string | null;
  coachPerformanceGoals: string | null;
  athletePerformanceGoals: string | null;
  otherRemarks: string | null;
  pal: number | null;
  rpeWeek: number | null;
}

interface TrainingScheduleData {
  trainingInfo: TrainingInfoApi;
  lastUpdatedAt?: string | null;
  lastUpdatedBy?: string | null;
  schedule: ScheduleEntryApi[];
}

interface ScheduleEntryForm {
  dayOfWeek: DayKey;
  timeStart: string;
  timeEnd: string;
  activity: string;
  rpe: string;
}

interface EditForm {
  trainingInfo: {
    upcomingMajorCompetitions: string;
    upcomingLocalCompetitions: string;
    currentPerformance: string;
    coachPerformanceGoals: string;
    athletePerformanceGoals: string;
    otherRemarks: string;
    pal: string;
    rpeWeek: string;
  };
  schedule: ScheduleEntryForm[];
}

interface TrainingScheduleProps {
  athleteId: string;
  sessionId: string;
  isNewConsultation?: boolean;
  ensureSession?: () => Promise<string>;
  readOnly?: boolean;
  prevSessionId?: string;
  onStepStatusChange?: (status: "default" | "dirty" | "saved") => void;
}

// ============================================================
// HELPERS
// ============================================================

/** Calculate duration in hours between two HH:MM strings. Returns 0 if either is missing. */
function calcHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

/** Sum of training hours for a day's entries. */
function dailyHours(entries: ScheduleEntryForm[]): number {
  return entries.reduce((sum, e) => sum + calcHours(e.timeStart, e.timeEnd), 0);
}

function dailyHoursFromApi(entries: ScheduleEntryApi[]): number {
  return entries.reduce(
    (sum, e) => sum + calcHours(e.timeStart ?? "", e.timeEnd ?? ""),
    0
  );
}

function formatHours(h: number): string {
  if (h === 0) return "—";
  return `${h % 1 === 0 ? h : h.toFixed(2)}h`;
}

function formatTimeslot(start: string | null, end: string | null): string {
  if (!start && !end) return "—";
  if (start && end) return `${start} – ${end}`;
  return start ?? end ?? "—";
}

const makeEmptyForm = (): EditForm => ({
  trainingInfo: {
    upcomingMajorCompetitions: "",
    upcomingLocalCompetitions: "",
    currentPerformance: "",
    coachPerformanceGoals: "",
    athletePerformanceGoals: "",
    otherRemarks: "",
    pal: "",
    rpeWeek: "",
  },
  schedule: [],
});

function parseFromApi(data: TrainingScheduleData): EditForm {
  const info = data.trainingInfo;
  return {
    trainingInfo: {
      upcomingMajorCompetitions: info.upcomingMajorCompetitions ?? "",
      upcomingLocalCompetitions: info.upcomingLocalCompetitions ?? "",
      currentPerformance: info.currentPerformance ?? "",
      coachPerformanceGoals: info.coachPerformanceGoals ?? "",
      athletePerformanceGoals: info.athletePerformanceGoals ?? "",
      otherRemarks: info.otherRemarks ?? "",
      pal: info.pal !== null && info.pal !== undefined ? String(info.pal) : "",
      rpeWeek: info.rpeWeek !== null && info.rpeWeek !== undefined ? String(info.rpeWeek) : "",
    },
    schedule: data.schedule.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      // Strip seconds if DB returns HH:MM:SS format — Zod/TimePicker expect HH:MM
      timeStart: s.timeStart ? s.timeStart.substring(0, 5) : "",
      timeEnd: s.timeEnd ? s.timeEnd.substring(0, 5) : "",
      activity: s.activity,
      rpe: s.rpe !== null && s.rpe !== undefined ? String(s.rpe) : "",
    })),
  };
}

function applyPalToTrainingData(
  data: TrainingScheduleData,
  pal: number | null,
): TrainingScheduleData {
  return {
    ...data,
    trainingInfo: {
      ...data.trainingInfo,
      pal,
    },
  };
}

// ============================================================
// TIME PICKER (separate HH / MM selects, 5-min intervals)
// Matches the pattern used in ConsultationView.tsx
// ============================================================

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
);
const MINUTE_OPTIONS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [curH = "", curM = ""] = value ? value.split(":") : [];

  const setH = (h: string) => {
    if (!h) { onChange(""); return; }
    onChange(`${h}:${curM || "00"}`);
  };
  const setM = (m: string) => {
    if (!m) { onChange(""); return; }
    onChange(`${curH || "00"}:${m}`);
  };

  return (
    <div className="flex items-center gap-1">
      <select
        value={curH}
        onChange={(e) => setH(e.target.value)}
        className="w-14 px-1 py-1 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-blue-400"
      >
        <option value="">HH</option>
        {HOUR_OPTIONS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="text-gray-500 font-medium text-xs">:</span>
      <select
        value={curM}
        onChange={(e) => setM(e.target.value)}
        className="w-14 px-1 py-1 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-blue-400"
      >
        <option value="">MM</option>
        {MINUTE_OPTIONS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}

// ============================================================
// TABLE COMPONENTS
// ============================================================

/** Read-only table for a given schedule data set */
function ScheduleTable({ data }: { data: TrainingScheduleData }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 w-28">
              Day
            </th>
            <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-700 w-32">
              Timeslot
            </th>
            <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">
              Activity
            </th>
            <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-700 w-32">
              RPE (1–10)
            </th>
            <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-700 w-32">
              Training Hours
            </th>
          </tr>
        </thead>
        <tbody>
          {DAY_KEYS.map(({ key, label }) => {
            const entries = data.schedule.filter((e) => e.dayOfWeek === key);
            const hours = dailyHoursFromApi(entries);

            if (entries.length === 0) {
              return (
                <tr key={key} className="align-middle">
                  <td className="border border-gray-300 px-3 py-3 font-medium text-gray-900 text-center bg-gray-50">
                    {label}
                  </td>
                  <td className="border border-gray-300 px-3 py-3 text-center text-gray-400">
                    —
                  </td>
                  <td className="border border-gray-300 px-3 py-3 text-gray-400 italic">
                    Rest / No activities
                  </td>
                  <td className="border border-gray-300 px-3 py-3 text-center text-gray-400">
                    —
                  </td>
                  <td className="border border-gray-300 px-3 py-3 text-center text-gray-400">
                    —
                  </td>
                </tr>
              );
            }

            return entries.map((entry, i) => (
              <tr key={`${key}-${i}`} className="align-middle">
                {i === 0 && (
                  <td
                    rowSpan={entries.length}
                    className="border border-gray-300 px-3 py-3 font-medium text-gray-900 text-center align-middle bg-gray-50"
                  >
                    {label}
                  </td>
                )}
                <td className="border border-gray-300 px-3 py-3 text-center text-gray-700">
                  {formatTimeslot(entry.timeStart, entry.timeEnd)}
                </td>
                <td className="border border-gray-300 px-3 py-3 text-gray-900">
                  {entry.activity}
                </td>
                <td className="border border-gray-300 px-3 py-3 text-center text-gray-700">
                  {entry.rpe ?? "—"}
                </td>
                {i === 0 && (
                  <td
                    rowSpan={entries.length}
                    className="border border-gray-300 px-3 py-3 text-center align-middle font-medium text-gray-700"
                  >
                    {formatHours(hours)}
                  </td>
                )}
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Editable table bound to EditForm state */
function EditableScheduleTable({
  form,
  onChange,
}: {
  form: EditForm;
  onChange: (updated: EditForm) => void;
}) {
  const updateEntry = (
    idx: number,
    field: keyof ScheduleEntryForm,
    val: string
  ) => {
    const updated = form.schedule.map((e, i) =>
      i === idx ? { ...e, [field]: val } : e
    );
    onChange({ ...form, schedule: updated });
  };

  const removeEntry = (idx: number) => {
    onChange({
      ...form,
      schedule: form.schedule.filter((_, i) => i !== idx),
    });
  };

  const addEntry = (day: DayKey) => {
    onChange({
      ...form,
      schedule: [
        ...form.schedule,
        { dayOfWeek: day, timeStart: "", timeEnd: "", activity: "", rpe: "" },
      ],
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 w-28">
              Day
            </th>
            <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-700 w-52">
              Timeslot
            </th>
            <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">
              Activity
            </th>
            <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-700 w-24">
              RPE (1–10)
            </th>
            <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-700 w-32">
              Training Hours
            </th>
            <th className="border border-gray-300 px-2 py-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {DAY_KEYS.map(({ key, label }) => {
            const entries = form.schedule
              .map((e, globalIdx) => ({ ...e, globalIdx }))
              .filter((e) => e.dayOfWeek === key);

            const hours = dailyHours(entries);
            const totalSpan = Math.max(entries.length, 1);

            return (
              <React.Fragment key={key}>
                {entries.length === 0 ? (
                  /* Empty day: one placeholder row */
                  <tr key={`${key}-empty`} className="align-middle bg-white">
                    <td
                      rowSpan={1}
                      className="border border-gray-300 px-3 py-3 font-medium text-gray-900 text-center align-middle bg-gray-50"
                    >
                      {label}
                    </td>
                    <td className="border border-gray-300 px-3 py-3 text-center text-gray-400 italic">
                      —
                    </td>
                    <td className="border border-gray-300 px-3 py-3 text-gray-400 italic">
                      No activities
                    </td>
                    <td className="border border-gray-300 px-3 py-3 text-center text-gray-400">
                      —
                    </td>
                    <td className="border border-gray-300 px-3 py-3 text-center text-gray-400">
                      —
                    </td>
                    <td className="border border-gray-300 px-2 py-3 text-center" />
                  </tr>
                ) : (
                  entries.map((entry, i) => (
                    <tr key={`${key}-${entry.globalIdx}`} className="align-middle bg-white">
                      {i === 0 && (
                        <td
                          rowSpan={totalSpan}
                          className="border border-gray-300 px-3 py-3 font-medium text-gray-900 text-center align-middle bg-gray-50"
                        >
                          {label}
                        </td>
                      )}
                      {/* Timeslot: HH:MM pickers for start and end */}
                      <td className="border border-gray-300 px-2 py-2">
                        <div className="flex flex-col gap-1">
                          <TimePicker
                            value={entry.timeStart}
                            onChange={(val) =>
                              updateEntry(entry.globalIdx, "timeStart", val)
                            }
                          />
                          <span className="text-gray-400 text-xs text-center">to</span>
                          <TimePicker
                            value={entry.timeEnd}
                            onChange={(val) =>
                              updateEntry(entry.globalIdx, "timeEnd", val)
                            }
                          />
                        </div>
                      </td>
                      {/* Activity */}
                      <td className="border border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={entry.activity}
                          onChange={(e) =>
                            updateEntry(entry.globalIdx, "activity", e.target.value)
                          }
                          placeholder="e.g. Swimming, Gym, Track"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-400"
                        />
                      </td>
                      {/* RPE */}
                      <td className="border border-gray-300 px-2 py-2 text-center">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          step="1"
                          value={entry.rpe}
                          onChange={(e) =>
                            updateEntry(entry.globalIdx, "rpe", e.target.value)
                          }
                          className="w-14 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                        />
                      </td>
                      {/* Training Hours — rowspan, first row only */}
                      {i === 0 && (
                        <td
                          rowSpan={totalSpan}
                          className="border border-gray-300 px-3 py-3 text-center align-middle font-medium text-gray-700"
                        >
                          {formatHours(hours)}
                        </td>
                      )}
                      {/* Delete button */}
                      <td className="border border-gray-300 px-1 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeEntry(entry.globalIdx)}
                          className="text-red-400 hover:text-red-600 text-xs px-1 py-0.5 rounded hover:bg-red-50"
                          title="Remove activity"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                {/* Add Activity row for each day */}
                <tr key={`${key}-add`}>
                  <td
                    colSpan={6}
                    className="border border-gray-300 px-3 py-1 bg-gray-50"
                  >
                    <button
                      type="button"
                      onClick={() => addEntry(key)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium py-0.5"
                    >
                      + Add activity for {label}
                    </button>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// TRAINING INFO SECTION
// ============================================================

const INFO_FIELDS: {
  field: keyof EditForm["trainingInfo"];
  label: string;
  type?: "text" | "number";
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}[] = [
  {
    field: "upcomingMajorCompetitions",
    label: "Upcoming Major Competitions",
    placeholder: "e.g. SEA Games 2026",
  },
  {
    field: "upcomingLocalCompetitions",
    label: "Upcoming Local Competitions",
    placeholder: "e.g. National Championships",
  },
  {
    field: "pal",
    label: "Physical Activity Level (PAL)",
    type: "number",
    min: 0,
    max: 5,
    step: 0.01,
  },
  {
    field: "rpeWeek",
    label: "Weekly RPE Summary",
    type: "number",
    min: 0,
    max: 10,
    step: 1,
  },
  { field: "currentPerformance", label: "Current Performance" },
  { field: "coachPerformanceGoals", label: "Coach Performance Goals" },
  { field: "athletePerformanceGoals", label: "Athlete Performance Goals" },
  { field: "otherRemarks", label: "Other Remarks" },
];

function TrainingInfoSection({
  form,
  editing,
  apiData,
  onChange,
}: {
  form: EditForm;
  editing: boolean;
  apiData: TrainingScheduleData | null;
  onChange: (updated: EditForm) => void;
}) {
  const info = form.trainingInfo;

  const setField = (field: keyof EditForm["trainingInfo"], val: string) =>
    onChange({ ...form, trainingInfo: { ...info, [field]: val } });

  if (!editing) {
    const src = apiData?.trainingInfo;
    return (
      <div className="grid md:grid-cols-2 gap-8 text-sm">
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">
            Training Details
          </h3>
          <div className="space-y-2">
            {[
              { label: "PAL", val: src?.pal != null ? String(src.pal) : null },
              {
                label: "Weekly RPE",
                val: src?.rpeWeek != null ? String(src.rpeWeek) : null,
              },
              {
                label: "Major Competitions",
                val: src?.upcomingMajorCompetitions,
              },
              {
                label: "Local Competitions",
                val: src?.upcomingLocalCompetitions,
              },
            ].map(({ label, val }) => (
              <div key={label} className="flex justify-between gap-4">
                <span className="text-gray-600 shrink-0">{label}:</span>
                <span className="text-gray-900 text-right">
                  {val || "Not specified"}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">
            Performance Details
          </h3>
          <div className="space-y-3">
            {[
              { label: "Current Performance", val: src?.currentPerformance },
              {
                label: "Coach Performance Goals",
                val: src?.coachPerformanceGoals,
              },
              {
                label: "Athlete Performance Goals",
                val: src?.athletePerformanceGoals,
              },
              { label: "Other Remarks", val: src?.otherRemarks },
            ].map(({ label, val }) => (
              <div key={label}>
                <p className="text-gray-600 mb-0.5">{label}:</p>
                <p className="text-gray-900">{val || "—"}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="grid md:grid-cols-2 gap-8 text-sm">
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          Training Details
        </h3>
        <div className="space-y-4">
          {INFO_FIELDS.slice(0, 4).map(
            ({ field, label, type, min, max, step, placeholder }) => (
              <div key={field}>
                <label className="block text-gray-600 mb-1">{label}:</label>
                <input
                  type={type ?? "text"}
                  min={min}
                  max={max}
                  step={step}
                  value={info[field]}
                  placeholder={placeholder}
                  onChange={(e) => setField(field, e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
                {/* {(field === "pal" || field === "rpeWeek") && (
                  <p className="mt-1 text-xs text-gray-500">
                    Manual input only. This value is not derived from the schedule table.
                  </p>
                )} */}
              </div>
            )
          )}
        </div>
      </div>
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          Performance Details
        </h3>
        <div className="space-y-4">
          {INFO_FIELDS.slice(4).map(({ field, label, placeholder }) => (
            <div key={field}>
              <label className="block text-gray-600 mb-1">{label}:</label>
              <textarea
                rows={2}
                value={info[field]}
                placeholder={placeholder ?? "Input text here"}
                onChange={(e) => setField(field, e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-y"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PREVIOUS SESSION READ-ONLY VIEW
// ============================================================

function PreviousSessionView({ data }: { data: TrainingScheduleData | null }) {
  if (!data) {
    return (
      <div className="py-10 text-center text-gray-400 text-sm">
        No previous session data available.
      </div>
    );
  }

  const src = data.trainingInfo;
  const totalHours = DAY_KEYS.reduce(
    (sum, { key }) =>
      sum +
      dailyHoursFromApi(data.schedule.filter((e) => e.dayOfWeek === key)),
    0
  );

  return (
    <div className="space-y-6">
      <ScheduleTable data={data} />
      <div className="grid md:grid-cols-2 gap-8 text-sm">
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-3">
            Training Details
          </h3>
          <div className="space-y-2">
            {[
              { label: "Total Weekly Hours", val: formatHours(totalHours) },
              {
                label: "PAL",
                val: src.pal != null ? String(src.pal) : "Not set",
              },
              {
                label: "Weekly RPE",
                val: src.rpeWeek != null ? String(src.rpeWeek) : "Not set",
              },
              {
                label: "Major Competitions",
                val: src.upcomingMajorCompetitions || "Not specified",
              },
              {
                label: "Local Competitions",
                val: src.upcomingLocalCompetitions || "Not specified",
              },
            ].map(({ label, val }) => (
              <div key={label} className="flex justify-between gap-4">
                <span className="text-gray-600 shrink-0">{label}:</span>
                <span className="text-right">{val}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-3">
            Performance Details
          </h3>
          <div className="space-y-3">
            {[
              { label: "Current Performance", val: src.currentPerformance },
              { label: "Coach Goals", val: src.coachPerformanceGoals },
              { label: "Athlete Goals", val: src.athletePerformanceGoals },
              { label: "Other Remarks", val: src.otherRemarks },
            ].map(({ label, val }) =>
              val ? (
                <div key={label}>
                  <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                  <p className="text-gray-800">{val}</p>
                </div>
              ) : null
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function TrainingSchedule({
  athleteId: _athleteId,
  sessionId,
  isNewConsultation,
  ensureSession,
  readOnly,
  prevSessionId,
  onStepStatusChange,
}: TrainingScheduleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const effectiveEditing = (isEditing || !!isNewConsultation) && !readOnly;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"current" | "previous">("current");

  const [trainingData, setTrainingData] = useState<TrainingScheduleData | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(makeEmptyForm);
  const [prevData, setPrevData] = useState<TrainingScheduleData | null>(null);

  // Reset saved indicator when form changes
  useEffect(() => {
    setIsSaved(false);
  }, [editForm]);

  useEffect(() => {
    onStepStatusChange?.(isSaved ? "saved" : effectiveEditing ? "dirty" : "default");
  }, [effectiveEditing, isSaved, onStepStatusChange]);

  useEffect(() => {
    const handlePalUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ sessionId: string; pal: number | null }>;
      if (customEvent.detail?.sessionId !== sessionId) return;
      const syncedPal = customEvent.detail.pal;
      setTrainingData((prev) => (prev ? applyPalToTrainingData(prev, syncedPal) : prev));
      setEditForm((prev) => ({
        ...prev,
        trainingInfo: {
          ...prev.trainingInfo,
          pal: syncedPal !== null ? String(syncedPal) : "",
        },
      }));
    };

    window.addEventListener(PAL_UPDATED_EVENT, handlePalUpdated as EventListener);
    return () => {
      window.removeEventListener(PAL_UPDATED_EVENT, handlePalUpdated as EventListener);
    };
  }, [sessionId]);

  // Load current session data
  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = (await consultationApi.getTrainingSchedule(
          sessionId
        )) as { data: TrainingScheduleData };
        if (response?.data) {
          let nextData = response.data;
          if (nextData.trainingInfo.pal == null) {
            const nutritionResponse = (await consultationApi.getNutritionRequirements(
              sessionId
            )) as { data: { pal: number | null } } | null;
            const nutritionPal = nutritionResponse?.data?.pal ?? null;
            if (nutritionPal != null) {
              nextData = applyPalToTrainingData(nextData, nutritionPal);
            }
          }
          setTrainingData(nextData);
          setEditForm(parseFromApi(nextData));
        }
      } catch (err) {
        console.error("Error fetching training schedule:", err);
        setError("Failed to load training schedule data");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  // Load previous session data
  useEffect(() => {
    if (!prevSessionId) return;
    (async () => {
      try {
        const response = (await consultationApi.getTrainingSchedule(
          prevSessionId
        )) as { data: TrainingScheduleData };
        if (response?.data) setPrevData(response.data);
      } catch {
        /* non-critical */
      }
    })();
  }, [prevSessionId]);

  const handleSave = async () => {
    try {
      setSaveError("");
      const id =
        isNewConsultation && ensureSession ? await ensureSession() : sessionId;
      const token = localStorage.getItem("token");

      const info = editForm.trainingInfo;

      const body = {
        trainingInfo: {
          upcomingMajorCompetitions: info.upcomingMajorCompetitions || null,
          upcomingLocalCompetitions: info.upcomingLocalCompetitions || null,
          currentPerformance: info.currentPerformance || null,
          coachPerformanceGoals: info.coachPerformanceGoals || null,
          athletePerformanceGoals: info.athletePerformanceGoals || null,
          otherRemarks: info.otherRemarks || null,
          pal: info.pal !== "" ? parseFloat(info.pal) : null,
          rpeWeek: info.rpeWeek !== "" ? parseInt(info.rpeWeek, 10) : null,
        },
        schedule: editForm.schedule
          .filter((e) => e.activity.trim() !== "")
          .map((e) => ({
            dayOfWeek: e.dayOfWeek,
            timeStart: e.timeStart || null,
            timeEnd: e.timeEnd || null,
            activity: e.activity.trim(),
            rpe: e.rpe !== "" ? parseInt(e.rpe, 10) : null,
          })),
      };

      const response = await fetch(
        `${BACKEND_URL}/api/Consultation/sessions/${id}/training-schedule`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, "Failed to save training schedule"),
        );
      }

      const updated = (await response.json()) as { data: TrainingScheduleData };
      setTrainingData(updated.data);
      if (!isNewConsultation) setEditForm(parseFromApi(updated.data));
      window.dispatchEvent(
        new CustomEvent(PAL_UPDATED_EVENT, {
          detail: { sessionId: id, pal: updated.data.trainingInfo.pal ?? null },
        }),
      );
      setIsEditing(false);
      setIsSaved(true);
    } catch (err) {
      console.error("Error saving training schedule:", err);
      setSaveError(
        err instanceof Error ? err.message : "Failed to save training schedule.",
      );
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSaveError("");
    if (trainingData) setEditForm(parseFromApi(trainingData));
    else setEditForm(makeEmptyForm());
  };

  if (loading) {
    return (
      <section
        id="training-schedule"
        className="bg-white rounded-xl shadow-lg p-6 text-gray-900"
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-2 text-gray-600">Loading training schedule...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        id="training-schedule"
        className="bg-white rounded-xl shadow-lg p-6 text-gray-900"
      >
        <div className="text-center py-12">
          <div className="text-red-600 mb-2">⚠️ Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section
      id="training-schedule"
      className="bg-white rounded-xl shadow-lg p-6 text-gray-900"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Training Schedule</h2>
          <ConsultationCardLastUpdated
            lastUpdatedAt={trainingData?.lastUpdatedAt}
            lastUpdatedBy={trainingData?.lastUpdatedBy}
          />
        </div>
        {!readOnly && !effectiveEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 text-white text-sm rounded bg-gray-800 hover:bg-gray-700"
          >
            Edit
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {(["current", "previous"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "current" ? "Current Session" : "Previous Session"}
          </button>
        ))}
      </div>

      {activeTab === "current" ? (
        <div className="space-y-6">
          {effectiveEditing ? (
            <EditableScheduleTable form={editForm} onChange={setEditForm} />
          ) : (
            trainingData && <ScheduleTable data={trainingData} />
          )}
          <TrainingInfoSection
            form={editForm}
            editing={effectiveEditing}
            apiData={trainingData}
            onChange={setEditForm}
          />
        </div>
      ) : (
        <PreviousSessionView data={prevData} />
      )}

      {!readOnly && effectiveEditing && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          {saveError && <p className="text-red-600 text-sm mb-3">{saveError}</p>}
          <div className="flex items-center justify-end gap-2">
            {!isNewConsultation && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => {
                setTrainingData(null);
                setEditForm(makeEmptyForm());
                setIsSaved(false);
                setSaveError("");
              }}
              className="px-4 py-2 bg-red-50 text-red-600 text-sm rounded border border-red-200 hover:bg-red-100"
            >
              Clear All
            </button>
            <button
              onClick={handleSave}
              className={`px-4 py-2 text-white text-sm rounded ${isSaved ? "bg-green-600 hover:bg-green-700" : "bg-gray-800 hover:bg-gray-700"}`}
            >
              {isSaved ? "Draft Saved" : "Save"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
