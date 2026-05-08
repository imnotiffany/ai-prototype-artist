import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RotateCcw, Rocket } from "lucide-react";
import { mockAgents, type Agent } from "@/data/mockData";
import { PublishAgentDialog } from "@/components/PublishAgentDialog";
import { AgentRuntimeBadge, type AgentRuntimeStatus } from "@/components/AgentRuntimeBadge";

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
  const [kindFilter, setKindFilter] = useState<"all" | "app" | "agent">("all");
  const [onlyMine, setOnlyMine] = useState(false);
  const [publishTarget, setPublishTarget] = useState<Agent | null>(null);

  const mockVersionsFor = (a: Agent) => [
    { v: "v0.0.3", at: "2026-04-25 14:02", note: "新增 丰景台数据查询v2", current: true },
    { v: "v0.0.2", at: "2026-04-18 09:30", note: "调整 system prompt 风格" },
    { v: "v0.0.1", at: "2026-04-10 16:45", note: "初始版本" },
  ];

  const filtered = mockAgents.filter((app) => {
    if (searchName && !app.name.toLowerCase().includes(searchName.toLowerCase())) return false;
    if (categoryFilter !== "all" && app.category !== categoryFilter) return false;
    if (statusFilter !== "all") {
      if (statusFilter === "marketplace" && !(app.status === "published" && app.publishScope === "marketplace")) return false;
      if (statusFilter === "project" && !(app.status === "published" && app.publishScope === "project")) return false;
      if (statusFilter === "unpublished" && app.status !== "project") return false;
    }
    if (kindFilter !== "all" && app.kind !== kindFilter) return false;
    if (onlyMine && app.authorId !== MY_AUTHOR_ID) return false;
    return true;
  });

  const handleReset = () => {
    setSearchName("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setKindFilter("all");
    setOnlyMine(false);
  };

  const getStatusInfo = (app: Agent): { label: string; dot: string; text: string; bg: string } => {
    if (app.status === "published" && app.publishScope === "marketplace") {
      return { label: "已发布广场", dot: "bg-green-500", text: "text-green-700 dark:text-green-400", bg: "bg-green-500/10" };
    }
    if (app.status === "published" && app.publishScope === "project") {
      return { label: "已发布项目", dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-400", bg: "bg-blue-500/10" };
    }
    return { label: "未发布", dot: "bg-gray-400", text: "text-muted-foreground", bg: "bg-muted" };
  };

  const usedCategories = [...new Set(mockAgents.map((a) => a.category))];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-semibold text-primary">项目管理</h1>
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => navigate("/create")}>
              <Plus className="w-3.5 h-3.5" />
              创建应用
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">应用名称</span>
            <Input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="请输入"
              className="h-8 text-xs w-40"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">应用分类</span>
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
            <span className="text-xs text-muted-foreground whitespace-nowrap">类型</span>
            <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as "all" | "app" | "agent")}>
              <SelectTrigger className="h-8 text-xs w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">全部</SelectItem>
                <SelectItem value="app" className="text-xs">应用</SelectItem>
                <SelectItem value="agent" className="text-xs">智能体</SelectItem>
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
              className="relative border border-border rounded-lg p-4 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer bg-card"
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
                {app.kind !== "app" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] gap-1 shrink-0"
                    onClick={(e) => { e.stopPropagation(); setPublishTarget(app); }}
                  >
                    <Rocket className="w-3 h-3" />发布
                  </Button>
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
        versions={publishTarget ? mockVersionsFor(publishTarget) : []}
        kind={publishTarget?.kind}
      />
    </div>
  );
};

export default ProjectAgents;
