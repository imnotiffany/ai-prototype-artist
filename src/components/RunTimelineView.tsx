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
  Sparkles,
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
  skill: { label: "专业技能", Icon: Sparkles, tone: "text-fuchsia-600 dark:text-fuchsia-400" },
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

const StatusDot = ({ status }: { status: RunStatus }) => {
  if (status === "running") return <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />;
  if (status === "success") return <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2.5} />;
  if (status === "failed") return <X className="w-3.5 h-3.5 text-destructive" strokeWidth={2.5} />;
  if (status === "pending") return <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />;
  return <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />;
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

const EventRow = ({
  ev,
  showRaw,
}: {
  ev: TimelineSubEvent;
  showRaw: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const { Icon, tone } = CAT_META[ev.category];
  const canExpand = !!ev.raw || !!ev.error || !!ev.artifacts?.length;
  const isFailed = ev.status === "failed";
  const dur = fmtDuration(ev.durationMs);

  return (
    <div className={cn("pl-6 pr-1", ev.sideEffect && "relative")}>
      {ev.sideEffect && (
        <span
          className={cn(
            "absolute left-3 top-1 bottom-1 w-[2px] rounded-full",
            isFailed ? "bg-destructive/60" : "bg-emerald-500/60",
          )}
        />
      )}
      <button
        type="button"
        disabled={!canExpand}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group w-full flex items-center gap-2 py-1 px-1 -mx-1 rounded text-left text-[12px] leading-5",
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
        <Icon className={cn("w-3.5 h-3.5 shrink-0", isFailed ? "text-destructive" : tone)} />
        <span className={cn("truncate", isFailed ? "text-destructive" : "text-foreground/90")}>
          {ev.title}
        </span>
        <span className="ml-auto shrink-0 flex items-center gap-1.5 pl-2">
          {dur && <span className="text-[10px] text-muted-foreground/70 tabular-nums">{dur}</span>}
          <StatusDot status={ev.status} />
        </span>
      </button>

      <Expand open={canExpand && (open || (showRaw && !!(ev.raw || ev.error)))}>
        <div className="ml-5 mt-1 mb-2 space-y-1.5 text-[11px]">
          {ev.error && (
            <pre className="rounded-sm bg-destructive/5 border border-destructive/20 text-destructive px-2 py-1.5 whitespace-pre-wrap leading-5 font-mono">
              {ev.error}
            </pre>
          )}
          {ev.artifacts && <ArtifactChips artifacts={ev.artifacts} />}
          {ev.raw && (
            <pre className="rounded-sm bg-muted/40 border border-border/40 px-2 py-1.5 whitespace-pre-wrap leading-5 font-mono text-foreground/80 max-h-48 overflow-auto">
              {JSON.stringify(ev.raw, null, 2)}
            </pre>
          )}
        </div>
      </Expand>
    </div>
  );
};

const CategoryBlock = ({
  cat,
  detail,
  showRaw,
  forceOpen,
}: {
  cat: TimelineCategory;
  detail: Detail;
  showRaw: boolean;
  forceOpen?: boolean;
}) => {
  const level = DETAIL_LEVEL[detail];
  // L2 = 类别可见但默认收起；L3 = 默认展开事件
  const [open, setOpen] = useState(level >= 3 || forceOpen || cat.status === "failed" || cat.status === "running");
  const meta = CAT_META[cat.key];
  const Icon = meta.Icon;
  const counts = cat.events.length;
  const failed = cat.events.filter((e) => e.status === "failed").length;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 py-1 px-1 -mx-1 rounded text-left text-[12px] hover:bg-muted/40"
      >
        {open ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground/60 shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground/60 shrink-0" />
        )}
        <Icon className={cn("w-3.5 h-3.5 shrink-0", meta.tone)} />
        <span className="font-medium text-foreground/90">{cat.label}</span>
        <span className="text-muted-foreground/70 text-[11px]">
          {failed > 0 ? `· ${counts} 项 / ${failed} 失败` : `· ${counts} 项`}
        </span>
        <span className="ml-auto"><StatusDot status={cat.status} /></span>
      </button>
      <Expand open={open}>
        <div className="mt-0.5 space-y-0">
          {cat.events.map((e) => (
            <EventRow key={e.id} ev={e} showRaw={showRaw} />
          ))}
        </div>
      </Expand>
    </div>
  );
};

const PhaseBlock = ({
  phase,
  detail,
  showRaw,
}: {
  phase: Extract<TimelineEvent, { kind: "phase" }>;
  detail: Detail;
  showRaw: boolean;
}) => {
  const level = DETAIL_LEVEL[detail];
  const isRunning = phase.status === "running";
  // summary 档：完成后折叠为一行；执行中始终展开
  const defaultOpen = level >= 2 || isRunning || phase.status === "failed";
  const [open, setOpen] = useState(defaultOpen);
  const dur = fmtDuration(phase.durationMs);

  return (
    <div className="rounded-md border border-border bg-card/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-muted/40 rounded-md"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
        <StatusDot status={phase.status} />
        <span className="text-[12px] font-medium text-foreground/90 truncate">{phase.title}</span>
        {phase.currentAction && isRunning && (
          <span className="text-[11px] text-muted-foreground truncate hidden md:inline">
            · {phase.currentAction}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
          {dur && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock className="w-3 h-3" /> {dur}
            </span>
          )}
        </span>
      </button>
      <Expand open={open}>
        <div className="px-2.5 pb-2 pt-1 space-y-1.5">
          {isRunning && phase.currentAction && (
            <div className="text-[11px] text-muted-foreground md:hidden">
              当前：{phase.currentAction}
            </div>
          )}
          {phase.categories.map((c) => (
            <CategoryBlock key={c.key} cat={c} detail={detail} showRaw={showRaw} />
          ))}
        </div>
      </Expand>
    </div>
  );
};

const SummaryBlock = ({
  ev,
}: {
  ev: Extract<TimelineEvent, { kind: "summary" }>;
}) => {
  const Icon = ev.status === "success" ? Check : ev.status === "failed" ? X : AlertTriangle;
  const iconCls =
    ev.status === "success"
      ? "text-emerald-500"
      : ev.status === "failed"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <div className="py-1">
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <Icon className={cn("w-3.5 h-3.5", iconCls)} strokeWidth={2.5} />
        {ev.status === "success" && `任务已执行完 · 耗时 ${fmtDuration(ev.durationMs)}`}
        {ev.status === "failed" && `任务未完成 · 耗时 ${fmtDuration(ev.durationMs)}`}
        {ev.status === "cancelled" && `任务已中断 · 耗时 ${fmtDuration(ev.durationMs)}`}
      </div>
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
}: {
  scenario: TimelineScenario;
  agentAvatar?: string;
  footer?: React.ReactNode;
  inputSlot?: React.ReactNode;
}) => {
  const [detail, setDetail] = useState<Detail>(scenario.status === "done" || scenario.status === "failed" ? "summary" : "process");
  const [showRaw, setShowRaw] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");

  const visible = useMemo(
    () => scenario.events.filter((e) => e.kind === "user" || e.kind === "agent" || matchFilter(e, filter)),
    [scenario.events, filter],
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 顶部控件 */}
      <div className="h-10 shrink-0 border-b border-border px-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex items-center bg-muted rounded-md p-0.5">
          {(["summary", "process", "all"] as Detail[]).map((d) => (
            <button
              key={d}
              onClick={() => setDetail(d)}
              className={cn(
                "px-2.5 py-1 text-[11px] rounded transition-colors",
                detail === d
                  ? "bg-background text-foreground shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {d === "summary" ? "摘要" : d === "process" ? "过程" : "全部"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-2 h-6 text-[11px] rounded-full border transition-colors",
                filter === f.key
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowRaw((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1 text-[11px] px-2 h-6 rounded border transition-colors",
            showRaw ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground",
          )}
          title="同时显示原始事件 payload"
        >
          {showRaw ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          原始事件
        </button>
      </div>

      {/* 时间线 */}
      <div className="flex-1 overflow-auto p-4 space-y-3 min-h-0">
        {visible.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">没有匹配的事件</p>
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
            return (
              <div
                key={ev.id}
                className="text-[13px] text-foreground/90 leading-relaxed whitespace-pre-wrap animate-fade-in"
              >
                {ev.text}
              </div>
            );
          }
          if (ev.kind === "summary") {
            return <div key={ev.id} className="animate-fade-in"><SummaryBlock ev={ev} /></div>;
          }
          if (ev.kind === "phase") {
            const collapsed =
              detail === "summary" && ev.status !== "running" && ev.status !== "failed";
            return (
              <div key={ev.id} className="animate-fade-in">
                {collapsed ? (
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 text-[11px] text-muted-foreground py-1 px-2 rounded hover:bg-muted/40 transition-colors"
                  >
                    <StatusDot status={ev.status} />
                    <span className="truncate text-foreground/80">{ev.title}</span>
                    {ev.durationMs && (
                      <span className="ml-auto tabular-nums">{fmtDuration(ev.durationMs)}</span>
                    )}
                  </button>
                ) : (
                  <PhaseBlock phase={ev} detail={detail} showRaw={showRaw} />
                )}
              </div>
            );
          }
          if (ev.kind === "permission") {
            return <div key={ev.id} className="animate-fade-in"><PermissionBlock ev={ev} /></div>;
          }
          if (ev.kind === "error") {
            return <div key={ev.id} className="animate-fade-in"><ErrorBlock ev={ev} /></div>;
          }
          return <NotificationBlock key={ev.id} text={ev.text} />;
        })}
        {footer && <div className="pt-1">{footer}</div>}
      </div>

      {inputSlot && <div className="shrink-0 border-t border-border bg-background">{inputSlot}</div>}
    </div>
  );
};
