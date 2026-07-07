"use client";

import type { ConsultType, LatestConsultation, UpdateForm } from "./consultationViewTypes";

interface ConsultationDetailsStepProps {
  isNewConsultation: boolean;
  latestConsultation: LatestConsultation | null;
  consultDetailsTab: "current" | "previous";
  setConsultDetailsTab: (tab: "current" | "previous") => void;
  isEditMode: boolean;
  isSavingUpdate: boolean;
  updateSaveError: string;
  updateForm: UpdateForm;
  consultTypes: ConsultType[];
  consultObjectives: { id: string; consultation_objective: string }[];
  isUpdateCardSaved: boolean;
  isUpdateFormDirty: boolean;
  onEditClick: () => void;
  onCancelEdit: () => void;
  onClearConsultationDetails: () => void;
  onSaveUpdate: () => void;
  onSaveUpdateCard: () => void;
  onUpdateFormChange: (patch: Partial<UpdateForm>) => void;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTE_OPTIONS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

function TimePicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [curH = "", curM = ""] = value ? value.split(":") : [];
  const setH = (h: string) => onChange(h ? `${h}:${curM || "00"}` : "");
  const setM = (m: string) => onChange(m ? `${curH || "00"}:${m}` : "");

  return (
    <div className="flex items-center gap-1">
      <select value={curH} onChange={(e) => setH(e.target.value)} className="flex-1 px-2 py-2 border border-gray-300 rounded text-sm text-gray-900">
        <option value="">HH</option>
        {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="text-gray-500 font-medium">:</span>
      <select value={curM} onChange={(e) => setM(e.target.value)} className="flex-1 px-2 py-2 border border-gray-300 rounded text-sm text-gray-900">
        <option value="">MM</option>
        {MINUTE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  );
}

function ReadOnlyDetails({ latestConsultation }: { latestConsultation: LatestConsultation | null }) {
  const d = latestConsultation;
  if (!d) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-900">
      <div>
        <span className="text-gray-500">Date of Consult:</span>
        <span className="ml-2 font-medium">
          {(d.date_of_consult ? new Date(d.date_of_consult) : new Date()).toLocaleDateString()}
          {d.time_of_consult && <span className="ml-1 text-gray-600">{d.time_of_consult.substring(0, 5)}</span>}
        </span>
      </div>
      <div>
        <span className="text-gray-500">Follow Up Date:</span>
        <span className="ml-2 font-medium">
          {d.date_of_next_follow_up ? new Date(d.date_of_next_follow_up).toLocaleDateString() : "Not set"}
          {d.date_of_next_follow_up && d.time_of_next_follow_up && <span className="ml-1 text-gray-600">{d.time_of_next_follow_up.substring(0, 5)}</span>}
        </span>
      </div>
      <div>
        <span className="text-gray-500">Consulted By:</span>
        <span className="ml-2 font-medium">{d.nutritionist_name || "—"}</span>
      </div>
      <div>
        <span className="text-gray-500">Consult Type:</span>
        <span className="ml-2 font-medium">{d.type_of_consult || "—"}</span>
      </div>
      {d.venue && (
        <div>
          <span className="text-gray-500">Venue:</span>
          <span className="ml-2 font-medium">{d.venue}</span>
        </div>
      )}
      {d.title_description && (
        <div>
          <span className="text-gray-500">Title:</span>
          <span className="ml-2 font-medium">{d.title_description}</span>
        </div>
      )}
      <div>
        <span className="text-gray-500">Objective:</span>
        <span className="ml-2 font-medium">{d.consultation_objective || "No objective specified"}</span>
      </div>
      <div>
        <span className="text-gray-500">Support SSP:</span>
        <span className="ml-2 font-medium">{d.ssp === true ? "Yes" : "No"}</span>
      </div>
    </div>
  );
}

export default function ConsultationDetailsStep(props: ConsultationDetailsStepProps) {
  const {
    isNewConsultation,
    latestConsultation,
    consultDetailsTab,
    setConsultDetailsTab,
    isEditMode,
    isSavingUpdate,
    updateSaveError,
    updateForm,
    consultTypes,
    consultObjectives,
    isUpdateCardSaved,
    isUpdateFormDirty,
    onEditClick,
    onCancelEdit,
    onClearConsultationDetails,
    onSaveUpdate,
    onSaveUpdateCard,
    onUpdateFormChange,
  } = props;

  const renderUpdateForm = () => (
    <div>
      {updateSaveError && <p className="text-red-600 text-sm mb-3">{updateSaveError}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Type of Consultation</label>
          <select value={updateForm.type_of_consult_id} onChange={(e) => onUpdateFormChange({ type_of_consult_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900">
            <option value="">Select type...</option>
            {consultTypes.map((t) => <option key={t.id} value={t.id}>{t.type_of_consult}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Title / Description</label>
          <input type="text" value={updateForm.title_description} onChange={(e) => onUpdateFormChange({ title_description: e.target.value })} placeholder="Session title..." className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Venue</label>
          <input type="text" value={updateForm.venue} onChange={(e) => onUpdateFormChange({ venue: e.target.value })} placeholder="Venue..." className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Date of Consultation</label>
          <input type="date" value={updateForm.date_of_consult} onChange={(e) => onUpdateFormChange({ date_of_consult: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Time of Consultation</label>
          <TimePicker value={updateForm.time_of_consult} onChange={(val) => onUpdateFormChange({ time_of_consult: val })} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Date of Next Follow-Up</label>
          <input type="date" value={updateForm.date_of_next_follow_up} onChange={(e) => onUpdateFormChange({ date_of_next_follow_up: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Time of Next Follow-Up</label>
          <TimePicker value={updateForm.time_of_next_follow_up} onChange={(val) => onUpdateFormChange({ time_of_next_follow_up: val })} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Support SSP</label>
          <select
            value={updateForm.ssp ? "Yes" : "No"} onChange={(e) => onUpdateFormChange({
                ssp: e.target.value === "Yes",
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
          >
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Consultation Objective</label>
          <select value={updateForm.consultation_objective_id} onChange={(e) => onUpdateFormChange({ consultation_objective_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900">
            <option value="">Select objective...</option>
            {consultObjectives.map((o) => <option key={o.id} value={o.id}>{o.consultation_objective}</option>)}
          </select>
        </div>
      </div>
      {isNewConsultation && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onSaveUpdateCard}
            disabled={isSavingUpdate}
            className={`px-3 py-1 text-white text-sm rounded disabled:opacity-50 ${
              isUpdateCardSaved && !isUpdateFormDirty ? "bg-green-600 hover:bg-green-700" : "bg-gray-800 hover:bg-gray-700"
            }`}
          >
            {isSavingUpdate ? "Saving..." : isUpdateCardSaved && !isUpdateFormDirty ? "Draft Saved" : "Save"}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900">Consultation Details</h2>
        {!isNewConsultation && (
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <button onClick={onCancelEdit} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded border hover:bg-gray-200">Cancel</button>
                <button onClick={onClearConsultationDetails} className="px-3 py-1 bg-red-50 text-red-600 text-sm rounded border border-red-200 hover:bg-red-100">Clear All</button>
                <button onClick={onSaveUpdate} disabled={isSavingUpdate} className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
                  {isSavingUpdate ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <button onClick={onEditClick} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded border hover:bg-gray-200 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                Edit
              </button>
            )}
          </div>
        )}
      </div>
      {isNewConsultation && latestConsultation && (
        <div className="flex border-b border-gray-200 mb-6">
          {(["current", "previous"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setConsultDetailsTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                consultDetailsTab === tab ? "border-gray-800 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "current" ? "Current Session" : "Previous Session"}
            </button>
          ))}
        </div>
      )}
      {isNewConsultation
        ? consultDetailsTab === "previous"
          ? <ReadOnlyDetails latestConsultation={latestConsultation} />
          : renderUpdateForm()
        : isEditMode
          ? renderUpdateForm()
          : <ReadOnlyDetails latestConsultation={latestConsultation} />}
    </div>
  );
}
