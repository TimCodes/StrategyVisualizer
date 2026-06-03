import { CheckCircle2, XCircle, MinusCircle, Circle, ChevronRight } from "lucide-react";
import type { Strategy, PipelineStage } from "@shared/schema";
import { PIPELINE_STAGES } from "@shared/schema";

export const STAGE_LABELS: Record<PipelineStage, string> = {
  idea: "Idea",
  feasibility: "Feasibility",
  walk_forward: "Walk-Forward",
  monte_carlo: "Monte Carlo",
  incubation: "Incubation",
  diversification_sizing: "Div. & Sizing",
  live: "Live",
};

type StageStatus =
  | "passed"
  | "failed"
  | "discarded"
  | "active_in_progress"
  | "active_passed"
  | "active_failed"
  | "active_discarded"
  | "upcoming";

function computeStatuses(strategy: Strategy): StageStatus[] {
  const currentIdx = PIPELINE_STAGES.indexOf(strategy.stage);
  return PIPELINE_STAGES.map((stage, i) => {
    if (i < currentIdx) {
      const entries = strategy.gateHistory.filter((e) => e.stage === stage);
      const last = entries[entries.length - 1];
      if (!last || last.result === "passed") return "passed";
      if (last.result === "failed") return "failed";
      return "discarded";
    }
    if (i === currentIdx) {
      return `active_${strategy.gateStatus}` as StageStatus;
    }
    return "upcoming";
  });
}

function StepIcon({ status, size = "sm" }: { status: StageStatus; size?: "sm" | "xs" }) {
  const cls = size === "xs" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";
  if (status === "passed" || status === "active_passed")
    return <CheckCircle2 className={`${cls} text-emerald-400 shrink-0`} />;
  if (status === "failed" || status === "active_failed")
    return <XCircle className={`${cls} text-red-400 shrink-0`} />;
  if (status === "discarded" || status === "active_discarded")
    return <MinusCircle className={`${cls} text-slate-500 shrink-0`} />;
  if (status === "active_in_progress")
    return <Circle className={`${cls} text-amber-400 fill-amber-400/40 shrink-0`} />;
  return <Circle className={`${cls} text-border shrink-0`} />;
}

function stepTextClass(status: StageStatus): string {
  if (status === "passed" || status === "active_passed") return "text-emerald-400";
  if (status === "failed" || status === "active_failed") return "text-red-400";
  if (status === "discarded" || status === "active_discarded") return "text-slate-500 line-through";
  if (status === "active_in_progress") return "text-amber-400 font-medium";
  return "text-text-secondary";
}

export function StageStepper({ strategy }: { strategy: Strategy }) {
  const statuses = computeStatuses(strategy);
  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex items-start min-w-max">
        {PIPELINE_STAGES.map((stage, i) => {
          const status = statuses[i];
          const isActive = status.startsWith("active_");
          const isLast = i === PIPELINE_STAGES.length - 1;
          return (
            <div key={stage} className="flex items-start">
              <div
                className={`flex flex-col items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                  isActive ? "bg-surface-raised ring-1 ring-border" : ""
                }`}
              >
                <StepIcon status={status} size="sm" />
                <span
                  className={`text-[10px] leading-tight text-center select-none ${stepTextClass(status)}`}
                  style={{ width: "52px" }}
                >
                  {STAGE_LABELS[stage]}
                </span>
              </div>
              {!isLast && (
                <div className="mt-1.5 shrink-0">
                  <ChevronRight className="h-3 w-3 text-border" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StageStepperCompact({ strategy }: { strategy: Strategy }) {
  const statuses = computeStatuses(strategy);
  return (
    <div className="flex items-center gap-1">
      {PIPELINE_STAGES.map((stage, i) => (
        <StepIcon key={stage} status={statuses[i]} size="xs" />
      ))}
      <span className="text-xs text-text-secondary ml-1 font-medium">
        {STAGE_LABELS[strategy.stage]}
      </span>
    </div>
  );
}
