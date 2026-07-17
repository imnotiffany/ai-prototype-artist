import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Search, X, ChevronDown, CheckCircle2, XCircle, Loader2, ChevronRight } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

const SINGLE_LINE_MAX_CHARS = 16;

type Freq = "hourly" | "daily" | "weekly" | "monthly" | "custom";
interface ScheduleDraft {
  frequency: Freq;
  hour: number;      // 0-23
  minute: number;    // 0-59
  weekdays: number[]; // 0=Sun..6=Sat
  dayOfMonth: number; // 1-31, 32 = 月末
  customCron: string;
}

const WEEK_LABEL = ["日", "一", "二", "三", "四", "五", "六"];
const pad = (n: number) => n.toString().padStart(2, "0");

function buildSchedule(s: ScheduleDraft): { cron: string; triggerDesc: string } {
  const hh = pad(s.hour), mm = pad(s.minute);
  const time = `${hh}:${mm}`;
  switch (s.frequency) {
    case "hourly":
      return { cron: `${s.minute} * * * *`, triggerDesc: `每小时第 ${s.minute} 分钟` };
    case "daily":
      return { cron: `${s.minute} ${s.hour} * * *`, triggerDesc: `每天 ${time}` };
    case "weekly": {
      const days = [...s.weekdays].sort((a, b) => a - b);
      const dowExpr = days.length ? days.join(",") : "1";
      const label = days.length
        ? `每周${days.map((d) => WEEK_LABEL[d]).join("、")} ${time}`
        : `每周一 ${time}`;
      return { cron: `${s.minute} ${s.hour} * * ${dowExpr}`, triggerDesc: label };
    }
    case "monthly": {
      const dom = s.dayOfMonth === 32 ? "L" : s.dayOfMonth;
      const label = s.dayOfMonth === 32 ? `每月月末 ${time}` : `每月 ${s.dayOfMonth} 日 ${time}`;
      return { cron: `${s.minute} ${s.hour} ${dom} * *`, triggerDesc: label };
    }
    case "custom":
      return { cron: s.customCron.trim() || "0 9 * * *", triggerDesc: "自定义调度" };
  }
}

function parseSchedule(cron: string, triggerDesc: string): ScheduleDraft {
  const base: ScheduleDraft = {
    frequency: "custom", hour: 9, minute: 0, weekdays: [1], dayOfMonth: 1, customCron: cron,
  };
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return base;
  const [m, h, dom, mon, dow] = parts;
  const num = (x: string) => (/^\d+$/.test(x) ? parseInt(x, 10) : NaN);
  if (mon === "*" && dow === "*" && dom === "*" && !isNaN(num(h)) && !isNaN(num(m))) {
    return { ...base, frequency: "daily", hour: num(h), minute: num(m) };
  }
  if (mon === "*" && dom === "*" && dow !== "*" && !isNaN(num(h)) && !isNaN(num(m))) {
    const days = dow.split(",").map(num).filter((x) => !isNaN(x) && x >= 0 && x <= 6);
    if (days.length) return { ...base, frequency: "weekly", hour: num(h), minute: num(m), weekdays: days };
  }
  if (mon === "*" && dow === "*" && dom !== "*" && !isNaN(num(h)) && !isNaN(num(m))) {
    const d = dom === "L" ? 32 : num(dom);
    if (!isNaN(d)) return { ...base, frequency: "monthly", hour: num(h), minute: num(m), dayOfMonth: d };
  }
  if (h === "*" && dom === "*" && mon === "*" && dow === "*" && !isNaN(num(m))) {
    return { ...base, frequency: "hourly", minute: num(m), hour: 0 };
  }
  return base;
}


export interface ScheduledTask {
  id: string;
  description: string;
  cron: string;
  triggerDesc: string;
  enabled: boolean;
  lastRunAt?: string;
  creator: string;
  createdAt: string;
}

const now = () => new Date().toISOString().slice(0, 16).replace("T", " ");

const initialTasks: ScheduledTask[] = [
  {
    id: "t1",
    description: "汇总昨日项目进展并生成晨报",
    cron: "0 9 * * *",
    triggerDesc: "每天 09:00",
    enabled: true,
    lastRunAt: "2026-07-17 09:00",
    creator: "张伟",
    createdAt: "2026-06-01 10:12",
  },
  {
    id: "t2",
    description: "汇总本周关键事项与风险",
    cron: "0 18 * * 5",
    triggerDesc: "每周五 18:00",
    enabled: true,
    lastRunAt: "2026-07-11 18:00",
    creator: "李娜",
    createdAt: "2026-05-20 15:30",
  },
  {
    id: "t3",
    description: "生成上月运营数据快照",
    cron: "0 10 1 * *",
    triggerDesc: "每月 1 日 10:00",
    enabled: false,
    lastRunAt: "2026-07-01 10:00",
    creator: "王强",
    createdAt: "2026-04-02 09:00",
  },
];

interface TaskDraft {
  description: string;
  enabled: boolean;
  schedule: ScheduleDraft;
}

const emptySchedule: ScheduleDraft = {
  frequency: "daily",
  hour: 9,
  minute: 0,
  weekdays: [1],
  dayOfMonth: 1,
  customCron: "0 9 * * *",
};

const emptyDraft: TaskDraft = {
  description: "",
  enabled: true,
  schedule: { ...emptySchedule },
};

export default function ScheduledTasksPanel() {
  const [tasks, setTasks] = useState<ScheduledTask[]>(initialTasks);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduledTask | null>(null);
  const [draft, setDraft] = useState<TaskDraft>({ ...emptyDraft });
  const [pendingDelete, setPendingDelete] = useState<ScheduledTask | null>(null);

  // 对话创建任务权限：创建者默认已开启，此处维护额外授权名单
  const [nlPermOpen, setNlPermOpen] = useState(false);
  const [nlAllowlist, setNlAllowlist] = useState<{ id: string; name: string; org: string }[]>([
    { id: "10086", name: "张伟", org: "智能平台部" },
    { id: "10250", name: "李娜", org: "增长中台" },
  ]);
  const [nlIdInput, setNlIdInput] = useState("");
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchText, setBatchText] = useState("");

  // 执行记录抽屉
  const [historyTask, setHistoryTask] = useState<ScheduledTask | null>(null);
  const navigate = useNavigate();
  const { id: agentId } = useParams();

  const addOneId = (id: string) => {
    const v = id.trim();
    if (!v) return false;
    if (nlAllowlist.some((m) => m.id === v)) return false;
    setNlAllowlist((prev) => [...prev, { id: v, name: `员工${v.slice(-3)}`, org: "—" }]);
    return true;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        t.cron.toLowerCase().includes(q) ||
        t.triggerDesc.toLowerCase().includes(q),
    );
  }, [tasks, query]);

  const preview = useMemo(() => buildSchedule(draft.schedule), [draft.schedule]);
  const setSchedule = (patch: Partial<ScheduleDraft>) =>
    setDraft((d) => ({ ...d, schedule: { ...d.schedule, ...patch } }));

  const openCreate = () => {
    setEditing(null);
    setDraft({ ...emptyDraft, schedule: { ...emptySchedule } });
    setDialogOpen(true);
  };
  const openEdit = (t: ScheduledTask) => {
    setEditing(t);
    setDraft({
      description: t.description,
      enabled: t.enabled,
      schedule: parseSchedule(t.cron, t.triggerDesc),
    });
    setDialogOpen(true);
  };

  const save = () => {
    if (!draft.description.trim()) {
      toast({ title: "请填写任务描述", variant: "destructive" });
      return;
    }
    const { cron, triggerDesc } = preview;
    if (draft.schedule.frequency === "custom" && !draft.schedule.customCron.trim()) {
      toast({ title: "请填写自定义调度表达式", variant: "destructive" });
      return;
    }
    if (draft.schedule.frequency === "weekly" && draft.schedule.weekdays.length === 0) {
      toast({ title: "请至少选择一个星期", variant: "destructive" });
      return;
    }
    if (editing) {
      setTasks((prev) => prev.map((t) =>
        t.id === editing.id ? { ...t, description: draft.description, enabled: draft.enabled, cron, triggerDesc } : t,
      ));
      toast({ title: "已保存" });
    } else {
      const t: ScheduledTask = {
        id: `t-${Date.now()}`,
        creator: "当前用户",
        createdAt: now(),
        description: draft.description,
        enabled: draft.enabled,
        cron,
        triggerDesc,

      };
      setTasks((prev) => [t, ...prev]);
      toast({ title: "已创建任务" });
    }
    setDialogOpen(false);
  };

  const toggle = (t: ScheduledTask) => {
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, enabled: !x.enabled } : x)));
  };
  const runNow = (t: ScheduledTask) => {
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, lastRunAt: now() } : x)));
    toast({ title: "已触发任务" });
  };
  const remove = (t: ScheduledTask) => {
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
    setPendingDelete(null);
    toast({ title: "已删除" });
  };

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索任务描述 / 触发周期"
            className="h-8 text-xs pl-7"
          />
        </div>
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          共 <span className="text-foreground font-medium">{tasks.length}</span> 个任务
        </div>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => setNlPermOpen(true)}
          title="配置谁可以通过对话创建任务（创建者默认已开启）"
        >
          对话创建权限配置
        </Button>
        <Button size="sm" className="h-8 text-xs" onClick={openCreate}>
          新建任务
        </Button>
      </div>

      {/* List */}
      <div className="text-xs">
        <div className="h-9 px-2 flex items-center gap-4 text-[11px] text-muted-foreground border-b border-border">
          <div className="flex-1 min-w-0">任务描述</div>
          <div className="w-32 shrink-0">触发周期</div>
          <div className="w-16 shrink-0">状态</div>
          <div className="w-36 shrink-0">最近执行时间</div>
          <div className="w-20 shrink-0">创建人</div>
          <div className="w-36 shrink-0">创建时间</div>
          <div className="w-56 shrink-0 text-right">操作</div>
        </div>
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            暂无定时任务，点击右上角「新建任务」创建
          </div>
        ) : (
          <ul>
            {filtered.map((t) => (
              <li
                key={t.id}
                className="px-2 h-12 flex items-center gap-4 border-b border-border hover:bg-muted/30 transition-colors"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex-1 min-w-0 text-xs font-medium cursor-default line-clamp-2 leading-4">
                      {t.description}
                    </div>

                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    {t.description}
                  </TooltipContent>
                </Tooltip>
                <div className="w-32 shrink-0 flex flex-col justify-center gap-0.5 text-xs">
                  <div className="truncate" title={t.triggerDesc}>{t.triggerDesc}</div>
                  <div className="text-[11px] font-mono text-muted-foreground truncate" title={t.cron}>{t.cron}</div>
                </div>

                <div className={`w-16 shrink-0 text-[11px] ${t.enabled ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {t.enabled ? "开启" : "暂停"}
                </div>
                <div className="w-36 shrink-0 font-mono text-muted-foreground">{t.lastRunAt ?? "—"}</div>
                <div className="w-20 shrink-0 text-foreground/80 truncate">{t.creator}</div>
                <div className="w-36 shrink-0 font-mono text-muted-foreground">{t.createdAt}</div>
                <div className="w-56 shrink-0 flex items-center justify-end gap-3">
                  <button className="text-[11px] text-foreground/80 hover:text-primary hover:underline" onClick={() => setHistoryTask(t)}>
                    执行记录
                  </button>
                  <button className="text-[11px] text-foreground/80 hover:text-primary hover:underline" onClick={() => openEdit(t)}>
                    编辑
                  </button>
                  <button
                    className={`text-[11px] hover:underline ${t.enabled ? "text-muted-foreground hover:text-foreground" : "text-primary"}`}
                    onClick={() => toggle(t)}
                  >
                    {t.enabled ? "停用" : "启用"}
                  </button>
                  <button className="text-[11px] text-primary hover:underline" onClick={() => runNow(t)}>
                    立即执行
                  </button>
                  <button className="text-[11px] text-destructive hover:underline" onClick={() => setPendingDelete(t)}>
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 新建 / 编辑 任务 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-sm">{editing ? "编辑任务" : "新建任务"}</DialogTitle>
            <DialogDescription className="sr-only">新建或编辑定时任务</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">任务描述</Label>
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="任务触发时下发给智能体的指令，例如：汇总昨日项目进展并生成晨报"
                className="min-h-[72px] text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">触发周期</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={draft.schedule.frequency}
                  onValueChange={(v: Freq) => setSchedule({ frequency: v })}
                >
                  <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly" className="text-xs">每小时</SelectItem>
                    <SelectItem value="daily" className="text-xs">每天</SelectItem>
                    <SelectItem value="weekly" className="text-xs">每周</SelectItem>
                    <SelectItem value="monthly" className="text-xs">每月</SelectItem>
                    <SelectItem value="custom" className="text-xs">自定义 (Cron)</SelectItem>
                  </SelectContent>
                </Select>

                {draft.schedule.frequency === "weekly" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-normal justify-between min-w-[140px]"
                      >
                        <span className="truncate">
                          {draft.schedule.weekdays.length
                            ? `周${[...draft.schedule.weekdays].sort((a, b) => a - b).map((d) => WEEK_LABEL[d]).join("、")}`
                            : "选择星期"}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-1 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-1" align="start">
                      {WEEK_LABEL.map((label, i) => {
                        const active = draft.schedule.weekdays.includes(i);
                        return (
                          <label
                            key={i}
                            className="flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted cursor-pointer"
                          >
                            <Checkbox
                              checked={active}
                              onCheckedChange={(v) =>
                                setSchedule({
                                  weekdays: v
                                    ? [...draft.schedule.weekdays, i]
                                    : draft.schedule.weekdays.filter((x) => x !== i),
                                })
                              }
                            />
                            <span>周{label}</span>
                          </label>
                        );
                      })}
                    </PopoverContent>
                  </Popover>
                )}

                {draft.schedule.frequency === "monthly" && (
                  <Select
                    value={String(draft.schedule.dayOfMonth)}
                    onValueChange={(v) => setSchedule({ dayOfMonth: parseInt(v, 10) })}
                  >
                    <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-64">
                      {Array.from({ length: 31 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">{i + 1} 日</SelectItem>
                      ))}
                      <SelectItem value="32" className="text-xs">月末</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {draft.schedule.frequency === "hourly" ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">第</span>
                    <Select
                      value={String(draft.schedule.minute)}
                      onValueChange={(v) => setSchedule({ minute: parseInt(v, 10) })}
                    >
                      <SelectTrigger className="h-8 text-xs w-20"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {Array.from({ length: 60 }, (_, i) => (
                          <SelectItem key={i} value={String(i)} className="text-xs">{pad(i)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">分</span>
                  </div>
                ) : draft.schedule.frequency === "custom" ? (
                  <Input
                    value={draft.schedule.customCron}
                    onChange={(e) => setSchedule({ customCron: e.target.value })}
                    placeholder="0 9 * * *"
                    className="h-8 text-xs font-mono flex-1 min-w-[160px]"
                  />
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-normal justify-between w-24"
                      >
                        <span className="font-mono">{pad(draft.schedule.hour)}:{pad(draft.schedule.minute)}</span>
                        <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-1 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-0" align="start">
                      <div className="grid grid-cols-2 text-xs">
                        <div className="border-r border-border">
                          <div
                            tabIndex={-1}
                            className="max-h-56 overflow-y-auto py-1"
                            style={{ scrollbarWidth: "none", msOverflowStyle: "none", overscrollBehavior: "contain" }}
                            onWheel={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.currentTarget.scrollTop += e.deltaY;
                            }}
                          >
                            {Array.from({ length: 24 }, (_, h) => {
                              const active = draft.schedule.hour === h;
                              return (
                                <button
                                  key={h}
                                  type="button"
                                  onClick={() => setSchedule({ hour: h })}
                                  className={`w-full px-3 py-1 text-left font-mono hover:bg-muted ${
                                    active ? "bg-primary/10 text-primary font-medium" : ""
                                  }`}
                                >
                                  {pad(h)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <div
                            tabIndex={-1}
                            className="max-h-56 overflow-y-auto py-1"
                            style={{ scrollbarWidth: "none", msOverflowStyle: "none", overscrollBehavior: "contain" }}
                            onWheel={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.currentTarget.scrollTop += e.deltaY;
                            }}
                          >
                            {Array.from({ length: 60 }, (_, m) => {
                              const active = draft.schedule.minute === m;
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setSchedule({ minute: m })}
                                  className={`w-full px-3 py-1 text-left font-mono hover:bg-muted ${
                                    active ? "bg-primary/10 text-primary font-medium" : ""
                                  }`}
                                >
                                  {pad(m)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground pt-1">
                预览：{preview.triggerDesc}
                <span className="font-mono ml-2">{preview.cron}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-xs text-muted-foreground">创建后立即启用</div>
              <Switch size="sm" checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={save}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">删除任务</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              确定删除该任务？删除后不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">取消</AlertDialogCancel>
            <AlertDialogAction
              className="h-8 text-xs bg-destructive hover:bg-destructive/90"
              onClick={() => pendingDelete && remove(pendingDelete)}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 对话创建任务权限配置 */}
      <Dialog open={nlPermOpen} onOpenChange={setNlPermOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-sm">对话创建任务权限配置</DialogTitle>
            <DialogDescription className="text-xs">
              在下方添加需要额外授权的成员，被授权成员可在会话中直接让智能体创建定时任务。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                value={nlIdInput}
                onChange={(e) => setNlIdInput(e.target.value)}
                placeholder="输入工号，回车添加"
                className="h-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (addOneId(nlIdInput)) setNlIdInput("");
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs whitespace-nowrap"
                onClick={() => { setBatchText(""); setBatchOpen(true); }}
              >
                批量添加
              </Button>
              <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                共 {nlAllowlist.length} 人
              </div>
            </div>

            <div className="max-h-64 overflow-auto">
              {nlAllowlist.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-muted-foreground">尚未添加成员</div>
              ) : (
                <ul>
                  {nlAllowlist.map((m) => (
                    <li
                      key={m.id}
                      className="h-9 px-2 flex items-center gap-3 text-xs border-b border-border last:border-b-0"
                    >
                      <span className="font-mono text-muted-foreground w-16 shrink-0">{m.id}</span>
                      <span className="flex-1 min-w-0 truncate">{m.name}</span>
                      <button
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setNlAllowlist((prev) => prev.filter((x) => x.id !== m.id))}
                        title="移除"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setNlPermOpen(false)}>
              取消
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setNlPermOpen(false);
                toast({ title: "已保存对话创建权限配置" });
              }}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量添加工号 */}
      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-sm">批量添加工号</DialogTitle>
            <DialogDescription className="text-xs">
              每行一个工号，或用空格 / 逗号 / 分号分隔，重复的工号会自动去重。
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            placeholder={"10086\n10250\n10333"}
            className="min-h-[160px] text-xs font-mono"
          />
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setBatchOpen(false)}>
              取消
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                const ids = batchText.split(/[\s,;，；]+/).map((x) => x.trim()).filter(Boolean);
                let added = 0;
                let skipped = 0;
                ids.forEach((id) => { addOneId(id) ? added++ : skipped++; });
                setBatchOpen(false);
                toast({ title: `已添加 ${added} 人${skipped ? `，跳过 ${skipped} 个重复/无效` : ""}` });
              }}
            >
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 执行记录抽屉 */}
      <Sheet open={!!historyTask} onOpenChange={(v) => !v && setHistoryTask(null)}>
        <SheetContent side="right" className="w-[440px] sm:max-w-[440px] p-0 flex flex-col">
          <SheetHeader className="px-5 py-4 border-b border-border shrink-0">
            <SheetTitle className="text-sm">执行记录</SheetTitle>
            <SheetDescription className="text-xs line-clamp-2">
              {historyTask?.description}
            </SheetDescription>
            <div className="text-[11px] text-muted-foreground pt-1">
              {historyTask?.triggerDesc}
              <span className="font-mono ml-2">{historyTask?.cron}</span>
            </div>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-auto">
            {historyTask && (() => {
              // 演示用：基于 lastRunAt 生成近 8 次执行记录
              const seed = historyTask.id.charCodeAt(historyTask.id.length - 1) || 0;
              const base = historyTask.lastRunAt ? new Date(historyTask.lastRunAt.replace(" ", "T")) : new Date();
              // 简易：按天回退
              const records = Array.from({ length: 8 }, (_, i) => {
                const d = new Date(base);
                d.setDate(d.getDate() - i);
                const ts = d.toISOString().slice(0, 16).replace("T", " ");
                const roll = (seed + i) % 7;
                const status: "success" | "failed" | "running" =
                  i === 0 && historyTask.enabled && roll === 6 ? "running"
                  : roll === 5 ? "failed"
                  : "success";
                const duration = status === "running" ? undefined : 800 + ((seed * 37 + i * 113) % 4200);
                return { id: `${historyTask.id}-r${i}`, ts, status, duration };
              });
              return (
                <ul className="text-xs">
                  {records.map((r) => {
                    const Icon = r.status === "success" ? CheckCircle2 : r.status === "failed" ? XCircle : Loader2;
                    const iconCls = r.status === "success" ? "text-emerald-600"
                      : r.status === "failed" ? "text-destructive" : "text-primary animate-spin";
                    const label = r.status === "success" ? "执行成功" : r.status === "failed" ? "执行失败" : "执行中";
                    return (
                      <li
                        key={r.id}
                        className="px-5 h-14 flex items-center gap-3 border-b border-border hover:bg-muted/40 cursor-pointer group"
                        onClick={() => {
                          setHistoryTask(null);
                          if (agentId) navigate(`/chat/${agentId}`);
                        }}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${iconCls}`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs">{r.ts}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {label}
                            {r.duration !== undefined && (
                              <span className="ml-2 font-mono">耗时 {(r.duration / 1000).toFixed(1)}s</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                      </li>
                    );
                  })}
                </ul>
              );
            })()}
            {historyTask && !historyTask.lastRunAt && (
              <div className="py-16 text-center text-xs text-muted-foreground">该任务暂无执行记录</div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
    </TooltipProvider>
  );
}
