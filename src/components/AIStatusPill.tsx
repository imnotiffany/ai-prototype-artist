import { useEffect, useState } from "react";

interface Props {
  /** 当前阶段索引；不传则按时间自动推进 */
  stageIndex?: number;
  stages?: string[];
  /** 起始时间；不传则使用挂载时刻 */
  startedAt?: number;
}

const defaultStages = ["分析需求", "匹配 MCP / Skill", "生成配置"];

const formatElapsed = (ms: number) => {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`;
};

export const AIStatusPill = ({ stageIndex, stages = defaultStages, startedAt }: Props) => {
  const [start] = useState(() => startedAt ?? Date.now());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const elapsed = now - start;
  // Auto-advance stage every ~1.5s if not controlled
  const idx = stageIndex ?? Math.min(stages.length - 1, Math.floor(elapsed / 1500));
  const verb = stages[idx] ?? stages[stages.length - 1];

  return (
    <div className="flex w-fit items-center gap-2 rounded-full border border-border/40 bg-muted/50 px-3 py-1 animate-fade-in">
      <span className="animate-shimmer text-primary text-xs leading-none">✦</span>
      <span className="text-xs font-medium text-muted-foreground">{verb}...</span>
      <span className="text-[10px] text-muted-foreground/60 tabular-nums">{formatElapsed(elapsed)}</span>
    </div>
  );
};
