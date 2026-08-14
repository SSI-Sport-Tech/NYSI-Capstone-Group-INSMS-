import { useCallback, useState, useEffect, useRef } from "react";
import Image from "next/image";
import { QRCode } from "react-qrcode-logo";
import {
  consultationApi,
  ConsultationApiError,
} from "../../../utils/consultationApi";
import ConsultationCardLastUpdated from "./ConsultationCardLastUpdated";
import AdexAnthropometryForm from "./AdexAnthropometryForm";
import { getBackendUrl } from "@/utils/backendUrl";

const BACKEND_URL = getBackendUrl();

interface AnthropometryProps {
  athleteId: string;
  sessionId: string;
  isNewConsultation?: boolean;
  ensureSession?: () => Promise<string>;
  readOnly?: boolean;
  prevSessionId?: string;
  onAnthroChange?: (
    weight: number | null,
    height: number | null,
    targetWeight: number | null,
  ) => void;
  onStepStatusChange?: (status: "default" | "dirty" | "saved") => void;
}

interface AnthropometryData {
  lastUpdatedAt?: string | null;
  lastUpdatedBy?: string | null;
  height: number | null;
  weight: number | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  bone_density: number | null;
  water_percentage: number | null;
  basal_metabolic_rate: number | null;
  visceral_fat: number | null;
  bmi: number | null;
  bmi_category: string | null;
  fat_mass: number | null;
  fat_mass_percentage: number | null;
  skeletal_muscle_mass: number | null;
  skeletal_muscle_mass_percentage: number | null;
  sum_of_skinfold: number | null;
  target_weight: number | null;
  target_bmi: number | null;
  mothers_height: number | null;
  fathers_height: number | null;
  athlete_potential_adult_height: number | null;
  measured_by: string | null;
  measurement_notes: string | null;
  date_recorded: string | null;
}

interface EditForm {
  height: string;
  weight: string;
  bmi_category: string;
  fat_mass: string;
  skeletal_muscle_mass: string;
  sum_of_skinfold: string;
  target_weight: string;
  mothers_height: string;
  fathers_height: string;
  athlete_potential_adult_height: string;
  date_recorded: string;
  measured_by: string;
}

interface BiaValue {
  value?: string | number | null;
  unit?: string | null;
}

interface BiaMeasurement {
  [key: string]: unknown;
  pk_bia_measurement_uuid?: string;
  measurement_date?: string | null;
  height?: BiaValue | string | number | null;
  weight?: BiaValue | string | number | null;
  bmi?: BiaValue | string | number | null;
}

interface AdexAnthropometrySummary {
  pk_anthropometry_uuid: string;
  date_of_test?: string | null;
  time_of_test?: string | null;
  huang_2023?: string | number | null;
  durnin_womersley?: string | number | null;
}

interface AdexAnthropometryDetail extends AdexAnthropometrySummary {
  by?: string | null;
  caliper_set?: string | null;
  gender?: string | null;
  height?: string | number | null;
  weight?: string | number | null;
  skinfoldTable?: Record<string, Record<string, unknown>>;
  circumTable?: Record<string, Record<string, unknown>>;
  calculatedData?: Record<string, unknown>;
}

const SECA_WIDGET_SCRIPTS = [
  "https://cdn.secacloud.com/widgets/v1.3.1/widgets-translations.en-US.js",
  "https://cdn.secacloud.com/widgets/v1.3.1/widgets.js",
  "https://cdn.secacloud.com/widgets/v1.3.1/widgets-additional-icons.ssmm.js",
];

type SecaWidgetRenderer = (
  container: HTMLElement,
  payload: unknown,
  config: { locale: string },
) => void;

declare global {
  interface Window {
    secaCloudWidgets?: {
      singleValueCharts: Record<string, SecaWidgetRenderer>;
      trendCharts: Record<string, SecaWidgetRenderer>;
    };
  }
}

function formatBiaValue(value: BiaMeasurement["weight"]): string {
  if (value == null) return "—";
  if (typeof value === "object") {
    if (value.value == null) return "—";
    return `${value.value}${value.unit ? ` ${value.unit}` : ""}`;
  }
  return String(value);
}

function formatDetailValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "object") {
    const metric = value as { value?: unknown; unit?: unknown };
    if (metric.value != null) {
      return `${String(metric.value)}${metric.unit ? ` ${String(metric.unit)}` : ""}`;
    }
    return JSON.stringify(value);
  }
  return String(value);
}

function humanizeField(field: string): string {
  return field
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function AdexMeasurementTable({
  title,
  data,
}: {
  title: string;
  data?: Record<string, Record<string, unknown>>;
}) {
  if (!data || Object.keys(data).length === 0) return null;
  const columns = ["Trial #1", "Trial #2", "Trial #3", "Mean/Median"];

  return (
    <div className="mb-5 overflow-x-auto rounded-lg border border-gray-200">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 font-semibold text-gray-900">
        {title}
      </div>
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-white">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Site</th>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3 text-left font-medium text-gray-600">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {Object.entries(data).map(([site, values]) => (
            <tr key={site}>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{site}</td>
              {columns.map((column) => (
                <td key={column} className="px-4 py-3 text-gray-700">
                  {formatDetailValue(values?.[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function loadSecaScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }

    const script = existing ?? document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
    if (!existing) document.body.appendChild(script);
  });
}

const SINGLE_ALL_WIDGETS = ["tbs", "biva", "ssmm_bmi_independent", "smm_over_age", "smm_over_age_bmi_independent", "bmi", "weight", "water", "wr", "wc", "bcc", "pha", "smm", "ssmm", "fmp", "vat"];
const SINGLE_HPSI_WIDGETS = ["bmi", "weight", "water", "wr", "wc", "bcc", "pha", "smm", "ssmm", "fmp", "vat"];
const TREND_ALL_WIDGETS = ["tbs", "biva", "ssmm_bmi_independent", "smm_over_age", "smm_over_age_bmi_independent", "bmi", "weight", "wr", "wc", "bcc", "pha", "smm", "ssmm", "fmp", "vat"];
const TREND_HPSI_WIDGETS = ["bmi", "weight", "wr", "wc", "bcc", "pha", "smm", "ssmm", "fmp", "vat"];

const BIA_WIDGET_RENDERERS: Record<string, string> = {
  tbs: "renderTruBodyScore",
  biva: "renderBIVA",
  ssmm_bmi_independent: "renderSegmentalSkeletalMuscleMassBMIIndependant",
  smm_over_age: "renderSkeletalMuscleMassOverAge",
  smm_over_age_bmi_independent: "renderSkeletalMuscleMassOverAgeBMIIndependant",
  bmi: "renderBodyMassIndex",
  weight: "renderWeight",
  water: "renderWater",
  wr: "renderWaterRatio",
  wc: "renderWaistCircumference",
  bcc: "renderBodyComposition",
  pha: "renderPhaseAngle",
  smm: "renderSkeletalMuscleMass",
  ssmm: "renderSegmentalSkeletalMuscleMass",
  fmp: "renderFatMassPercentage",
  vat: "renderVisceralAdiposeTissue",
};

function getBiaWidgetCalculations(data: BiaMeasurement, key: string): Record<string, unknown> {
  switch (key) {
    case "tbs": return { tbs: data.tbs };
    case "biva": return { r: data.r, xc: data.xc, biva: data.biva };
    case "ssmm_bmi_independent": return {
      ssmmLeftArmBMIIndependant: data.ssmm_left_arm_bmi_independant,
      ssmmLeftLegBMIIndependant: data.ssmm_left_leg_bmi_independant,
      ssmmRightArmBMIIndependant: data.ssmm_right_arm_bmi_independant,
      ssmmRightLegBMIIndependant: data.ssmm_right_leg_bmi_independant,
      ssmmTorsoBMIIndependant: data.ssmm_torso,
      smm: data.smm,
    };
    case "smm_over_age": return { smmOverAge: data.smm_over_age };
    case "smm_over_age_bmi_independent": return { smmOverAgeBMIIndependant: data.smm_over_age_bmi_independant };
    case "bmi": return { height: data.height, weight: data.weight, bmi: data.bmi };
    case "weight": return { height: data.height, weight: data.weight };
    case "water": return { tbw: data.tbw, tbwp: data.tbwp, ecw: data.ecw, ecwp: data.ecwp };
    case "wr": return { ecwByTbw: data.ecw_by_tbw, tbw: data.tbw, tbwp: data.tbwp, ecw: data.ecw, ecwp: data.ecwp };
    case "wc": return { wc: data.wc, vat: data.vat };
    case "bcc": return { zfmi: data.zfmi, zsmi: data.zsmi, smm: data.smm, fm: data.fm };
    case "pha": return { pha: data.pha };
    case "smm": return { smm: data.smm, smmp: data.smmp, bmi: data.bmi };
    case "ssmm": return {
      ssmmLeftArm: data.ssmm_left_arm,
      ssmmLeftLeg: data.ssmm_left_leg,
      ssmmRightArm: data.ssmm_right_arm,
      ssmmRightLeg: data.ssmm_right_leg,
      ssmmTorso: data.ssmm_torso,
      smm: data.smm,
    };
    case "fmp": return { fmp: data.fmp, fm: data.fm, fmi: data.fmi };
    case "vat": return { vat: data.vat, wc: data.wc };
    default: return {};
  }
}

function BiaMeasurementDashboard({
  data,
  trendData,
}: {
  data: BiaMeasurement;
  trendData: BiaMeasurement[];
}) {
  const widgetRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [widgetError, setWidgetError] = useState("");
  const [activeView, setActiveView] = useState<"single" | "trend">("single");
  const [analysisScope, setAnalysisScope] = useState<"all" | "hpsi">("all");

  useEffect(() => {
    let cancelled = false;

    const renderWidgets = async () => {
      try {
        if (!window.secaCloudWidgets) {
          for (const src of SECA_WIDGET_SCRIPTS) await loadSecaScript(src);
        }
        if (cancelled || !window.secaCloudWidgets) return;

        const visibleKeys = activeView === "single"
          ? analysisScope === "all" ? SINGLE_ALL_WIDGETS : SINGLE_HPSI_WIDGETS
          : analysisScope === "all" ? TREND_ALL_WIDGETS : TREND_HPSI_WIDGETS;
        const renderers = activeView === "single"
          ? window.secaCloudWidgets.singleValueCharts
          : window.secaCloudWidgets.trendCharts;

        Object.values(widgetRefs.current).forEach((container) => {
          if (container) container.innerHTML = "";
        });

        for (const key of visibleKeys) {
          const container = widgetRefs.current[key];
          const renderer = renderers[BIA_WIDGET_RENDERERS[key]];
          if (!container || !renderer) continue;
          const payload = activeView === "single"
            ? {
                id: data.pk_bia_measurement_uuid,
                measurementDate: data.measurement_date,
                biaCalculations: getBiaWidgetCalculations(data, key),
              }
            : {
                values: [...trendData]
                  .sort(
                    (a, b) => new Date(String(a.measurement_date || 0)).getTime() -
                      new Date(String(b.measurement_date || 0)).getTime(),
                  )
                  .map((measurement) => ({
                    id: measurement.pk_bia_measurement_uuid,
                    measurementDate: measurement.measurement_date,
                    biaCalculations: getBiaWidgetCalculations(measurement, key),
                  })),
                selectedMeasurementId: data.pk_bia_measurement_uuid,
              };
          renderer(container, payload, { locale: "en-US" });
        }
      } catch (error) {
        console.error("Failed to load Seca BIA widgets:", error);
        if (!cancelled) setWidgetError("Interactive BIA charts could not be loaded.");
      }
    };

    renderWidgets();
    return () => {
      cancelled = true;
    };
  }, [activeView, analysisScope, data, trendData]);

  const widgetKeys = activeView === "single"
    ? analysisScope === "all" ? SINGLE_ALL_WIDGETS : SINGLE_HPSI_WIDGETS
    : analysisScope === "all" ? TREND_ALL_WIDGETS : TREND_HPSI_WIDGETS;
  return (
    <div className="mb-6">
      {widgetError && <p className="mb-3 text-sm text-amber-700">{widgetError}</p>}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded-lg border border-gray-300">
          {(["single", "trend"] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
              className={`px-4 py-2 text-sm font-medium ${
                activeView === view
                  ? "bg-orange-50 text-orange-700"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {view === "single" ? "Single" : "Trend"}
            </button>
          ))}
        </div>
        <select
          value={analysisScope}
          onChange={(event) => setAnalysisScope(event.target.value as "all" | "hpsi")}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
        >
          <option value="all">All analysis parameters</option>
          <option value="hpsi">HPSI Analysis</option>
        </select>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {widgetKeys.map((key) => (
          <div
            key={key}
            ref={(element) => { widgetRefs.current[key] = element; }}
            className="min-h-12"
          />
        ))}
      </div>
    </div>
  );
}

function calcBMI(weight: number, height: number): string {
  if (!weight || !height) return "";
  return (weight / Math.pow(height / 100, 2)).toFixed(2);
}

function calcFatMassPercent(fatMass: number, weight: number): string {
  if (!fatMass || !weight) return "";
  return ((fatMass / weight) * 100).toFixed(1);
}

function calcSMMPercent(smm: number, weight: number): string {
  if (!smm || !weight) return "";
  return ((smm / weight) * 100).toFixed(1);
}

function calcTargetBMI(targetWeight: number, height: number): string {
  if (!targetWeight || !height) return "";
  return (targetWeight / Math.pow(height / 100, 2)).toFixed(2);
}

export default function Anthropometry({
  athleteId,
  sessionId,
  isNewConsultation,
  ensureSession,
  readOnly,
  prevSessionId,
  onAnthroChange,
  onStepStatusChange,
}: AnthropometryProps) {
  const [bmiLightbox, setBmiLightbox] = useState<string | null>(null);
  const [anthropometryData, setAnthropometryData] =
    useState<AnthropometryData | null>(null);
  const [prevData, setPrevData] = useState<AnthropometryData | null>(null);
  const [dataTab, setDataTab] = useState<"anthropometry" | "adex" | "bia">("anthropometry");
  const [sessionTab, setSessionTab] = useState<"current" | "previous">("current");
  const [adexAnthropometries, setAdexAnthropometries] = useState<AdexAnthropometrySummary[]>([]);
  const [adexLoading, setAdexLoading] = useState(true);
  const [adexError, setAdexError] = useState("");
  const [biaMeasurements, setBiaMeasurements] = useState<BiaMeasurement[]>([]);
  const [biaLoading, setBiaLoading] = useState(true);
  const [biaError, setBiaError] = useState("");
  const [selectedBia, setSelectedBia] = useState<BiaMeasurement | null>(null);
  const [selectedAdexAnthropometry, setSelectedAdexAnthropometry] =
    useState<AdexAnthropometryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [showAdexForm, setShowAdexForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState<string>("");
  const [isSaved, setIsSaved] = useState(false);

  const effectiveEditing = isEditing && !readOnly;

  const emptyForm: EditForm = {
    height: "",
    weight: "",
    bmi_category: "",
    fat_mass: "",
    skeletal_muscle_mass: "",
    sum_of_skinfold: "",
    target_weight: "",
    mothers_height: "",
    fathers_height: "",
    athlete_potential_adult_height: "",
    date_recorded: "",
    measured_by: "",
  };

  const [editForm, setEditForm] = useState<EditForm>(emptyForm);

  useEffect(() => {
    setIsSaved(false);
  }, [editForm]);

  useEffect(() => {
    onStepStatusChange?.(isSaved ? "saved" : effectiveEditing ? "dirty" : "default");
  }, [effectiveEditing, isSaved, onStepStatusChange]);

  // Notify parent of live weight/height/targetWeight as user types
  useEffect(() => {
    if (!onAnthroChange) return;
    const w = editForm.weight !== "" ? parseFloat(editForm.weight) : null;
    const h = editForm.height !== "" ? parseFloat(editForm.height) : null;
    const tw =
      editForm.target_weight !== "" ? parseFloat(editForm.target_weight) : null;
    onAnthroChange(
      w !== null && !isNaN(w) ? w : null,
      h !== null && !isNaN(h) ? h : null,
      tw !== null && !isNaN(tw) ? tw : null,
    );
  }, [editForm.weight, editForm.height, editForm.target_weight]);

  // Derived calculated fields from editForm
  const w = parseFloat(editForm.weight);
  const h = parseFloat(editForm.height);
  const fm = parseFloat(editForm.fat_mass);
  const smm = parseFloat(editForm.skeletal_muscle_mass);
  const tw = parseFloat(editForm.target_weight);

  const calcedBMI = !isNaN(w) && !isNaN(h) ? calcBMI(w, h) : "";
  const calcedFatMassPercent =
    !isNaN(fm) && !isNaN(w) ? calcFatMassPercent(fm, w) : "";
  const calcedSMMPercent =
    !isNaN(smm) && !isNaN(w) ? calcSMMPercent(smm, w) : "";
  const calcedTargetBMI = !isNaN(tw) && !isNaN(h) ? calcTargetBMI(tw, h) : "";

  const fetchAnthropometry = async () => {
    if (!sessionId) {
      setAnthropometryData(null);
      setEditForm(emptyForm);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = (await consultationApi.getAnthropometry(sessionId)) as {
        data: unknown;
      };
      const apiData = response.data as {
        lastUpdatedAt?: string | null;
        lastUpdatedBy?: string | null;
        heightCm?: string;
        weightKg?: string;
        bmi?: string;
        bmiCategory?: string;
        fatMassKg?: string;
        fatMassPct?: string;
        skeletalMuscleMassKg?: string;
        skeletalMuscleMassPct?: string;
        sumOf8Skinfold?: string;
        targetWeightKg?: string;
        targetBmi?: string;
        motherHeightCm?: string;
        fatherHeightCm?: string;
        athletePotentialAdultHeightCm?: string;
        otherRemarks?: string;
        dateRecorded?: string | null;
        measuredBy?: string | null;
      };

      console.log("🔍 Anthropometry API Response:", apiData);

      // Map API response to our interface
      const data: AnthropometryData = {
        lastUpdatedAt: apiData.lastUpdatedAt ?? null,
        lastUpdatedBy: apiData.lastUpdatedBy ?? null,
        height: apiData.heightCm ? parseFloat(apiData.heightCm) : null,
        weight: apiData.weightKg ? parseFloat(apiData.weightKg) : null,
        bmi: apiData.bmi ? parseFloat(apiData.bmi) : null,
        bmi_category: apiData.bmiCategory || null,
        fat_mass: apiData.fatMassKg ? parseFloat(apiData.fatMassKg) : null,
        fat_mass_percentage: apiData.fatMassPct
          ? parseFloat(apiData.fatMassPct)
          : null,
        skeletal_muscle_mass: apiData.skeletalMuscleMassKg
          ? parseFloat(apiData.skeletalMuscleMassKg)
          : null,
        skeletal_muscle_mass_percentage: apiData.skeletalMuscleMassPct
          ? parseFloat(apiData.skeletalMuscleMassPct)
          : null,
        sum_of_skinfold: apiData.sumOf8Skinfold
          ? parseFloat(apiData.sumOf8Skinfold)
          : null,
        target_weight: apiData.targetWeightKg
          ? parseFloat(apiData.targetWeightKg)
          : null,
        target_bmi: apiData.targetBmi ? parseFloat(apiData.targetBmi) : null,
        mothers_height: apiData.motherHeightCm
          ? parseFloat(apiData.motherHeightCm)
          : null,
        fathers_height: apiData.fatherHeightCm
          ? parseFloat(apiData.fatherHeightCm)
          : null,
        athlete_potential_adult_height: apiData.athletePotentialAdultHeightCm != null
          ? Number(apiData.athletePotentialAdultHeightCm)
          : null,
        measured_by: apiData.measuredBy ?? null,
        measurement_notes: apiData.otherRemarks || null,
        date_recorded: apiData.dateRecorded ?? null,
        // Fields not in API:
        body_fat_percentage: null,
        muscle_mass: null,
        bone_density: null,
        water_percentage: null,
        basal_metabolic_rate: null,
        visceral_fat: null,
      };

      console.log("🎯 Mapped Anthropometry Data:", data);

      setAnthropometryData(data);

      // Pre-populate edit form from fetched data
      setEditForm({
        height: data.height?.toString() ?? "",
        weight: data.weight?.toString() ?? "",
        bmi_category: data.bmi_category ?? "",
        fat_mass: data.fat_mass?.toString() ?? "",
        skeletal_muscle_mass: data.skeletal_muscle_mass?.toString() ?? "",
        sum_of_skinfold: data.sum_of_skinfold?.toString() ?? "",
        target_weight: data.target_weight?.toString() ?? "",
        mothers_height: data.mothers_height?.toString() ?? "",
        fathers_height: data.fathers_height?.toString() ?? "",
        athlete_potential_adult_height: data.athlete_potential_adult_height?.toString() ?? "",
        date_recorded: data.date_recorded
          ? new Date(data.date_recorded).toISOString().split("T")[0]
          : "",
        measured_by: data.measured_by ?? "",
      });
    } catch (error) {
      console.error("Error fetching anthropometry:", error);
      if (error instanceof ConsultationApiError && error.status === 404) {
        setAnthropometryData(null);
      } else {
        setError("Failed to load anthropometry data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnthropometry();
  }, [sessionId]);

  const fetchBiaMeasurements = useCallback(async () => {
    if (!athleteId) {
      setBiaMeasurements([]);
      setBiaLoading(false);
      return;
    }

    try {
      setBiaLoading(true);
      setBiaError("");
      const response = (await consultationApi.getBiaMeasurements(athleteId)) as {
        data: BiaMeasurement[];
      };
      const measurements = Array.isArray(response?.data) ? response.data : [];
      setBiaMeasurements(
        [...measurements].sort(
          (a, b) =>
            new Date(b.measurement_date || 0).getTime() -
            new Date(a.measurement_date || 0).getTime(),
        ),
      );
    } catch (err) {
      console.error("Error fetching BIA measurements:", err);
      setBiaError("Failed to load BIA measurements");
    } finally {
      setBiaLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    fetchBiaMeasurements();
  }, [fetchBiaMeasurements]);

  const fetchAdexAnthropometries = useCallback(async () => {
    if (!athleteId) {
      setAdexAnthropometries([]);
      setAdexLoading(false);
      return;
    }

    try {
      setAdexLoading(true);
      setAdexError("");
      const response = (await consultationApi.getAdexAnthropometries(athleteId)) as {
        data: AdexAnthropometrySummary[];
      };
      setAdexAnthropometries(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      console.error("Error fetching ADEX anthropometry data:", err);
      setAdexError("Failed to load ADEX anthropometry data");
    } finally {
      setAdexLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    fetchAdexAnthropometries();
  }, [fetchAdexAnthropometries]);

  const openAdexAnthropometryDetail = async (record: AdexAnthropometrySummary) => {
    setSelectedBia(null);
    setSelectedAdexAnthropometry(null);
    setDetailError("");
    setDetailLoading(true);

    try {
      const response = (await consultationApi.getAdexAnthropometryDetail(
        record.pk_anthropometry_uuid,
      )) as { data: AdexAnthropometryDetail };
      setSelectedAdexAnthropometry(response.data);
    } catch (err) {
      console.error("Error fetching ADEX anthropometry detail:", err);
      setDetailError("Failed to load anthropometry details");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedBia(null);
    setSelectedAdexAnthropometry(null);
    setDetailLoading(false);
    setDetailError("");
  };

  const openBiaDetail = (measurement: BiaMeasurement) => {
    setSelectedAdexAnthropometry(null);
    setDetailError("");
    setDetailLoading(false);
    setSelectedBia(measurement);
  };

  // Fetch previous session data for "Prev:" reference display
  useEffect(() => {
    if (!prevSessionId) { setPrevData(null); return; }
    consultationApi.getAnthropometry(prevSessionId)
      .then((res) => {
        const apiData = (res as { data: Record<string, string | null> }).data;
        if (!apiData) { setPrevData(null); return; }
        setPrevData({
          height: apiData.heightCm ? parseFloat(apiData.heightCm as string) : null,
          weight: apiData.weightKg ? parseFloat(apiData.weightKg as string) : null,
          bmi: apiData.bmi ? parseFloat(apiData.bmi as string) : null,
          bmi_category: (apiData.bmiCategory as string) || null,
          fat_mass: apiData.fatMassKg ? parseFloat(apiData.fatMassKg as string) : null,
          fat_mass_percentage: apiData.fatMassPct ? parseFloat(apiData.fatMassPct as string) : null,
          skeletal_muscle_mass: apiData.skeletalMuscleMassKg ? parseFloat(apiData.skeletalMuscleMassKg as string) : null,
          skeletal_muscle_mass_percentage: apiData.skeletalMuscleMassPct ? parseFloat(apiData.skeletalMuscleMassPct as string) : null,
          sum_of_skinfold: apiData.sumOf8Skinfold ? parseFloat(apiData.sumOf8Skinfold as string) : null,
          target_weight: apiData.targetWeightKg ? parseFloat(apiData.targetWeightKg as string) : null,
          target_bmi: apiData.targetBmi ? parseFloat(apiData.targetBmi as string) : null,
          mothers_height: apiData.motherHeightCm ? parseFloat(apiData.motherHeightCm as string) : null,
          fathers_height: apiData.fatherHeightCm ? parseFloat(apiData.fatherHeightCm as string) : null,
          athlete_potential_adult_height: apiData.athletePotentialAdultHeightCm ? parseFloat(apiData.athletePotentialAdultHeightCm as string) : null,
          measured_by: (apiData.measuredBy as string) || null,
          measurement_notes: null,
          date_recorded: (apiData.dateRecorded as string) || null,
          body_fat_percentage: null,
          muscle_mass: null,
          bone_density: null,
          water_percentage: null,
          basal_metabolic_rate: null,
          visceral_fat: null,
        });
      })
      .catch(() => setPrevData(null));
  }, [prevSessionId]);

  const handleSave = async () => {
    try {
      setSaveError("");
      const targetId =
        isNewConsultation && ensureSession ? await ensureSession() : sessionId;
      const token = localStorage.getItem("token");

      // Use the camelCase field names that the backend service expects.
      // Omit null values so empty fields don't overwrite existing measurements.
      const payload: Record<string, number | string> = {};
      if (editForm.height) payload.heightCm = parseFloat(editForm.height);
      if (editForm.weight) payload.weightKg = parseFloat(editForm.weight);
      if (editForm.fat_mass) payload.fatMassKg = parseFloat(editForm.fat_mass);
      if (editForm.skeletal_muscle_mass)
        payload.skeletalMuscleMassKg = parseFloat(
          editForm.skeletal_muscle_mass,
        );
      if (editForm.sum_of_skinfold)
        payload.sumOf8Skinfold = parseFloat(editForm.sum_of_skinfold);
      if (editForm.target_weight)
        payload.targetWeightKg = parseFloat(editForm.target_weight);
      if (editForm.mothers_height)
        payload.motherHeightCm = parseFloat(editForm.mothers_height);
      if (editForm.fathers_height)
        payload.fatherHeightCm = parseFloat(editForm.fathers_height);
      if (editForm.bmi_category) payload.bmiCategory = editForm.bmi_category;
      if (editForm.athlete_potential_adult_height)
        payload.athletePotentialAdultHeightCm = parseInt(editForm.athlete_potential_adult_height, 10);
      if (editForm.date_recorded) payload.dateRecorded = editForm.date_recorded;
      if (editForm.measured_by) payload.measuredBy = editForm.measured_by;

      const response = await fetch(
        `${BACKEND_URL}/api/Consultation/sessions/${targetId}/anthropometry`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorBody = await response.json();
          errorMessage = errorBody.message ?? errorBody.error ?? errorMessage;
          if (errorBody.details?.length) {
            errorMessage += `: ${errorBody.details.map((d: { field?: string; message: string }) => d.field ? `${d.field} – ${d.message}` : d.message).join(", ")}`;
          }
        } catch {
          // ignore JSON parse error, keep generic message
        }
        throw new Error(errorMessage);
      }

      setIsEditing(false);
      setIsSaved(true);
      if (!isNewConsultation) {
        fetchAnthropometry();
      }
    } catch (err) {
      console.error("Error saving anthropometry:", err);
      setSaveError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSaveError("");
    // Reset form to fetched data
    if (anthropometryData) {
      setEditForm({
        height: anthropometryData.height?.toString() ?? "",
        weight: anthropometryData.weight?.toString() ?? "",
        bmi_category: anthropometryData.bmi_category ?? "",
        fat_mass: anthropometryData.fat_mass?.toString() ?? "",
        skeletal_muscle_mass:
          anthropometryData.skeletal_muscle_mass?.toString() ?? "",
        sum_of_skinfold: anthropometryData.sum_of_skinfold?.toString() ?? "",
        target_weight: anthropometryData.target_weight?.toString() ?? "",
        mothers_height: anthropometryData.mothers_height?.toString() ?? "",
        fathers_height: anthropometryData.fathers_height?.toString() ?? "",
        athlete_potential_adult_height: anthropometryData.athlete_potential_adult_height?.toString() ?? "",
        date_recorded: anthropometryData.date_recorded
          ? new Date(anthropometryData.date_recorded)
              .toISOString()
              .split("T")[0]
          : "",
        measured_by: anthropometryData.measured_by ?? "",
      });
    } else {
      setEditForm(emptyForm);
    }
  };

  const updateField = (field: keyof EditForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <section id="anthropometry" className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="anthropometry" className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchAnthropometry}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  // Edit mode layout
  if (effectiveEditing && sessionTab !== "previous") {
    return (
      <section id="anthropometry" className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Anthropometry</h2>
            <ConsultationCardLastUpdated
              lastUpdatedAt={anthropometryData?.lastUpdatedAt}
              lastUpdatedBy={anthropometryData?.lastUpdatedBy}
            />
          </div>
        </div>

        {prevSessionId && (
          <div className="flex border-b border-gray-200 mb-6">
            {(["current", "previous"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSessionTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  sessionTab === tab
                    ? "border-gray-800 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "current" ? "Current Session" : "Previous Session"}
              </button>
            ))}
          </div>
        )}

        {saveError && <p className="text-red-600 text-sm mb-4">{saveError}</p>}

        <div className="space-y-3 text-sm">
          {/* Editable inputs */}
          {(
            [
              {
                label: "Height (cm)",
                field: "height" as const,
                type: "number",
              },
              {
                label: "Weight (kg)",
                field: "weight" as const,
                type: "number",
              },
            ] as { label: string; field: keyof EditForm; type: string }[]
          ).map(({ label, field, type }) => (
            <div
              key={field}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-gray-600 w-56 flex-shrink-0">{label}:</span>
              <input
                type={type}
                value={editForm[field] ?? ""}
                onChange={(e) => updateField(field, e.target.value)}
                placeholder="—"
                style={{ color: editForm[field] ? "#111827" : undefined }}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm text-right placeholder-gray-300"
              />
            </div>
          ))}

          {/* BMI Category dropdown */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-600 w-56 flex-shrink-0">BMI Category:</span>
            <select
              value={editForm.bmi_category}
              onChange={(e) => updateField("bmi_category", e.target.value)}
              style={{ color: editForm.bmi_category ? "#111827" : "#9CA3AF" }}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="">— Select —</option>
              <option value="Normal">Normal</option>
              <option value="Underweight">Underweight</option>
              <option value="Overweight">Overweight</option>
            </select>
          </div>

          {([
              {
                label: "Fat Mass (kg)",
                field: "fat_mass" as const,
                type: "number",
              },
              {
                label: "Skeletal Muscle Mass (kg)",
                field: "skeletal_muscle_mass" as const,
                type: "number",
              },
              {
                label: "Sum of 8 Skinfold (mm)",
                field: "sum_of_skinfold" as const,
                type: "number",
              },
              {
                label: "Target Weight (kg)",
                field: "target_weight" as const,
                type: "number",
              },
              {
                label: "Mother's Height (cm)",
                field: "mothers_height" as const,
                type: "number",
              },
              {
                label: "Father's Height (cm)",
                field: "fathers_height" as const,
                type: "number",
              },
              {
                label: "Athlete's Potential Adult Height (cm)",
                field: "athlete_potential_adult_height" as const,
                type: "number",
              },
            ] as { label: string; field: keyof EditForm; type: string }[]
          ).map(({ label, field, type }) => (
            <div
              key={field}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-gray-600 w-56 flex-shrink-0">{label}:</span>
              <input
                type={type}
                value={editForm[field] ?? ""}
                onChange={(e) => updateField(field, e.target.value)}
                placeholder="—"
                style={{ color: editForm[field] ? "#111827" : undefined }}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm text-right placeholder-gray-300"
              />
            </div>
          ))}

          {/* Calculated (greyed) fields */}
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <p className="text-xs text-gray-400 mb-2">
              Auto-calculated (read-only)
            </p>
            {[
              { label: "BMI", value: calcedBMI },
              {
                label: "Fat Mass (%)",
                value: calcedFatMassPercent ? `${calcedFatMassPercent}%` : "",
              },
              {
                label: "Skeletal Muscle Mass (%)",
                value: calcedSMMPercent ? `${calcedSMMPercent}%` : "",
              },
              { label: "Target BMI", value: calcedTargetBMI },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4"
              >
                <span className="text-gray-500 w-56 flex-shrink-0">
                  {label}:
                </span>
                <div className="flex-1 px-2 py-1 bg-gray-100 border border-gray-200 rounded text-sm text-right text-gray-500">
                  {value || "—"}
                </div>
              </div>
            ))}
          </div>

          {/* BMI Chart buttons */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">BMI Reference Charts</p>
            <div className="flex gap-2">
              <button
                onClick={() => setBmiLightbox("/consultation/bmi-chart-male.png")}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
              >
                Male BMI Chart
              </button>
              <button
                onClick={() => setBmiLightbox("/consultation/bmi-chart-female.png")}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
              >
                Female BMI Chart
              </button>
            </div>
          </div>

          {/* Measurement details */}
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600 w-56 flex-shrink-0">
                Date Recorded:
              </span>
              <input
                type="date"
                value={editForm.date_recorded}
                onChange={(e) => updateField("date_recorded", e.target.value)}
                style={{
                  color: editForm.date_recorded ? "#111827" : undefined,
                }}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600 w-56 flex-shrink-0">
                Measured By:
              </span>
              <input
                type="text"
                value={editForm.measured_by}
                onChange={(e) => updateField("measured_by", e.target.value)}
                placeholder="Name"
                style={{ color: editForm.measured_by ? "#111827" : undefined }}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-gray-100">3
          {!isNewConsultation && (
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => {
              setAnthropometryData(null);
              setEditForm(emptyForm);
              setIsSaved(false);
              setSaveError("");
            }}
            className="px-3 py-1 bg-red-50 text-red-600 text-sm rounded border border-red-200 hover:bg-red-100"
          >
            Clear All
          </button>
          <button
            onClick={handleSave}
            className={`px-3 py-1 text-white text-sm rounded ${isSaved ? "bg-green-600 hover:bg-green-700" : "bg-gray-800 hover:bg-gray-700"}`}
          >
            {isSaved ? "Draft Saved" : "Save"}
          </button>
        </div>

        {bmiLightbox && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            onClick={() => setBmiLightbox(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setBmiLightbox(null)}
                className="absolute top-2 right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center text-gray-700 hover:bg-gray-100 text-lg font-bold shadow"
              >
                ×
              </button>
              <Image
                src={bmiLightbox}
                alt="BMI Chart"
                width={900}
                height={1200}
                className="rounded-lg max-h-[85vh] w-auto object-contain"
              />
            </div>
          </div>
        )}
      </section>
    );
  }

  // Read-only view
  const displayData = sessionTab === "previous" ? prevData : anthropometryData;

  const AnthroField = ({ label, value, suffix, span2 }: { label: string; value: string | number | null | undefined; suffix?: string; span2?: boolean }) => {
    return (
      <div className={`flex justify-between items-start${span2 ? " col-span-2" : ""}`}>
        <span className="text-gray-600 text-sm">{label}:</span>
        <div className="text-right">
          <span className="font-medium text-gray-900 text-sm">
            {value != null ? `${value}${suffix ? ` ${suffix}` : ""}` : "N/A"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <section id="anthropometry" className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Anthropometry</h2>
          <ConsultationCardLastUpdated
            lastUpdatedAt={anthropometryData?.lastUpdatedAt}
            lastUpdatedBy={anthropometryData?.lastUpdatedBy}
          />
        </div>
        {!readOnly && dataTab === "anthropometry" && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700"
          >
            Add Anthropometry Data
          </button>
        )}
        {!readOnly && dataTab === "adex" && !showAdexForm && (
          <button
            onClick={() => setShowAdexForm(true)}
            className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700"
          >
            Add ADEX Anthropometry Data
          </button>
        )}
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        {(["anthropometry", "adex", "bia"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setDataTab(tab);
              setShowAdexForm(false);
              closeDetail();
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              dataTab === tab
                ? "border-gray-800 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "anthropometry"
              ? "Anthropometry"
              : tab === "adex"
                ? "ADEX Anthropometry Data"
                : "BIA Measurement"}
          </button>
        ))}
      </div>

      {dataTab === "bia" ? (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
            <div className="flex flex-col items-center gap-3">
              <h3 className="font-medium text-gray-900">Athlete QR Code</h3>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <QRCode
                  value={athleteId}
                  size={190}
                  bgColor="#ffffff"
                  fgColor="#111827"
                  qrStyle="squares"
                  eyeRadius={6}
                />
              </div>
              <code className="max-w-full break-all text-center text-xs text-gray-500">
                {athleteId}
              </code>
              <p className="text-center text-sm text-gray-500">
                Scan this code on the BIA device to record a measurement for this athlete.
              </p>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium text-gray-900">BIA Measurements</h3>
              <button
                onClick={fetchBiaMeasurements}
                disabled={biaLoading}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {biaLoading ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {biaError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {biaError}
              </div>
            ) : biaLoading ? (
              <div className="py-8 text-center text-sm text-gray-500">Loading BIA measurements…</div>
            ) : biaMeasurements.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center">
                <p className="text-sm font-medium text-gray-900">No BIA measurements</p>
                <p className="mt-1 text-sm text-gray-500">
                  Scan the athlete QR code to record the first measurement.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Date and time</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Weight</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Height</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">BMI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {biaMeasurements.map((measurement, index) => (
                      <tr
                        key={measurement.pk_bia_measurement_uuid || index}
                        tabIndex={0}
                        role="button"
                        onClick={() => openBiaDetail(measurement)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            openBiaDetail(measurement);
                          }
                        }}
                        className="cursor-pointer transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-gray-900">
                          {measurement.measurement_date
                            ? new Date(measurement.measurement_date).toLocaleString("en-SG", {
                                timeZone: "Asia/Singapore",
                              })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{formatBiaValue(measurement.weight)}</td>
                        <td className="px-4 py-3 text-gray-700">{formatBiaValue(measurement.height)}</td>
                        <td className="px-4 py-3 text-gray-700">{formatBiaValue(measurement.bmi)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : dataTab === "adex" ? (
        showAdexForm ? (
          <AdexAnthropometryForm
            athleteId={athleteId}
            onCancel={() => setShowAdexForm(false)}
            onSaved={async () => {
              setShowAdexForm(false);
              await fetchAdexAnthropometries();
            }}
          />
        ) : (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">ADEX Anthropometry Data</h3>
              <p className="mt-1 text-sm text-gray-500">Select a row to view all measurements.</p>
            </div>
            <button
              onClick={fetchAdexAnthropometries}
              disabled={adexLoading}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {adexLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {adexError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {adexError}
            </div>
          ) : adexLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading ADEX anthropometry data…</div>
          ) : adexAnthropometries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center">
              <p className="text-sm font-medium text-gray-900">No ADEX anthropometry data</p>
              <p className="mt-1 text-sm text-gray-500">No profiling records exist for this athlete.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Test date and time</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Body fat — Huang 2023</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Body fat — Durnin &amp; Womersley</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {adexAnthropometries.map((record) => (
                    <tr
                      key={record.pk_anthropometry_uuid}
                      tabIndex={0}
                      role="button"
                      onClick={() => openAdexAnthropometryDetail(record)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          openAdexAnthropometryDetail(record);
                        }
                      }}
                      className="cursor-pointer transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-gray-900">
                        {record.date_of_test ? new Date(record.date_of_test).toLocaleDateString("en-SG") : "—"}{" "}
                        {record.time_of_test || ""}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{record.huang_2023 ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{record.durnin_womersley ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )
      ) : (
        <>
          {/* Current/previous consultation data */}
          {prevSessionId && (
        <div className="flex border-b border-gray-200 mb-6">
          {(["current", "previous"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSessionTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                sessionTab === tab
                  ? "border-gray-800 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "current" ? "Current Session" : "Previous Session"}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {!displayData ? (
          <div className="text-center py-8">
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {sessionTab === "previous" ? "No previous session data" : "No anthropometry data"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {sessionTab === "previous"
                ? "No measurements were recorded for the previous session."
                : "No measurements have been recorded for this consultation session."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <AnthroField label="Height" value={displayData?.height} suffix="cm" />
              <AnthroField label="Weight" value={displayData?.weight} suffix="kg" />
              <AnthroField label="BMI" value={displayData?.bmi} />
              <AnthroField label="BMI Category" value={displayData?.bmi_category} />
              <div className="col-span-2 flex gap-2">
                <button
                  onClick={() => setBmiLightbox("/consultation/bmi-chart-male.png")}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
                >
                  Male BMI Chart
                </button>
                <button
                  onClick={() => setBmiLightbox("/consultation/bmi-chart-female.png")}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
                >
                  Female BMI Chart
                </button>
              </div>
              <AnthroField label="Fat Mass" value={displayData?.fat_mass} suffix="kg" />
              <AnthroField label="Fat Mass (%)" value={displayData?.fat_mass_percentage} suffix="%" />
              <AnthroField label="Skeletal Muscle Mass" value={displayData?.skeletal_muscle_mass} suffix="kg" />
              <AnthroField label="Skeletal Muscle Mass (%)" value={displayData?.skeletal_muscle_mass_percentage} suffix="%" />
              <AnthroField label="Sum of 8 Skinfold" value={displayData?.sum_of_skinfold} suffix="mm" />
              <AnthroField label="Target Weight" value={displayData?.target_weight} suffix="kg" />
              <AnthroField label="Target BMI" value={displayData?.target_bmi} />
              <AnthroField label="Mother's Height" value={displayData?.mothers_height} suffix="cm" />
              <AnthroField label="Father's Height" value={displayData?.fathers_height} suffix="cm" />
              <AnthroField label="Athlete's Potential Adult Height" value={displayData?.athlete_potential_adult_height} suffix="cm" span2 />
            </div>

            {/* Measurement Details */}
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <AnthroField label="Date Recorded" value={displayData?.date_recorded ? new Date(displayData.date_recorded).toLocaleDateString() : null} />
                <AnthroField label="Measured By" value={displayData?.measured_by} />
              </div>
              {displayData?.measurement_notes && (
                <div className="mt-3">
                  <span className="text-gray-600 text-sm">Notes:</span>
                  <p className="text-gray-900 text-sm mt-1">{displayData.measurement_notes}</p>
                </div>
              )}
            </div>
          </>
        )}
          </div>
        </>
      )}

      {(selectedBia || selectedAdexAnthropometry || detailLoading || detailError) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeDetail}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selectedBia ? "BIA measurement details" : "ADEX anthropometry details"}
            className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-4 border-b border-gray-200 pb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedBia ? "BIA Measurement Details" : "ADEX Anthropometry Details"}
                </h3>
                {selectedBia?.measurement_date && (
                  <p className="mt-1 text-sm text-gray-500">
                    {new Date(selectedBia.measurement_date).toLocaleString("en-SG", {
                      timeZone: "Asia/Singapore",
                    })}
                  </p>
                )}
                {selectedAdexAnthropometry && (
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedAdexAnthropometry.date_of_test
                      ? new Date(selectedAdexAnthropometry.date_of_test).toLocaleDateString("en-SG")
                      : "Date unavailable"}{" "}
                    {selectedAdexAnthropometry.time_of_test || ""}
                  </p>
                )}
              </div>
              <button
                onClick={closeDetail}
                aria-label="Close details"
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                ×
              </button>
            </div>

            {detailLoading && (
              <div className="py-12 text-center text-sm text-gray-500">Loading measurement details…</div>
            )}

            {detailError && !detailLoading && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {detailError}
              </div>
            )}

            {selectedBia && !detailLoading && (
              <BiaMeasurementDashboard data={selectedBia} trendData={biaMeasurements} />
            )}

            {selectedAdexAnthropometry && !detailLoading && (
              <div>
                <div className="mb-5 grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    ["Tester", selectedAdexAnthropometry.by],
                    ["Caliper Set", selectedAdexAnthropometry.caliper_set],
                    ["Gender", selectedAdexAnthropometry.gender],
                    ["Height", selectedAdexAnthropometry.height != null ? `${selectedAdexAnthropometry.height} cm` : null],
                    ["Weight", selectedAdexAnthropometry.weight != null ? `${selectedAdexAnthropometry.weight} kg` : null],
                  ].map(([label, value]) => (
                    <div key={String(label)}>
                      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
                      <div className="mt-1 font-medium text-gray-900">{value || "—"}</div>
                    </div>
                  ))}
                </div>

                <AdexMeasurementTable
                  title="Skinfold Measurements"
                  data={selectedAdexAnthropometry.skinfoldTable}
                />
                <AdexMeasurementTable
                  title="Circumference Measurements"
                  data={selectedAdexAnthropometry.circumTable}
                />

                {selectedAdexAnthropometry.calculatedData && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h4 className="mb-3 font-semibold text-gray-900">Calculated Data</h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(selectedAdexAnthropometry.calculatedData).map(([field, value]) => (
                        <div key={field}>
                          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            {humanizeField(field)}
                          </div>
                          <div className="mt-1 font-medium text-gray-900">{formatDetailValue(value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {bmiLightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setBmiLightbox(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setBmiLightbox(null)}
              className="absolute top-2 right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center text-gray-700 hover:bg-gray-100 text-lg font-bold shadow"
            >
              ×
            </button>
            <Image
              src={bmiLightbox}
              alt="BMI Chart"
              width={900}
              height={1200}
              className="rounded-lg max-h-[85vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
