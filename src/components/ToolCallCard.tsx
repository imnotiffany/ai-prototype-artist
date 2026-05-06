import { useState } from "react";
import {
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plug,
  Sparkles,
  Bot,
  Search,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ToolCallKind = "mcp" | "skill" | "subagent" | "search";
export type ToolCallStatus = "running" | "success" | "failed";

export interface ToolStep {
  /** 步骤标签：例如 "路由决策" / "建立连接" / "执行" / "解析返回" */
  label: string;
  /** 详细说明，可选 */
  detail?: string;
  /** 耗时（毫秒），可选 */
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
  /** 工具名（如 Skill / MCP 工具的方法名） */
  name: string;
  /** 一行摘要，显示在折叠态 */
  summary: string;
  status: ToolCallStatus;
  /** 所属资源（如 "领慧 MCP · 智水-MCP服务" / "内置 Skill" / "丰景台 Bot"） */
  provider?: string;
  /** 端点或函数标识，如 "mcp.smartwater.query_logs" */
  endpoint?: string;
  /** 入参（结构化展示，优先于 input 字符串） */
  params?: ToolParam[];
  /** 调用过程时间线 */
  steps?: ToolStep[];
  /** 返回结果（结构化条目，优先于 output 字符串） */
  resultItems?: ToolResultItem[];
  /** 返回汇总文案，例如 "返回 3 条结果 · 412ms" */
  resultSummary?: string;
  /** 兜底：旧字段，仍保留以向下兼容 */
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

const kindLabel = (kind: ToolCallKind) => {
  switch (kind) {
    case "mcp": return "MCP 工具";
    case "skill": return "Skill 技能";
    case "subagent": return "子智能体";
    case "search": return "搜索工具";
  }
};

const truncate = (s: string, n = 60) => (s.length > n ? s.slice(0, n) + "…" : s);

const Card = ({ call }: { call: ToolCall }) => {
  const [open, setOpen] = useState(false);
  const Icon = iconFor(call.kind);
  const isError = call.status === "failed";
  const canExpand = call.status !== "running";

  return (
    <div
      className={cn(
        "rounded-md border transition-colors",
        isError ? "border-destructive/30 bg-destructive/5" : "border-border bg-card",
      )}
    >
      <button
        type="button"
        disabled={!canExpand}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left disabled:cursor-default"
      >
        <ChevronRight
          className={cn(
            "w-3 h-3 text-muted-foreground transition-transform shrink-0",
            open && "rotate-90",
            !canExpand && "opacity-0",
          )}
        />
        <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-[11px] font-semibold text-foreground shrink-0">{call.name}</span>
        {call.provider && (
          <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">· {call.provider}</span>
        )}
        <span className="text-[11px] font-mono text-muted-foreground truncate flex-1 text-right">
          {truncate(call.summary)}
        </span>
        <span className="shrink-0">
          {call.status === "running" && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
          {call.status === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
          {call.status === "failed" && (
            <span className="flex items-center gap-1 text-[10px] text-destructive max-w-[140px] truncate">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {(call.error ?? "调用失败").split("\n")[0]}
            </span>
          )}
        </span>
      </button>

      {open && canExpand && (
        <div className="px-3 pb-3 pt-2 space-y-3 border-t border-border/60 text-[11px]">
          {/* endpoint 单独一行（如果有），不再单独搞"调用资源"区块 */}
          {call.endpoint && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">端点</span>
              <code className="font-mono text-[10px] text-foreground/80 bg-muted/60 px-1.5 py-0.5 rounded">
                {call.endpoint}
              </code>
            </div>
          )}

          {/* 2. 请求参数 */}
          {(call.params && call.params.length > 0) ? (
            <section className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">请求参数</p>
              <div className="rounded border border-border/60 overflow-hidden">
                {call.params.map((p, i) => (
                  <div
                    key={i}
                    className={cn(
                      "grid grid-cols-[100px_1fr] gap-2 px-2 py-1",
                      i % 2 === 1 && "bg-muted/30",
                    )}
                  >
                    <span className="text-muted-foreground font-mono text-[10px]">{p.key}</span>
                    <span className="text-foreground break-all">{p.value}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : call.input ? (
            <section className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">请求参数</p>
              <pre className="whitespace-pre-wrap text-foreground/80 bg-muted/40 rounded p-1.5 font-mono text-[10px]">
                {call.input}
              </pre>
            </section>
          ) : null}

          {/* 3. 调用过程时间线 */}
          {call.steps && call.steps.length > 0 && (
            <section className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">调用过程</p>
              <ol className="relative ml-1 border-l border-border/60 pl-3 space-y-1.5">
                {call.steps.map((s, i) => {
                  const dotCls =
                    s.status === "failed" ? "bg-destructive"
                    : s.status === "running" ? "bg-amber-400 animate-pulse"
                    : "bg-emerald-500";
                  return (
                    <li key={i} className="relative">
                      <span className={cn("absolute -left-[15px] top-[5px] w-1.5 h-1.5 rounded-full", dotCls)} />
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-foreground font-medium">{s.label}</span>
                        {typeof s.ms === "number" && (
                          <span className="text-[10px] text-muted-foreground tabular-nums">{s.ms}ms</span>
                        )}
                      </div>
                      {s.detail && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{s.detail}</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {/* 4. 返回结果 */}
          {(call.resultItems && call.resultItems.length > 0) ? (
            <section className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">返回结果</p>
                {call.resultSummary && (
                  <span className="text-[10px] text-muted-foreground">{call.resultSummary}</span>
                )}
              </div>
              <ul className="rounded border border-border/60 divide-y divide-border/60">
                {call.resultItems.map((r, i) => (
                  <li key={i} className="flex items-center gap-2 px-2 py-1">
                    <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-foreground flex-1 truncate">{r.title}</span>
                    {r.meta && <span className="text-[10px] text-muted-foreground">{r.meta}</span>}
                  </li>
                ))}
              </ul>
            </section>
          ) : call.output ? (
            <section className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">返回结果</p>
              <pre className="whitespace-pre-wrap text-foreground/80 bg-muted/40 rounded p-1.5 font-mono text-[10px]">
                {call.output}
              </pre>
            </section>
          ) : null}

          {/* 5. 错误 */}
          {call.error && (
            <section className="space-y-1">
              <p className="text-[10px] font-medium text-destructive/80 uppercase tracking-wide">错误信息</p>
              <pre className="whitespace-pre-wrap text-destructive bg-destructive/10 rounded p-1.5 font-mono text-[10px]">
                {call.error}
              </pre>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

/** 多个连续工具调用，纵向堆叠 */
export const ToolCallGroup = ({ calls }: { calls: ToolCall[] }) => {
  if (calls.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {calls.map((c) => (
        <Card key={c.id} call={c} />
      ))}
    </div>
  );
};

export const ToolCallCard = Card;
