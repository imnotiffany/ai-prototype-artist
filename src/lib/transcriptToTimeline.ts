import type { TranscriptEvent } from "@/components/RunViews";
import type {
  TimelineScenario,
  TimelineEvent,
  TimelineSubEvent,
  CategoryKey,
} from "@/data/timelineMock";
import type { ToolCall } from "@/components/ToolCallCard";

const toCategory = (kind: ToolCall["kind"]): CategoryKey => {
  // ToolCallKind: mcp | skill | subagent | search → 直接映射
  return kind as CategoryKey;
};

const toolCallToSub = (c: ToolCall): TimelineSubEvent => {
  const dur = c.steps?.reduce((a, s) => a + (s.ms ?? 0), 0);
  const params = Object.fromEntries((c.params ?? []).map((p) => [p.key, p.value]));
  const hasRaw =
    (c.params && c.params.length > 0) ||
    (c.resultItems && c.resultItems.length > 0) ||
    !!c.input ||
    !!c.output ||
    (c.steps && c.steps.length > 0);
  return {
    id: c.id,
    category: toCategory(c.kind),
    title: c.summary ? `${c.name} · ${c.summary}` : c.name,
    status: c.status,
    durationMs: dur && dur > 0 ? dur : undefined,
    error: c.error,
    raw: hasRaw
      ? {
          ...(c.params?.length ? { args: params } : {}),
          ...(c.input ? { input: c.input } : {}),
          ...(c.steps?.length ? { steps: c.steps } : {}),
          ...(c.resultItems?.length ? { result: c.resultItems } : {}),
          ...(c.resultSummary ? { summary: c.resultSummary } : {}),
          ...(c.output ? { output: c.output } : {}),
        }
      : undefined,
  };
};

/**
 * 把旧的 TranscriptEvent[] 转成统一的 TimelineScenario，
 * 让所有调用方都能复用新的 RunTimelineView。
 */
export const transcriptToTimelineScenario = (
  events: TranscriptEvent[],
  opts: { id?: string; title?: string; running?: boolean } = {},
): TimelineScenario => {
  const out: TimelineEvent[] = [];
  let lastAgentIdx = -1;
  events.forEach((e, i) => {
    if (e.type === "user") {
      out.push({ id: e.id || `u${i}`, kind: "user", text: e.content });
    } else if (e.type === "agent") {
      lastAgentIdx = out.length;
      out.push({ id: e.id || `a${i}`, kind: "agent", text: e.content });
    } else if (e.type === "tools") {
      out.push({
        id: e.id || `t${i}`,
        kind: "events",
        events: e.calls.map(toolCallToSub),
      });
    } else if (e.type === "error") {
      out.push({ id: e.id || `e${i}`, kind: "error", title: e.message });
    } else if (e.type === "system") {
      out.push({ id: e.id || `s${i}`, kind: "notification", text: e.message });
    }
  });
  // 最后一条 agent 标记为 final（非运行中）
  if (!opts.running && lastAgentIdx >= 0) {
    const last = out[lastAgentIdx];
    if (last.kind === "agent") last.final = true;
  }
  return {
    id: opts.id ?? "live",
    title: opts.title ?? "会话",
    status: opts.running ? "running" : "done",
    events: out,
  };
};
