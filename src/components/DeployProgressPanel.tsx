import { useEffect, useState } from "react";
import { Check, Rocket, Save, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type DeployMode = "save" | "publish";

const STEPS = ["创建任务", "部署环境", "等待就绪", "加载智能体", "完成"];

interface Props {
  mode: DeployMode;
  onDone: () => void;
  onPublishClick?: () => void;
  stepMs?: number;
}

export const DeployProgressPanel = ({ mode, onDone, onPublishClick, stepMs = 700 }: Props) => {
  const steps = STEPS;
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState<"running" | "reminder">("running");

  useEffect(() => {
    if (phase !== "running") return;
    if (current >= steps.length) {
      if (mode === "save") {
        setPhase("reminder");
        const t = window.setTimeout(() => onDone(), 8000);
        return () => window.clearTimeout(t);
      }
      const t = window.setTimeout(onDone, 600);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setCurrent((c) => c + 1), stepMs);
    return () => window.clearTimeout(t);
  }, [current, steps.length, stepMs, onDone, mode, phase]);

  // ── Post-save reminder ─────────────────────────────────────────
  if (phase === "reminder") {
    return (
      <div className="mb-3 h-9 flex items-center gap-2.5 rounded-md border border-amber-200/70 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20 pl-3 pr-1.5 animate-fade-in">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500/60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
        </span>
        <span className="text-xs text-amber-900 dark:text-amber-200 truncate">
          <span className="font-medium">已保存为草稿</span>
          <span className="text-amber-700/80 dark:text-amber-300/80">
            ，若需在智能体广场或丰声NEXT内生效，请点击右上角「发布」
          </span>
        </span>
        <div className="flex-1" />
        {onPublishClick && (
          <button
            onClick={() => {
              onPublishClick();
              onDone();
            }}
            className="h-6 inline-flex items-center gap-1 rounded px-2 text-xs font-medium text-amber-900 dark:text-amber-100 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 transition-colors"
          >
            立即发布 <ArrowRight className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={onDone}
          className="w-6 h-6 flex items-center justify-center rounded text-amber-700/70 dark:text-amber-300/70 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 transition-colors"
          aria-label="关闭"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const isPublish = mode === "publish";
  const done = current >= steps.length;
  const stepIdx = Math.min(current, steps.length - 1);
  const currentLabel = done ? "完成" : steps[stepIdx];
  const shown = done ? steps.length : current + 1;

  // ── Running: slim single-line bar ──────────────────────────────
  return (
    <div
      className={cn(
        "mb-3 h-9 flex items-center gap-3 rounded-md border pl-2.5 pr-3 animate-fade-in",
        isPublish
          ? "border-primary/25 bg-primary/[0.04]"
          : "border-border bg-muted/40",
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-5 h-5 rounded flex items-center justify-center shrink-0",
          done
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : isPublish
              ? "bg-primary/15 text-primary"
              : "bg-foreground/10 text-foreground/70",
        )}
      >
        {done ? (
          <Check className="w-3 h-3" strokeWidth={2.5} />
        ) : isPublish ? (
          <Rocket className="w-3 h-3" />
        ) : (
          <Save className="w-3 h-3" />
        )}
      </div>

      {/* Label + step counter */}
      <div className="flex items-baseline gap-1.5 text-xs min-w-0">
        <span className={cn("font-medium shrink-0", isPublish ? "text-primary" : "text-foreground")}>
          {isPublish ? "发布中" : "保存中"}
        </span>
        <span className="text-muted-foreground truncate">{currentLabel}</span>
        <span className="text-[10px] tabular-nums text-muted-foreground/70 shrink-0">
          {shown}/{steps.length}
        </span>
      </div>

      <div className="flex-1" />

      {/* Segmented progress */}
      <div className="flex items-center gap-1 shrink-0">
        {steps.map((_, i) => {
          const filled = i < current || done;
          const active = i === current && !done;
          return (
            <span
              key={i}
              className={cn(
                "h-[3px] rounded-full transition-all duration-300",
                active ? "w-5" : "w-3",
                filled
                  ? isPublish
                    ? "bg-primary"
                    : "bg-foreground/60"
                  : active
                    ? isPublish
                      ? "bg-primary/50 animate-pulse"
                      : "bg-foreground/40 animate-pulse"
                    : "bg-border",
              )}
            />
          );
        })}
      </div>
    </div>
  );
};
