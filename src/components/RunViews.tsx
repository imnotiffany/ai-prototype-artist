import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Search, XCircle, Terminal, MessageSquare, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ToolCallGroup, type ToolCall } from "@/components/ToolCallCard";
import { cn } from "@/lib/utils";

/* ================= Shared event model ================= */

export type TranscriptEvent =
  | { id: string; type: "user"; content: string }
  | { id: string; type: "agent"; content: string }
  | { id: string; type: "tools"; calls: ToolCall[] }
  | { id: string; type: "error"; message: string }
  | { id: string; type: "system"; message: string };

export type DebugEvent = {
  id: string;
  ts: string; // "10:24:18.102"
  type: string; // session.start / llm.request / tool.call ...
  data?: unknown;
};

/* ================= Transcript view ================= */

const matches = (q: string, ...fields: (string | undefined)[]) => {
  if (!q.trim()) return true;
  const k = q.toLowerCase();
  return fields.some((f) => (f ?? "").toLowerCase().includes(k));
};

export const RunTranscriptView = ({
  events,
  emptyText = "暂无对话内容",
  showSearch = true,
}: {
  events: TranscriptEvent[];
  emptyText?: string;
  showSearch?: boolean;
}) => {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return events;
    return events.filter((e) => {
      switch (e.type) {
        case "user":
        case "agent":
          return matches(q, e.content);
        case "error":
        case "system":
          return matches(q, e.message);
        case "tools":
          return e.calls.some((c) => matches(q, c.name, c.summary, c.input, c.output, c.error));
      }
    });
  }, [events, q]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {showSearch && (
        <div className="px-3 py-2 border-b border-border shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索对话内容、工具名…"
              className="h-7 text-xs pl-7"
            />
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto p-4 space-y-3 min-h-0">
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">{q ? "没有匹配的内容" : emptyText}</p>
        )}
        {filtered.map((e) => {
          if (e.type === "user") {
            return (
              <div key={e.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl px-3 py-2 text-xs bg-primary text-primary-foreground whitespace-pre-wrap leading-relaxed">
                  {e.content}
                </div>
              </div>
            );
          }
          if (e.type === "agent") {
            return (
              <div key={e.id} className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-3 py-2 text-xs bg-secondary text-foreground whitespace-pre-wrap leading-relaxed">
                  {e.content}
                </div>
              </div>
            );
          }
          if (e.type === "tools") {
            return (
              <div key={e.id} className="max-w-[85%]">
                <ToolCallGroup calls={e.calls} />
              </div>
            );
          }
          if (e.type === "error") {
            return (
              <div key={e.id} className="flex justify-center">
                <div className="inline-flex items-center gap-1.5 text-[11px] text-destructive bg-destructive/10 border border-destructive/30 rounded-full px-3 py-1">
                  <XCircle className="w-3 h-3" />
                  {e.message}
                </div>
              </div>
            );
          }
          // system
          return (
            <div key={e.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex-1 h-px bg-border" />
              <span className="px-1.5 py-0.5 rounded bg-muted/60">{e.message}</span>
              <span className="flex-1 h-px bg-border" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ================= Debug view (inline expandable rows) ================= */

const typeColor = (t: string) => {
  if (t.startsWith("session")) return "border-sky-300 text-sky-700 bg-sky-50/60 dark:bg-sky-950/30 dark:text-sky-300";
  if (t.startsWith("llm")) return "border-violet-300 text-violet-700 bg-violet-50/60 dark:bg-violet-950/30 dark:text-violet-300";
  if (t.startsWith("tool")) return "border-emerald-300 text-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/30 dark:text-emerald-300";
  if (t.startsWith("error") || t.includes("fail")) return "border-destructive/40 text-destructive bg-destructive/10";
  return "border-border text-muted-foreground bg-muted/40";
};

export const RunDebugView = ({
  events,
  meta,
  emptyText = "暂无调试事件",
}: {
  events: DebugEvent[];
  meta?: { label: string; value: string }[];
  emptyText?: string;
}) => {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return events;
    const k = q.toLowerCase();
    return events.filter((e) =>
      e.type.toLowerCase().includes(k) ||
      e.ts.includes(k) ||
      JSON.stringify(e.data ?? "").toLowerCase().includes(k),
    );
  }, [events, q]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {meta && meta.length > 0 && (
        <div className="px-3 py-2 border-b border-border bg-muted/30 shrink-0 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
          {meta.map((m) => (
            <div key={m.label}>
              <span>{m.label}：</span>
              <span className="font-mono text-foreground">{m.value}</span>
            </div>
          ))}
        </div>
      )}
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索事件类型、时间、字段…"
            className="h-7 text-xs pl-7"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-1 min-h-0 font-mono text-[11px]">
        {filtered.length === 0 && (
          <p className="text-muted-foreground text-center py-6">{q ? "没有匹配的事件" : emptyText}</p>
        )}
        {filtered.map((e) => {
          const isOpen = !!open[e.id];
          return (
            <div key={e.id} className="border border-border rounded bg-card">
              <button
                type="button"
                onClick={() => setOpen((s) => ({ ...s, [e.id]: !s[e.id] }))}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-muted/40"
              >
                {isOpen ? (
                  <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                )}
                <span className="text-muted-foreground shrink-0">{e.ts}</span>
                <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5 font-mono shrink-0", typeColor(e.type))}>
                  {e.type}
                </Badge>
                <span className="text-foreground/60 truncate flex-1 text-[10px]">
                  {e.data ? JSON.stringify(e.data).slice(0, 80) : ""}
                </span>
              </button>
              {isOpen && (
                <pre className="text-[10px] text-foreground/80 whitespace-pre-wrap break-all bg-muted/40 border-t border-border p-2">
                  {e.data ? JSON.stringify(e.data, null, 2) : "(无 payload)"}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ================= Combined dual view (toggle) ================= */

export const RunDualView = ({
  transcriptEvents,
  debugEvents,
  debugMeta,
  toolbarRight,
}: {
  transcriptEvents: TranscriptEvent[];
  debugEvents: DebugEvent[];
  debugMeta?: { label: string; value: string }[];
  toolbarRight?: React.ReactNode;
}) => {
  const [view, setView] = useState<"transcript" | "debug">("transcript");
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 h-10 shrink-0 border-b border-border flex items-center justify-between gap-2">
        <div className="inline-flex items-center bg-muted rounded-md p-0.5">
          <button
            onClick={() => setView("transcript")}
            className={cn(
              "px-2.5 py-1 text-[11px] rounded transition-colors flex items-center gap-1",
              view === "transcript"
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <MessageSquare className="w-3 h-3" />
            对话视图
          </button>
          <button
            onClick={() => setView("debug")}
            className={cn(
              "px-2.5 py-1 text-[11px] rounded transition-colors flex items-center gap-1",
              view === "debug"
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Terminal className="w-3 h-3" />
            调试视图
            {debugEvents.length > 0 && (
              <span className="ml-0.5 px-1 rounded bg-muted text-muted-foreground text-[9px] leading-tight">
                {debugEvents.length}
              </span>
            )}
          </button>
        </div>
        {toolbarRight}
      </div>
      <div className="flex-1 min-h-0">
        {view === "transcript" ? (
          <RunTranscriptView events={transcriptEvents} />
        ) : (
          <RunDebugView events={debugEvents} meta={debugMeta} />
        )}
      </div>
    </div>
  );
};

export const RunningIndicator = () => (
  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
    <Loader2 className="w-2.5 h-2.5 animate-spin" /> 运行中
  </span>
);
