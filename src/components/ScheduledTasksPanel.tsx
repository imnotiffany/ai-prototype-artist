import { useMemo, useState } from "react";
import { Search, X, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

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

const emptyDraft: Omit<ScheduledTask, "id" | "creator" | "createdAt" | "lastRunAt"> = {
  description: "",
  cron: "",
  triggerDesc: "",
  enabled: true,
};

export default function ScheduledTasksPanel() {
  const [tasks, setTasks] = useState<ScheduledTask[]>(initialTasks);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduledTask | null>(null);
  const [draft, setDraft] = useState({ ...emptyDraft });
  const [pendingDelete, setPendingDelete] = useState<ScheduledTask | null>(null);

  // 自然语言新建任务：创建者默认已开启，此处维护额外授权名单
  const [nlPermOpen, setNlPermOpen] = useState(false);
  const [nlAllowlist, setNlAllowlist] = useState<{ id: string; name: string; org: string }[]>([
    { id: "10086", name: "张伟", org: "智能平台部" },
    { id: "10250", name: "李娜", org: "增长中台" },
  ]);
  const [nlIdInput, setNlIdInput] = useState("");
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchText, setBatchText] = useState("");

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

  const openCreate = () => {
    setEditing(null);
    setDraft({ ...emptyDraft });
    setDialogOpen(true);
  };
  const openEdit = (t: ScheduledTask) => {
    setEditing(t);
    setDraft({ description: t.description, cron: t.cron, triggerDesc: t.triggerDesc, enabled: t.enabled });
    setDialogOpen(true);
  };

  const save = () => {
    if (!draft.description.trim() || !draft.cron.trim() || !draft.triggerDesc.trim()) {
      toast({ title: "请完善任务描述、调度表达式与触发周期", variant: "destructive" });
      return;
    }
    if (editing) {
      setTasks((prev) => prev.map((t) => (t.id === editing.id ? { ...t, ...draft } : t)));
      toast({ title: "已保存" });
    } else {
      const t: ScheduledTask = {
        id: `t-${Date.now()}`,
        creator: "当前用户",
        createdAt: now(),
        ...draft,
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
          className="h-8 text-xs gap-1.5"
          onClick={() => setNlPermOpen(true)}
          title="配置谁可以通过对话创建任务（创建者默认已开启）"
        >
          <Settings2 className="w-3.5 h-3.5" />
          对话创建权限配置
          <span className="ml-1 text-[10px] text-muted-foreground">
            创建者 + {nlAllowlist.length} 人
          </span>
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
          <div className="w-40 shrink-0 text-right">操作</div>
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
                <div className="flex-1 min-w-0 font-medium truncate" title={t.description}>
                  {t.description}
                </div>
                <div className="w-32 shrink-0 flex flex-col justify-center gap-0.5">
                  <div className="truncate" title={t.triggerDesc}>{t.triggerDesc}</div>
                  <div className="text-[11px] font-mono text-muted-foreground truncate" title={t.cron}>{t.cron}</div>
                </div>
                <div className={`w-16 shrink-0 text-[11px] ${t.enabled ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {t.enabled ? "开启" : "暂停"}
                </div>
                <div className="w-36 shrink-0 font-mono text-muted-foreground">{t.lastRunAt ?? "—"}</div>
                <div className="w-20 shrink-0 text-foreground/80 truncate">{t.creator}</div>
                <div className="w-36 shrink-0 font-mono text-muted-foreground">{t.createdAt}</div>
                <div className="w-40 shrink-0 flex items-center justify-end gap-3">
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
            <DialogDescription className="text-xs">
              配置任务的调度表达式与触发周期，任务将按周期自动执行。
            </DialogDescription>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">调度表达式</Label>
                <Input
                  value={draft.cron}
                  onChange={(e) => setDraft({ ...draft, cron: e.target.value })}
                  placeholder="0 9 * * *"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">触发周期</Label>
                <Input
                  value={draft.triggerDesc}
                  onChange={(e) => setDraft({ ...draft, triggerDesc: e.target.value })}
                  placeholder="每天 09:00"
                  className="h-8 text-xs"
                />
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
              智能体创建者默认已开启。在下方添加需要额外授权的成员，被授权成员可在会话中直接让智能体创建定时任务。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2 px-2.5 py-2 rounded border border-dashed border-border bg-muted/30">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-foreground/80">创建者</span>
              <span className="text-[11px] text-muted-foreground">已默认开启，无需配置</span>
            </div>

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
                      <span className="text-muted-foreground truncate">{m.org}</span>
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
    </div>
  );
}
