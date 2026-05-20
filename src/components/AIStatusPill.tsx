import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** 当前阶段索引；不传则按时间自动推进 */
  stageIndex?: number;
  stages?: string[];
  /** 起始时间；不传则使用挂载时刻 */
  startedAt?: number;
  /** 紧凑模式（小尺寸） */
  compact?: boolean;
  className?: string;
}

const defaultStages = ["思考中", "分析需求", "匹配工具", "生成回答"];

const formatElapsed = (ms: number) => {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`;
};

/**
 * Claude 式"思考中"状态条
 * 用作 assistant 消息流末尾的占位指示器
 */
export const AIStatusPill = ({ stageIndex, stages = defaultStages, startedAt, compact = false, className }: Props) => {
  const [start] = useState(() => startedAt ?? Date.now());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const elapsed = now - start;
  const idx = stageIndex ?? Math.min(stages.length - 1, Math.floor(elapsed / 1500));
  const verb = stages[idx] ?? stages[stages.length - 1];

  return (
    <div className={cn("flex items-start gap-2 animate-fade-in", className)}>
      <div
        className={cn(
          "rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0",
          compact ? "w-5 h-5" : "w-6 h-6",
        )}
        aria-hidden
      >
        <Sparkles className={cn("animate-pulse", compact ? "w-2.5 h-2.5" : "w-3 h-3")} />
      </div>
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-secondary/70 backdrop-blur-sm",
          compact ? "px-2.5 py-1" : "px-3 py-1.5",
        )}
        role="status"
        aria-live="polite"
      >
        <span className={cn("font-medium text-foreground/80", compact ? "text-[11px]" : "text-xs")}>
          {verb}
        </span>
        <span className="flex items-center gap-0.5" aria-hidden>
          <span className="w-1 h-1 rounded-full bg-primary/70 animate-thinking-dot [animation-delay:0ms]" />
          <span className="w-1 h-1 rounded-full bg-primary/70 animate-thinking-dot [animation-delay:160ms]" />
          <span className="w-1 h-1 rounded-full bg-primary/70 animate-thinking-dot [animation-delay:320ms]" />
        </span>
        <span className={cn("text-muted-foreground/70 tabular-nums", compact ? "text-[10px]" : "text-[11px]")}>
          {formatElapsed(elapsed)}
        </span>
      </div>
    </div>
  );
};
