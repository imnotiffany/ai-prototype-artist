import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RotateCcw } from "lucide-react";
import { mockAgents, categories, type Agent } from "@/data/mockData";

const MY_AUTHOR_ID = "01441970";

const statusOptions = [
  { value: "all", label: "全部" },
  { value: "published", label: "已发布" },
  { value: "draft", label: "草稿" },
  { value: "project", label: "项目" },
];

const ProjectAgents = () => {
  const navigate = useNavigate();

  const [searchName, setSearchName] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [onlyMine, setOnlyMine] = useState(false);

  const filtered = mockAgents.filter((app) => {
    if (searchName && !app.name.toLowerCase().includes(searchName.toLowerCase())) return false;
    if (categoryFilter !== "all" && app.category !== categoryFilter) return false;
    if (statusFilter !== "all" && app.status !== statusFilter) return false;
    if (onlyMine && app.authorId !== MY_AUTHOR_ID) return false;
    return true;
  });

  const handleReset = () => {
    setSearchName("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setOnlyMine(false);
  };

  const getStatusBadge = (app: Agent) => {
    const badges: React.ReactNode[] = [];
    if (app.creationType === "ai") {
      badges.push(<Badge key="ai" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 text-[10px] px-1.5 h-5">AI创建</Badge>);
    }
    if (app.creationType === "upload") {
      badges.push(<Badge key="upload" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 text-[10px] px-1.5 h-5">上传</Badge>);
    }
    if (app.status === "published") {
      badges.push(<Badge key="pub" className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-[10px] px-1.5 h-5">已发布</Badge>);
    }
    if (app.status === "draft") {
      badges.push(<Badge key="draft" className="bg-gray-100 text-gray-600 hover:bg-gray-100 border-0 text-[10px] px-1.5 h-5">草稿</Badge>);
    }
    if (app.status === "project") {
      badges.push(<Badge key="proj" className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0 text-[10px] px-1.5 h-5">项目</Badge>);
    }
    return badges;
  };

  const usedCategories = [...new Set(mockAgents.map((a) => a.category))];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-base font-semibold text-primary">项目管理</h1>
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
            <span className="text-xs text-muted-foreground whitespace-nowrap">应用状态</span>
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
              className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-card"
              onClick={() => navigate(`/agent/${app.id}`)}
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl shrink-0">
                  {app.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm font-medium truncate max-w-[140px]">{app.name}</h3>
                    {getStatusBadge(app)}
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
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>{app.platform}</span>
                  <span>{app.author}（{app.authorId}）</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{app.updatedAt}更新</p>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground">暂无匹配的应用</div>
        )}
      </div>
    </div>
  );
};

export default ProjectAgents;
