import { useState } from "react";
import {
  ChevronRight,
  Check,
  X,
  Loader2,
  Plug,
  Sparkles,
  Bot,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ToolCallKind = "mcp" | "skill" | "subagent" | "search";
export type ToolCallStatus = "running" | "success" | "failed";

export interface ToolStep {
  label: string;
  detail?: string;
  ms?: number;
  status?: "done" | "running" | "failed";
}

export interface ToolParam {
  key: string;
  value: string;
}

export interface ToolResultItem {
  title: string;
  meta?: string;
}

export interface ToolCall {
  id: string;
  kind: ToolCallKind;
  name: string;
  summary: string;
  status: ToolCallStatus;
  provider?: string;
  endpoint?: string;
  params?: ToolParam[];
  steps?: ToolStep[];
  resultItems?: ToolResultItem[];
  resultSummary?: string;
  input?: string;
  output?: string;
  error?: string;
}

const iconFor = (kind: ToolCallKind) => {
  switch (kind) {
    case "mcp": return Plug;
    case "skill": return Sparkles;
    case "subagent": return Bot;
    case "search": return Search;
  }
};

const totalMs = (call: ToolCall): number | undefined => {
  if (!call.steps || call.steps.length === 0) return undefined;
  const sum = call.steps.reduce((a, s) => a + (s.ms ?? 0), 0);
  return sum > 0 ? sum : undefined;
};

/** 把 params 压缩成 codex 风格的一行参数： key=value, key=value */
const inlineArgs = (call: ToolCall): string => {
  if (call.params && call.params.length) {
    return call.params
      .map((p) => {
        const v = p.value.length > 24 ? p.value.slice(0, 24) + "…" : p.value;
        return `${p.key}=${v}`;
      })
      .join(", ");
  }
  if (call.input) {
    return call.input.length > 60 ? call.input.slice(0, 60) + "…" : call.input;
  }
  return "";
};

const Row = ({ call, isLast }: { call: ToolCall; isLast: boolean }) => {
  const [open, setOpen] = useState(false);
  const Icon = iconFor(call.kind);
  const isError = call.status === "failed";
  const isRunning = call.status === "running";
  const canExpand =
    !isRunning &&
    (!!call.params?.length ||
      !!call.input ||
      !!call.resultItems?.length ||
      !!call.output ||
      !!call.error);
  const ms = totalMs(call);
  const args = inlineArgs(call);

  return (
    <div className="relative">
      {/* 左侧引导线节点 */}
      <span
        className={cn(
          "absolute left-0 top-[10px] w-2 h-px",
          isError ? "bg-destructive/50" : "bg-border",
        )}
      />
      <div className={cn("pl-4", !isLast && "pb-1")}>
        <button
          type="button"
          disabled={!canExpand}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "group w-full flex items-center gap-2 py-0.5 px-1 -mx-1 rounded text-left font-mono text-[12px] leading-5",
            "transition-colors",
            canExpand && "hover:bg-muted/50 cursor-pointer",
            !canExpand && "cursor-default",
          )}
        >
          <ChevronRight
            className={cn(
              "w-3 h-3 text-muted-foreground/60 transition-transform shrink-0",
              open && "rotate-90",
              !canExpand && "invisible",
            )}
          />
          <Icon
            className={cn(
              "w-3.5 h-3.5 shrink-0",
              isError ? "text-destructive" : "text-muted-foreground",
            )}
          />
          <span
            className={cn(
              "shrink-0 font-medium",
              isError ? "text-destructive" : "text-foreground/90",
            )}
          >
            {call.name}
          </span>
          {args && (
            <span className="text-muted-foreground/80 truncate">
              <span className="text-muted-foreground/50">(</span>
              {args}
              <span className="text-muted-foreground/50">)</span>
            </span>
          )}
          <span className="ml-auto shrink-0 flex items-center gap-1.5 pl-2">
            {isRunning && (
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            )}
            {call.status === "success" && (
              <>
                {ms != null && (
                  <span className="text-[10px] text-muted-foreground/70 tabular-nums">
                    {ms}ms
                  </span>
                )}
                <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2.5} />
              </>
            )}
            {isError && (
              <>
                <span className="text-[10px] text-destructive/80 max-w-[140px] truncate">
                  {(call.error ?? "失败").split("\n")[0]}
                </span>
                <X className="w-3.5 h-3.5 text-destructive" strokeWidth={2.5} />
              </>
            )}
          </span>
        </button>

        {open && canExpand && (
          <div className="mt-1 ml-5 space-y-2 text-[11px] font-mono">
            {/* 参数 */}
            {call.params && call.params.length > 0 ? (
              <div className="rounded-sm bg-muted/40 border border-border/40 px-2 py-1.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-1">
                  args
                </div>
                {call.params.map((p, i) => (
                  <div key={i} className="flex gap-2 leading-5">
                    <span className="text-muted-foreground shrink-0">{p.key}</span>
                    <span className="text-muted-foreground/40">=</span>
                    <span className="text-foreground/90 break-all">{p.value}</span>
                  </div>
                ))}
              </div>
            ) : call.input ? (
              <pre className="rounded-sm bg-muted/40 border border-border/40 px-2 py-1.5 whitespace-pre-wrap text-foreground/80 leading-5">
                {call.input}
              </pre>
            ) : null}

            {/* 结果 */}
            {call.resultItems && call.resultItems.length > 0 ? (
              <div className="rounded-sm bg-muted/30 border border-border/40 px-2 py-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    output
                  </span>
                  {call.resultSummary && (
                    <span className="text-[10px] text-muted-foreground/70">
                      {call.resultSummary}
                    </span>
                  )}
                </div>
                <ul className="space-y-0.5">
                  {call.resultItems.map((r, i) => (
                    <li key={i} className="flex items-baseline gap-2 leading-5">
                      <span className="text-muted-foreground/50 shrink-0">→</span>
                      <span className="text-foreground/90 flex-1 truncate">
                        {r.title}
                      </span>
                      {r.meta && (
                        <span className="text-[10px] text-muted-foreground/70 shrink-0">
                          {r.meta}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : call.output ? (
              <pre className="rounded-sm bg-muted/30 border border-border/40 px-2 py-1.5 whitespace-pre-wrap text-foreground/80 leading-5 max-h-64 overflow-auto">
                {call.output}
              </pre>
            ) : null}

            {/* 错误 */}
            {call.error && (
              <pre className="rounded-sm bg-destructive/5 border border-destructive/20 text-destructive px-2 py-1.5 whitespace-pre-wrap leading-5">
                {call.error}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/** 多个工具调用：codex 风格 —— 左侧细引导线串联 */
export const ToolCallGroup = ({ calls }: { calls: ToolCall[] }) => {
  if (calls.length === 0) return null;
  return (
    <div className="relative pl-0">
      {/* 垂直引导线 */}
      <span className="absolute left-0 top-2 bottom-2 w-px bg-border" />
      <div className="space-y-0">
        {calls.map((c, i) => (
          <Row key={c.id} call={c} isLast={i === calls.length - 1} />
        ))}
      </div>
    </div>
  );
};

export const ToolCallCard = ({ call }: { call: ToolCall }) => (
  <ToolCallGroup calls={[call]} />
);
