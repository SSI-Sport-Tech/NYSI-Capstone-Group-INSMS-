"use client";

import { Check, Eye, Menu, Pencil, X } from "lucide-react";
import { STEPS, type StepStatus } from "./consultationViewTypes";

function StepIcon({ stepId, status }: { stepId: number; status: StepStatus }) {
  if (status === "saved") {
    return (
      <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shrink-0">
        <Check className="w-3.5 h-3.5 text-white" />
      </div>
    );
  }
  if (status === "dirty") {
    return (
      <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
        <Pencil className="w-3.5 h-3.5 text-white" />
      </div>
    );
  }
  if (status === "viewing") {
    return (
      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
        <Eye className="w-3.5 h-3.5 text-white" />
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
      <span className="text-gray-500 text-xs font-medium">{stepId}</span>
    </div>
  );
}

interface ConsultationStepSidebarProps {
  currentStep: number;
  sidebarCollapsed: boolean;
  onStepChange: (stepId: number) => void;
  onToggleCollapsed: () => void;
  statuses: Record<number, StepStatus>;
}

export default function ConsultationStepSidebar({
  currentStep,
  sidebarCollapsed,
  onStepChange,
  onToggleCollapsed,
  statuses,
}: ConsultationStepSidebarProps) {
  return (
    <div
      className={`shrink-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-200 ${
        sidebarCollapsed ? "w-14" : "w-60"
      }`}
    >
      <div className="flex items-center justify-end px-3 py-4 border-b border-gray-100">
        <button
          onClick={onToggleCollapsed}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 shrink-0"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {STEPS.map((step) => {
          const isActive = step.id === currentStep;
          const status = statuses[step.id] ?? "default";
          return (
            <button
              key={step.id}
              onClick={() => onStepChange(step.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
              }`}
              title={sidebarCollapsed ? step.label : undefined}
            >
              <StepIcon stepId={step.id} status={status} />
              {!sidebarCollapsed && (
                <span className={`text-sm ${isActive ? "font-semibold" : "font-medium"}`}>
                  {step.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
