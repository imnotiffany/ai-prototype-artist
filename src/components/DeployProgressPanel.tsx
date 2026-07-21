import { useEffect, useState } from "react";
import { Loader2, Check, Rocket, Save, X, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const steps = mode === "publish" ? STEPS_PUBLISH : STEPS_SAVE;
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState<"running" | "reminder">("running");

  useEffect(() => {
    if (phase !== "running") return;
    if (current >= steps.length) {
      if (mode === "save") {
        // stay as reminder until user acts
        setPhase("reminder");
        const t = window.setTimeout(() => onDone(), 6000);
        return () => window.clearTimeout(t);
      }
      const t = window.setTimeout(onDone, 600);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setCurrent((c) => c + 1), stepMs);
    return () => window.clearTimeout(t);
  }, [current, steps.length, stepMs, onDone, mode, phase]);

  // Post-save reminder
  if (phase === "reminder") {
    return (
      <div className="mb-3 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20 px-3 py-2 animate-fade-in">
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <div className="flex-1 min-w-0 text-xs">
          <span className="font-medium text-amber-900 dark:text-amber-200">已保存为草稿</span>
          <span className="text-amber-700/80 dark:text-amber-300/80 ml-2">
            当前变更仅对你可见，用户仍在使用上一发布版本 —— 点击「发布」后才会正式生效
          </span>
        </div>
        {onPublishClick && (
          <Button
            size="sm"
            className="h-7 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1"
            onClick={() => {
              onPublishClick();
              onDone();
            }}
          >
            立即发布 <ArrowRight className="w-3 h-3" />
          </Button>
        )}
        <button
          onClick={onDone}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-300"
          aria-label="关闭"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const isPublish = mode === "publish";
  const done = current >= steps.length;
  const currentLabel = done ? steps[steps.length - 1] : steps[current];

  // Running: slim single-line bar
  return (
    <div
      className={cn(
        "mb-3 flex items-center gap-3 rounded-lg border px-3 py-2 animate-fade-in",
        isPublish
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-muted/40",
      )}
    >
      <div
        className={cn(
          "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
          isPublish ? "bg-primary/15 text-primary" : "bg-foreground/10 text-foreground/70",
        )}
      >
        {done ? (
          <Check className="w-3.5 h-3.5" />
        ) : isPublish ? (
          <Rocket className="w-3.5 h-3.5" />
        ) : (
          <Save className="w-3.5 h-3.5" />
        )}
      </div>

      <div className="flex items-center gap-2 text-xs min-w-0 flex-1">
        <span className={cn("font-medium shrink-0", isPublish ? "text-primary" : "text-foreground")}>
          {isPublish ? "正在发布新版本" : "正在保存草稿"}
        </span>
        <span className="text-muted-foreground shrink-0">·</span>
        <span className="text-muted-foreground truncate flex items-center gap-1.5">
          {!done && <Loader2 className="w-3 h-3 animate-spin" />}
          {currentLabel}
          <span className="text-[10px] tabular-nums opacity-70">
            ({Math.min(current + 1, steps.length)}/{steps.length})
          </span>
        </span>
      </div>

      {/* Segmented progress */}
      <div className="flex items-center gap-1 shrink-0">
        {steps.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 rounded-full transition-all",
              i < current
                ? isPublish
                  ? "w-4 bg-primary"
                  : "w-4 bg-foreground/60"
                : i === current
                  ? isPublish
                    ? "w-6 bg-primary/60 animate-pulse"
                    : "w-6 bg-foreground/40 animate-pulse"
                  : "w-4 bg-border",
            )}
          />
        ))}
      </div>

      {isPublish && (
        <span className="text-[10px] text-muted-foreground shrink-0 hidden md:inline">
          预计 1-5 分钟
        </span>
      )}
    </div>
  );
};
