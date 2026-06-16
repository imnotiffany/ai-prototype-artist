import { useMemo, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Loader2,
  AlertTriangle,
  ShieldAlert,
  FileText,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  File as FileIcon,
  Terminal,
  Search,
  Plug,
  Wand2,
  Bot,
  Bell,
  Cog,
  Paperclip,
  Eye,
  EyeOff,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  type CategoryKey,
  type RunStatus,
  type TimelineArtifact,
  type TimelineCategory,
  type TimelineEvent,
  type TimelineScenario,
  type TimelineSubEvent,
} from "@/data/timelineMock";

/* ────────── 工具函数 ────────── */

const fmtDuration = (ms?: number): string | null => {
  if (ms == null) return null;
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}s`;
  const m = Math.floor(s / 60);
  const rs = Math.round(s - m * 60);
  return `${m}m ${rs}s`;
};

const CAT_META: Record<CategoryKey, { label: string; Icon: typeof Cog; tone: string }> = {
  file: { label: "文件处理", Icon: FileText, tone: "text-sky-600 dark:text-sky-400" },
  bash: { label: "命令执行", Icon: Terminal, tone: "text-zinc-600 dark:text-zinc-300" },
  search: { label: "信息检索", Icon: Search, tone: "text-violet-600 dark:text-violet-400" },
  mcp: { label: "外部服务", Icon: Plug, tone: "text-amber-600 dark:text-amber-400" },
  skill: { label: "专业技能", Icon: Wand2, tone: "text-fuchsia-600 dark:text-fuchsia-400" },
  subagent: { label: "子任务", Icon: Bot, tone: "text-emerald-600 dark:text-emerald-400" },
  permission: { label: "权限确认", Icon: ShieldAlert, tone: "text-amber-600 dark:text-amber-400" },
  context: { label: "上下文管理", Icon: Cog, tone: "text-muted-foreground" },
  artifact: { label: "产物生成", Icon: Paperclip, tone: "text-emerald-600 dark:text-emerald-400" },
  error: { label: "异常处理", Icon: AlertTriangle, tone: "text-destructive" },
};

const artifactIcon = (kind: TimelineArtifact["kind"]) => {
  switch (kind) {
    case "doc": return FileText;
    case "sheet": return FileSpreadsheet;
    case "md": return FileCode;
    case "code": return FileCode;
    case "image": return ImageIcon;
    default: return FileIcon;
  }
};

const StatusDot = ({ status, size = "sm" }: { status: RunStatus; size?: "sm" | "md" }) => {
  const cls = size === "md" ? "w-3.5 h-3.5" : "w-3 h-3";
  // 成功 / 完成态统一深灰，只让"失败"用红色突出
  if (status === "running") return <Loader2 className={cn(cls, "animate-spin text-muted-foreground")} />;
  if (status === "success") return <Check className={cn(cls, "text-muted-foreground")} strokeWidth={2.5} />;
  if (status === "failed") return <X className={cn(cls, "text-destructive")} strokeWidth={2.5} />;
  if (status === "pending") return <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />;
  return <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 inline-block" />;
};

/** 丝滑展开/收起容器：利用 grid-template-rows 0fr↔1fr 过渡，无需测量高度 */
const Expand = ({ open, children, className }: { open: boolean; children: React.ReactNode; className?: string }) => (
  <div
    className={cn(
      "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
      open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      className,
    )}
  >
    <div className="overflow-hidden min-h-0">{children}</div>
  </div>
);

/* ────────── 详略控制 ────────── */

type Detail = "summary" | "process" | "all";
const DETAIL_LEVEL: Record<Detail, number> = { summary: 1, process: 2, all: 3 };

/* ────────── 子组件 ────────── */

const ArtifactChips = ({ artifacts }: { artifacts: TimelineArtifact[] }) => (
  <div className="flex flex-wrap gap-1.5 mt-1.5">
    {artifacts.map((a) => {
      const Icon = artifactIcon(a.kind);
      return (
        <span
          key={a.id}
          className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-border bg-muted/40 text-foreground/80"
        >
          <Icon className="w-3 h-3 text-muted-foreground" />
          <span className="truncate max-w-[200px]">{a.name}</span>
          {a.size && <span className="text-muted-foreground/70">· {a.size}</span>}
        </span>
      );
    })}
  </div>
);

/** 单个事件 —— 浅灰胶囊样式，点击展开 raw / error / artifacts */
export const EventRow = ({
  ev,
  showRaw,
}: {
  ev: TimelineSubEvent;
  showRaw: boolean;
}) => {
  const [open, setOpen] = useState(false);
  
  const canExpand = !!ev.raw || !!ev.error || !!ev.artifacts?.length;
  const isFailed = ev.status === "failed";
  const dur = fmtDuration(ev.durationMs);

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={!canExpand}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group flex w-full items-center gap-2 py-0.5 text-xs leading-5 text-left",
          isFailed ? "text-destructive" : "text-foreground/75",
          canExpand && "hover:text-foreground cursor-pointer",
          !canExpand && "cursor-default",
        )}
      >
        {isFailed && <span className="w-1 h-1 rounded-full bg-destructive shrink-0" />}
        <span className="truncate">{ev.title}</span>
        {canExpand && (
          <ChevronDown
            className={cn(
              "w-3 h-3 text-muted-foreground/60 transition-transform shrink-0",
              open ? "rotate-0" : "-rotate-90",
            )}
          />
        )}
        <span className="ml-auto flex items-center gap-2 shrink-0">
          {dur && <span className="text-[10px] text-muted-foreground/70 tabular-nums">{dur}</span>}
          {ev.status === "running" ? (
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
          ) : isFailed ? (
            <X className="w-3.5 h-3.5 text-destructive" strokeWidth={2.5} />
          ) : ev.status === "success" ? (
            <Check className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2.5} />
          ) : null}
        </span>
      </button>

      <Expand open={canExpand && (open || (showRaw && !!(ev.raw || ev.error)))}>
        <div className="mb-2 space-y-1.5 text-[11px]">
          {ev.error && (
            <pre className="w-full rounded-md bg-destructive/5 border border-destructive/20 text-destructive px-3 py-2 whitespace-pre-wrap leading-5 font-mono">
              {ev.error}
            </pre>
          )}
          {ev.artifacts && <ArtifactChips artifacts={ev.artifacts} />}
          {ev.raw && (
            <pre className="w-full rounded-md bg-muted/50 px-3 py-2 whitespace-pre-wrap leading-5 font-mono text-foreground/70 max-h-64 overflow-auto">
              {JSON.stringify(ev.raw, null, 2)}
            </pre>
          )}
        </div>
      </Expand>
    </div>
  );
};

/** 类别块 —— 事件竖向堆叠，每行独占一行 */
const CategoryEvents = ({
  cat,
  showRaw,
}: {
  cat: TimelineCategory;
  showRaw: boolean;
}) => (
  <div className="flex flex-col">
    {cat.events.map((e) => (
      <EventRow key={e.id} ev={e} showRaw={showRaw} />
    ))}
  </div>
);

/** 阶段块 —— 无边框，点击标题展开下方执行细节 */
const PhaseBlock = ({
  phase,
  detail,
  showRaw,
  defaultExpanded,
  compact = false,
}: {
  phase: Extract<TimelineEvent, { kind: "phase" }>;
  detail: Detail;
  showRaw: boolean;
  defaultExpanded?: boolean;
  compact?: boolean;
}) => {
  const level = DETAIL_LEVEL[detail];
  const isRunning = phase.status === "running";
  const isFailed = phase.status === "failed";
  // 默认：执行中/失败常开；其余看详略档位与 defaultExpanded
  const defaultOpen = defaultExpanded ?? (level >= 2 || isRunning || isFailed);
  const [open, setOpen] = useState(defaultOpen);
  const dur = fmtDuration(phase.durationMs);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex items-center gap-2 text-left py-0.5 text-xs leading-5 transition-colors w-full"
      >
        <span
          className={cn(
            "truncate",
            isFailed ? "text-destructive font-medium" : "text-foreground/85",
          )}
        >
          {phase.title}
        </span>
        {isRunning && phase.currentAction && (
          <span className="text-muted-foreground/80 truncate hidden md:inline">
            · {phase.currentAction}
          </span>
        )}
        <ChevronDown
          className={cn(
            "w-3 h-3 text-muted-foreground/50 transition-transform shrink-0",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
        {dur && (
          <span className="ml-auto text-[10px] text-muted-foreground/60 tabular-nums shrink-0 pl-2">
            {dur}
          </span>
        )}
        <StatusDot status={phase.status} size="md" />
      </button>
      <Expand open={open}>
        <div className="ml-5">
          {isRunning && phase.currentAction && (
            <div className="py-0.5 text-xs leading-5 text-muted-foreground md:hidden">
              当前：{phase.currentAction}
            </div>
          )}
          {phase.categories.map((c) => (
            <CategoryEvents key={c.key} cat={c} showRaw={showRaw} />
          ))}
        </div>
      </Expand>
    </div>
  );
};

const SummaryBlock = ({
  ev,
  phases = [],
  showRaw,
}: {
  ev: Extract<TimelineEvent, { kind: "summary" }>;
  phases?: Extract<TimelineEvent, { kind: "phase" }>[];
  showRaw: boolean;
}) => {
  const Icon = ev.status === "success" ? Check : ev.status === "failed" ? X : AlertTriangle;
  const iconCls =
    ev.status === "success"
      ? "text-muted-foreground"
      : ev.status === "failed"
        ? "text-destructive"
        : "text-muted-foreground";
  const [open, setOpen] = useState(false);
  const canExpand = phases.length > 0;

  return (
    <div className="py-1">
      <button
        type="button"
        disabled={!canExpand}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group flex w-full items-center gap-2 py-0.5 text-left text-[12px] text-muted-foreground",
          canExpand ? "cursor-pointer hover:text-foreground" : "cursor-default",
        )}
      >
        <span className="truncate">
          {ev.status === "success" && `任务已执行完 · 耗时 ${fmtDuration(ev.durationMs)}`}
          {ev.status === "failed" && `任务未完成 · 耗时 ${fmtDuration(ev.durationMs)}`}
          {ev.status === "cancelled" && `任务已中断 · 耗时 ${fmtDuration(ev.durationMs)}`}
        </span>
        {canExpand && (
          <ChevronDown
            className={cn(
              "w-3 h-3 text-muted-foreground/50 transition-transform shrink-0",
              open ? "rotate-0" : "-rotate-90",
            )}
          />
        )}
        <Icon className={cn("ml-auto w-3.5 h-3.5 shrink-0", iconCls)} strokeWidth={2.5} />
      </button>
      <Expand open={canExpand && open}>
        <div className="mb-1.5 space-y-1.5">
          {phases.map((phase) => (
            <PhaseBlock key={phase.id} phase={phase} detail="summary" showRaw={showRaw} defaultExpanded={false} compact />
          ))}
        </div>
      </Expand>
      <div className="mt-2 text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
        {ev.text}
      </div>
      {ev.artifacts && ev.artifacts.length > 0 && (
        <div className="mt-2">
          <ArtifactChips artifacts={ev.artifacts} />
        </div>
      )}
    </div>
  );
};

const PermissionBlock = ({
  ev,
}: {
  ev: Extract<TimelineEvent, { kind: "permission" }>;
}) => {
  const isPending = ev.status === "pending";
  const tone = isPending
    ? "border-amber-500/40 bg-amber-500/5"
    : ev.status === "denied"
      ? "border-destructive/40 bg-destructive/5"
      : "border-emerald-500/30 bg-emerald-500/5";
  return (
    <div className={cn("rounded-md border px-3 py-2", tone)}>
      <div className="flex items-center gap-2 text-[12px]">
        <ShieldAlert
          className={cn(
            "w-4 h-4",
            isPending ? "text-amber-600" : ev.status === "denied" ? "text-destructive" : "text-emerald-600",
          )}
        />
        <span className="font-medium text-foreground">
          {isPending && `需要确认：${ev.action}`}
          {ev.status === "approved" && `已批准：${ev.action}`}
          {ev.status === "denied" && `已拒绝：${ev.action}`}
        </span>
      </div>
      {ev.reason && <div className="mt-1 text-[11px] text-muted-foreground pl-6">{ev.reason}</div>}
      {isPending && (
        <div className="mt-2 pl-6 flex items-center gap-2">
          <Button size="sm" className="h-7 text-[11px] px-3">允许</Button>
          <Button size="sm" variant="outline" className="h-7 text-[11px] px-3">拒绝</Button>
        </div>
      )}
    </div>
  );
};

const NotificationBlock = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
    <span className="flex-1 h-px bg-border" />
    <span className="px-2 py-0.5 rounded bg-muted/60 inline-flex items-center gap-1">
      <Bell className="w-3 h-3" />
      {text}
    </span>
    <span className="flex-1 h-px bg-border" />
  </div>
);

const ErrorBlock = ({
  ev,
}: {
  ev: Extract<TimelineEvent, { kind: "error" }>;
}) => (
  <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
    <div className="flex items-center gap-2 text-[12px] font-medium text-destructive">
      <AlertTriangle className="w-4 h-4" />
      {ev.title}
    </div>
    {ev.detail && <div className="mt-1 text-[11px] text-destructive/80 pl-6">{ev.detail}</div>}
  </div>
);

/* ────────── 顶层视图 ────────── */

const UserAvatar = () => (
  <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 text-[12px] font-medium">
    你
  </div>
);
const AgentAvatar = ({ avatar }: { avatar?: string }) => (
  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-lg shrink-0">
    {avatar ?? "🤖"}
  </div>
);

type FilterKey = "all" | "error" | "permission" | "artifact" | "mcp" | "subagent";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "error", label: "错误" },
  { key: "permission", label: "权限" },
  { key: "artifact", label: "产物" },
  { key: "mcp", label: "MCP" },
  { key: "subagent", label: "子任务" },
];

const matchFilter = (ev: TimelineEvent, f: FilterKey): boolean => {
  if (f === "all") return true;
  if (f === "error") {
    if (ev.kind === "error") return true;
    if (ev.kind === "summary") return ev.status === "failed";
    if (ev.kind === "phase") return ev.categories.some((c) => c.events.some((e) => e.status === "failed"));
    return false;
  }
  if (f === "permission") return ev.kind === "permission";
  if (f === "artifact") {
    if (ev.kind === "summary") return !!ev.artifacts?.length;
    if (ev.kind === "phase") return ev.categories.some((c) => c.key === "artifact");
    return false;
  }
  if (f === "mcp") return ev.kind === "phase" && ev.categories.some((c) => c.key === "mcp");
  if (f === "subagent") return ev.kind === "phase" && ev.categories.some((c) => c.key === "subagent");
  return false;
};

export const RunTimelineView = ({
  scenario,
  agentAvatar,
  footer,
  inputSlot,
  emptyState,
}: {
  scenario: TimelineScenario;
  agentAvatar?: string;
  footer?: React.ReactNode;
  inputSlot?: React.ReactNode;
  emptyState?: React.ReactNode;
}) => {
  const [detail, setDetail] = useState<Detail>(scenario.status === "done" || scenario.status === "failed" ? "summary" : "process");
  const [showRaw, setShowRaw] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");

  const summaryPhases = useMemo(
    () => scenario.events.filter((e): e is Extract<TimelineEvent, { kind: "phase" }> => e.kind === "phase"),
    [scenario.events],
  );
  const hasSummary = scenario.events.some((e) => e.kind === "summary");
  const visible = useMemo(
    () => scenario.events.filter((e) => {
      if (hasSummary && e.kind === "phase") return false;
      return e.kind === "user" || e.kind === "agent" || e.kind === "events" || matchFilter(e, filter);
    }),
    [scenario.events, filter, hasSummary],
  );

  return (
    <div className="flex flex-col h-full min-h-0">


      {/* 时间线 */}
      <div className="flex-1 overflow-auto p-4 space-y-3 min-h-0">
        {visible.length === 0 && (
          emptyState ?? <p className="text-xs text-muted-foreground text-center py-6">没有匹配的事件</p>
        )}
        {visible.map((ev) => {
          if (ev.kind === "user") {
            return (
              <div key={ev.id} className="flex justify-end animate-fade-in">
                <div className="max-w-[80%] rounded-2xl px-3 py-2 text-xs bg-primary text-primary-foreground whitespace-pre-wrap leading-relaxed">
                  {ev.text}
                </div>
              </div>
            );
          }
          if (ev.kind === "agent") {
            // 最终回答（final=true）用纯前景色（黑），中间叙述用深灰，跟工具日志区分
            return (
              <div
                key={ev.id}
                className={cn(
                  "text-[13px] leading-relaxed whitespace-pre-wrap animate-fade-in",
                  ev.final ? "text-foreground" : "text-foreground/55",
                )}
              >
                {ev.text}
              </div>
            );
          }
          if (ev.kind === "summary") {
            return (
              <div key={ev.id} className="animate-fade-in">
                <SummaryBlock ev={ev} phases={summaryPhases} showRaw={showRaw} />
              </div>
            );
          }
          if (ev.kind === "phase") {
            // summary 档：完成态默认折叠，但点击可展开
            const defaultExpanded =
              detail !== "summary" || ev.status === "running" || ev.status === "failed";
            return (
              <div key={ev.id} className="animate-fade-in">
                <PhaseBlock phase={ev} detail={detail} showRaw={showRaw} defaultExpanded={defaultExpanded} />
              </div>
            );
          }
          if (ev.kind === "events") {
            return (
              <div key={ev.id} className="animate-fade-in flex flex-col">
                {ev.events.map((e) => (
                  <EventRow key={e.id} ev={e} showRaw={showRaw} />
                ))}
              </div>
            );
          }
          if (ev.kind === "permission") {
            return <div key={ev.id} className="animate-fade-in"><PermissionBlock ev={ev} /></div>;
          }
          if (ev.kind === "error") {
            return <div key={ev.id} className="animate-fade-in"><ErrorBlock ev={ev} /></div>;
          }
          if (ev.kind === "notification") {
            return <NotificationBlock key={ev.id} text={ev.text} />;
          }
          return null;
        })}
        {footer && <div className="pt-1">{footer}</div>}
      </div>

      {inputSlot && <div className="shrink-0 border-t border-border bg-background">{inputSlot}</div>}
    </div>
  );
};
