import { useState } from "react";
import { ChevronRight, CheckCircle2, AlertCircle, Loader2, Plug, Sparkles, Bot, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToolCallKind = "mcp" | "skill" | "subagent" | "search";
export type ToolCallStatus = "running" | "success" | "failed";

export interface ToolCall {
  id: string;
  kind: ToolCallKind;
  name: string;
  summary: string;
  status: ToolCallStatus;
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
        <span className="text-[11px] font-mono text-muted-foreground truncate flex-1">
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
        <div className="px-2.5 pb-2 pt-0 text-[10px] font-mono space-y-1.5 border-t border-border/60">
          {call.input && (
            <div>
              <p className="text-muted-foreground/70 mb-0.5 mt-1.5">input</p>
              <pre className="whitespace-pre-wrap text-foreground/80 bg-muted/40 rounded p-1.5">{call.input}</pre>
            </div>
          )}
          {call.output && (
            <div>
              <p className="text-muted-foreground/70 mb-0.5">output</p>
              <pre className="whitespace-pre-wrap text-foreground/80 bg-muted/40 rounded p-1.5">{call.output}</pre>
            </div>
          )}
          {call.error && (
            <div>
              <p className="text-destructive/80 mb-0.5">error</p>
              <pre className="whitespace-pre-wrap text-destructive bg-destructive/10 rounded p-1.5">{call.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** 多个连续工具调用以树形（左侧竖线）展示 */
export const ToolCallGroup = ({ calls }: { calls: ToolCall[] }) => {
  if (calls.length === 0) return null;
  return (
    <div className="relative pl-4">
      {/* tree trunk */}
      <span className="absolute left-1.5 top-2 bottom-2 w-px bg-border" aria-hidden />
      <div className="space-y-1.5">
        {calls.map((c) => (
          <div key={c.id} className="relative">
            <span className="absolute -left-[10px] top-3 w-2 h-px bg-border" aria-hidden />
            <Card call={c} />
          </div>
        ))}
      </div>
    </div>
  );
};

export const ToolCallCard = Card;
