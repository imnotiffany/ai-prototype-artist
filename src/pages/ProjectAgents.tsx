import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, RotateCcw } from "lucide-react";
import { UploadAgentDialog } from "@/components/UploadAgentDialog";


interface ProjectApp {
  id: string;
  name: string;
  avatar: string;
  category: string;
  description: string;
  platform: string;
  author: string;
  authorId: string;
  updatedAt: string;
  creationType: "ai" | "upload";
  status: "published" | "draft" | "project";
  featured?: boolean;
}

const projectApps: ProjectApp[] = [
  { id: "p1", name: "雨是神明放的烟花 副本", avatar: "🌧️", category: "视觉设计", description: "暮色里的雨，是神明燃尽的烟花余烬，千万滴雨同时坠落，落满山川湖海，让每个抬头看天的人，都能接住一场专属的绽放。", platform: "AI技术平台", author: "廖奕通", authorId: "01441970", updatedAt: "2026-04-13", creationType: "ai", status: "project" },
  { id: "p2", name: "Apple风证件照生成", avatar: "📷", category: "视觉设计", description: "上传照片智能生成专业证件照。支持多比例、多张生成及迭代优化，打造专业职场形象", platform: "AI技术平台", author: "廖奕通", authorId: "01441970", updatedAt: "2026-04-10", creationType: "ai", status: "published" },
  { id: "p3", name: "漫画工坊", avatar: "🎨", category: "视觉设计", description: "一键生成精美漫画，轻松将创意变成生动的漫画作品", platform: "AI技术平台", author: "廖奕通", authorId: "01441970", updatedAt: "2026-04-01", creationType: "ai", status: "draft" },
  { id: "p4", name: "JSON万能工具箱", avatar: "🟢", category: "技术研发", description: "集JSON格式检查、格式化、差异对比和转表格于一体的高效处理工具", platform: "AI技术平台", author: "廖奕通", authorId: "01441970", updatedAt: "2026-04-01", creationType: "ai", status: "published" },
  { id: "p5", name: "Prompt精炼大师", avatar: "🅿️", category: "技术研发", description: "智能润色优化你的Prompt，使其更完整、更有逻辑，支持中英文输出切换", platform: "AI技术平台", author: "廖奕通", authorId: "01441970", updatedAt: "2026-03-31", creationType: "ai", status: "published" },
  { id: "p6", name: "小说秒变漫画", avatar: "⬛", category: "视觉设计", description: "输入小说内容，AI自动将文字转为精美漫画画面，一键生成漫画作品。", platform: "AI技术平台", author: "廖奕通", authorId: "01441970", updatedAt: "2026-03-31", creationType: "ai", status: "draft" },
  { id: "p7", name: "实时文字转语音", avatar: "🎵", category: "精选应用", description: "实时文字转语音", platform: "AI技术平台", author: "张毅超", authorId: "01422596", updatedAt: "2026-03-25", creationType: "upload", status: "published", featured: true },
  { id: "p8", name: "豆包视频生成", avatar: "🎬", category: "视觉设计", description: "调用Seedance 1.5 Pro为您生成短视频，支持配置参考图片、时长、画幅、运镜方式", platform: "AI技术平台", author: "廖奕通", authorId: "01441970", updatedAt: "2026-03-25", creationType: "upload", status: "published" },
  { id: "p9", name: "智能重绘助手", avatar: "🎨", category: "视觉设计", description: "上传图片，AI帮你重新绘制生成新的图像", platform: "AI技术平台", author: "杨彪龙", authorId: "01419965", updatedAt: "2026-03-24", creationType: "ai", status: "project", featured: true },
];

const statusOptions = [
  { value: "all", label: "全部" },
  { value: "published", label: "已发布" },
  { value: "draft", label: "草稿" },
  { value: "project", label: "项目" },
];

const ProjectAgents = () => {
  const navigate = useNavigate();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [onlyMine, setOnlyMine] = useState(false);

  const filtered = projectApps.filter((app) => {
    if (searchName && !app.name.toLowerCase().includes(searchName.toLowerCase())) return false;
    if (categoryFilter !== "all" && app.category !== categoryFilter) return false;
    if (statusFilter !== "all" && app.status !== statusFilter) return false;
    return true;
  });

  const handleReset = () => {
    setSearchName("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setOnlyMine(false);
  };

  const getStatusBadge = (app: ProjectApp) => {
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
    if (app.status === "project") {
      badges.push(<Badge key="proj" className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0 text-[10px] px-1.5 h-5">项目</Badge>);
    }
    return badges;
  };

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
                {[...new Set(projectApps.map(a => a.category))].map((cat) => (
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

      <UploadAgentDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
};

export default ProjectAgents;
