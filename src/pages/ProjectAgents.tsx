import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RotateCcw, Rocket, Copy, Share2, ArrowDownToLine, Trash2 } from "lucide-react";
import { mockAgents, type Agent } from "@/data/mockData";
import { PublishAgentDialog } from "@/components/PublishAgentDialog";
import { AgentRuntimeBadge, type AgentRuntimeStatus } from "@/components/AgentRuntimeBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const runtimeStatusFor = (id: string): AgentRuntimeStatus => {
  const opts: AgentRuntimeStatus[] = ["running", "done", "starting", "failed", "stopped"];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return opts[h % opts.length];
};

const MY_AUTHOR_ID = "01441970";

const statusOptions = [
  { value: "all", label: "全部" },
  { value: "published", label: "已发布" },
  
  { value: "unpublished", label: "未发布" },
];

const ProjectAgents = () => {
  const navigate = useNavigate();

  const [searchName, setSearchName] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kindFilter] = useState<"app" | "agent">("agent");
  const [onlyMine, setOnlyMine] = useState(false);
  const [publishTarget, setPublishTarget] = useState<Agent | null>(null);
  const [unpublishTarget, setUnpublishTarget] = useState<Agent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const { toast } = useToast();

  const handleCopy = (app: Agent) => {
    const copy: Agent = {
      ...app,
      id: `${app.id}-copy-${Date.now()}`,
      name: `${app.name} 副本`,
      status: "project",
      publishScope: undefined,
      featured: false,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    setAgents((prev) => {
      const idx = prev.findIndex((a) => a.id === app.id);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    toast({ title: "复制成功", description: `已复制${app.kind === "app" ? "应用" : "智能体"}「${app.name}」` });
  };

  const handleConfirmUnpublish = () => {
    if (!unpublishTarget) return;
    setAgents((prev) => prev.map((a) => (a.id === unpublishTarget.id ? { ...a, status: "project" as const, publishScope: undefined } : a)));
    toast({ title: "已下架", description: `「${unpublishTarget.name}」已下架` });
    setUnpublishTarget(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setAgents((prev) => prev.filter((a) => a.id !== deleteTarget.id));
    toast({ title: "已删除", description: `「${deleteTarget.name}」已删除` });
    setDeleteTarget(null);
  };

  const filtered = agents.filter((app) => {
    if (searchName && !app.name.toLowerCase().includes(searchName.toLowerCase())) return false;
    if (categoryFilter !== "all" && app.category !== categoryFilter) return false;
    if (statusFilter !== "all") {
      if (statusFilter === "published" && app.status !== "published") return false;
      if (statusFilter === "pending" && app.status !== "pending") return false;
      if (statusFilter === "unpublished" && app.status !== "project") return false;
    }
    if (app.kind !== kindFilter) return false;
    if (onlyMine && app.authorId !== MY_AUTHOR_ID) return false;
    return true;
  });

  const handleReset = () => {
    setSearchName("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setOnlyMine(false);
  };

  const getStatusInfo = (app: Agent): { label: string; dot: string; text: string; bg: string } => {
    if (app.status === "published") {
      return { label: "已发布", dot: "bg-green-500", text: "text-green-700 dark:text-green-400", bg: "bg-green-500/10" };
    }
    if (app.status === "pending") {
      return { label: "待发布", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/10" };
    }
    return { label: "未发布", dot: "bg-gray-400", text: "text-muted-foreground", bg: "bg-muted" };
  };

  const usedCategories = [...new Set(agents.map((a) => a.category))];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-semibold text-primary">智能体管理</h1>
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => navigate("/create")}>
              <Plus className="w-3.5 h-3.5" />
              创建智能体
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">智能体名称</span>
            <Input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="请输入"
              className="h-8 text-xs w-40"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">智能体分类</span>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">全部</SelectItem>
                {usedCategories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">状态</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <Checkbox id="onlyMine" checked={onlyMine} onCheckedChange={(v) => setOnlyMine(!!v)} />
            <label htmlFor="onlyMine" className="text-xs text-muted-foreground cursor-pointer">我创建的</label>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleReset}>
            <RotateCcw className="w-3 h-3" />
            重 置
          </Button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((app) => (
            <div
              key={app.id}
              className="group relative border border-border rounded-lg p-4 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer bg-card overflow-hidden"
              onClick={() => navigate(app.kind === "app" ? `/app/${app.id}` : `/agent/${app.id}`)}
            >
              <div
                className={`absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  app.kind === "app"
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                }`}
              >
                {app.kind === "app" ? "应用" : "智能体"}
              </div>

              <div className="flex items-start gap-3 mb-2 pr-14">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl shrink-0">
                  {app.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm font-medium truncate max-w-[140px]">{app.name}</h3>
                    {(() => {
                      const s = getStatusInfo(app);
                      return (
                        <span className={`inline-flex items-center gap-1 px-1.5 h-5 rounded ${s.bg} ${s.text} text-[10px] font-medium`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-primary border-primary/30">{app.category}</Badge>
                    {app.featured && (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-primary border-primary/30">精选应用</Badge>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{app.description}</p>
              <div className="flex items-end justify-between gap-2 text-[11px] text-muted-foreground">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 truncate">
                    <span>{app.platform}</span>
                    <span className="truncate">{app.author}（{app.authorId}）</span>
                  </div>
                  <p className="mt-1">{app.updatedAt}更新</p>
                </div>
              </div>

              {/* Hover action bar */}
              <div
                className="absolute inset-x-0 bottom-0 px-4 py-2.5 bg-card border-t border-border flex items-center gap-4 opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="inline-flex items-center gap-1 text-xs text-primary hover:opacity-80"
                  onClick={() => handleCopy(app)}
                >
                  <Copy className="w-3.5 h-3.5" />复制
                </button>
                {app.status === "published" ? (
                  <>
                    <button
                      className="inline-flex items-center gap-1 text-xs text-primary hover:opacity-80"
                      onClick={() => setUnpublishTarget(app)}
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />下架
                    </button>
                    <button className="inline-flex items-center gap-1 text-xs text-primary hover:opacity-80">
                      <Share2 className="w-3.5 h-3.5" />分享
                    </button>
                  </>
                ) : app.status === "pending" ? (
                  <>
                    <button
                      className="inline-flex items-center gap-1 text-xs text-primary hover:opacity-80"
                      onClick={() => {
                        setAgents((prev) => prev.map((a) => (a.id === app.id ? { ...a, status: "project" as const } : a)));
                        toast({ title: "已撤回", description: `「${app.name}」已撤回发布申请` });
                      }}
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />撤回
                    </button>
                    <button
                      className="inline-flex items-center gap-1 text-xs text-destructive hover:opacity-80"
                      onClick={() => setDeleteTarget(app)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />删除
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="inline-flex items-center gap-1 text-xs text-primary hover:opacity-80"
                      onClick={() => setPublishTarget(app)}
                    >
                      <Rocket className="w-3.5 h-3.5" />发布
                    </button>
                    <button
                      className="inline-flex items-center gap-1 text-xs text-destructive hover:opacity-80"
                      onClick={() => setDeleteTarget(app)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />删除
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground">暂无匹配的应用</div>
        )}
      </div>

      <PublishAgentDialog
        open={!!publishTarget}
        onOpenChange={(o) => !o && setPublishTarget(null)}
        agentName={publishTarget?.name ?? ""}
        kind={publishTarget?.kind}
      />

      <AlertDialog open={!!unpublishTarget} onOpenChange={(o) => !o && setUnpublishTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认下架</AlertDialogTitle>
            <AlertDialogDescription>
              确定要下架「{unpublishTarget?.name}」吗？下架后将无法被其他用户访问。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUnpublish}>确认下架</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「{deleteTarget?.name}」吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default ProjectAgents;
