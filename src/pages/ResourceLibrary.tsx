import { useState } from "react";
import { Zap, Server, Plus, Search, Trash2, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface Resource {
  id: string;
  name: string;
  type: "skill" | "mcp";
  description: string;
  status: "active" | "inactive";
  addedAt: string;
  usageCount: number;
}

const defaultResources: Resource[] = [
  { id: "s1", name: "Web Search", type: "skill", description: "联网搜索能力，支持多搜索引擎", status: "active", addedAt: "2026-04-10", usageCount: 12 },
  { id: "s2", name: "Code Analysis", type: "skill", description: "代码分析与审查，支持多语言", status: "active", addedAt: "2026-04-08", usageCount: 8 },
  { id: "s3", name: "Email Parser", type: "skill", description: "邮件内容解析与结构化提取", status: "active", addedAt: "2026-04-05", usageCount: 5 },
  { id: "s4", name: "Translation Engine", type: "skill", description: "多语言翻译引擎，支持中英日韩", status: "active", addedAt: "2026-04-01", usageCount: 15 },
  { id: "s5", name: "Content Generation", type: "skill", description: "内容生成与创作", status: "inactive", addedAt: "2026-03-28", usageCount: 3 },
  { id: "s6", name: "SQL Generator", type: "skill", description: "SQL 查询自动生成与优化", status: "active", addedAt: "2026-03-25", usageCount: 7 },
  { id: "s7", name: "File Processor", type: "skill", description: "文件读写与格式转换", status: "active", addedAt: "2026-04-12", usageCount: 4 },
  { id: "s8", name: "Data Visualizer", type: "skill", description: "数据可视化图表生成", status: "inactive", addedAt: "2026-03-20", usageCount: 2 },
  { id: "m1", name: "GitHub MCP", type: "mcp", description: "GitHub 仓库、Issue、PR 管理", status: "active", addedAt: "2026-04-10", usageCount: 20 },
  { id: "m2", name: "Gmail MCP", type: "mcp", description: "Gmail 邮件收发与管理", status: "active", addedAt: "2026-04-08", usageCount: 10 },
  { id: "m3", name: "Slack MCP", type: "mcp", description: "Slack 消息与频道管理", status: "active", addedAt: "2026-04-05", usageCount: 6 },
  { id: "m4", name: "Notion MCP", type: "mcp", description: "Notion 页面与数据库操作", status: "active", addedAt: "2026-04-01", usageCount: 9 },
  { id: "m5", name: "Jira MCP", type: "mcp", description: "Jira 任务与项目管理", status: "inactive", addedAt: "2026-03-28", usageCount: 4 },
  { id: "m6", name: "Google Drive MCP", type: "mcp", description: "Google Drive 文件管理", status: "active", addedAt: "2026-03-25", usageCount: 11 },
  { id: "m7", name: "Confluence MCP", type: "mcp", description: "Confluence 文档协作", status: "inactive", addedAt: "2026-03-20", usageCount: 1 },
  { id: "m8", name: "Linear MCP", type: "mcp", description: "Linear 项目与 Issue 管理", status: "active", addedAt: "2026-04-13", usageCount: 3 },
];

const ResourceLibrary = () => {
  const [resources, setResources] = useState<Resource[]>(defaultResources);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "skill" | "mcp">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [newType, setNewType] = useState<"skill" | "mcp">("skill");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const filtered = resources.filter((r) => {
    if (filter !== "all" && r.type !== filter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.description.includes(search)) return false;
    return true;
  });

  const skillCount = resources.filter((r) => r.type === "skill").length;
  const mcpCount = resources.filter((r) => r.type === "mcp").length;

  const handleAdd = () => {
    if (!newName.trim()) return;
    const newResource: Resource = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      type: newType,
      description: newDesc.trim() || "自定义资源",
      status: "active",
      addedAt: new Date().toISOString().split("T")[0],
      usageCount: 0,
    };
    setResources((prev) => [newResource, ...prev]);
    setAddOpen(false);
    setNewName("");
    setNewDesc("");
    toast({ title: "资源已添加", description: `${newName} 已添加到资源库` });
  };

  const handleRemove = (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "资源已移除" });
  };

  const toggleStatus = (id: string) => {
    setResources((prev) =>
      prev.map((r) => r.id === id ? { ...r, status: r.status === "active" ? "inactive" : "active" } : r)
    );
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-foreground">资源库</h1>
            <p className="text-xs text-muted-foreground mt-1">
              集中管理 Skill 和 MCP 服务，创建智能体时可快速选用
            </p>
          </div>
          <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            添加资源
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="border border-border rounded-lg p-3 bg-card">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Package className="w-3.5 h-3.5" />
              总资源数
            </div>
            <p className="text-xl font-semibold text-foreground mt-1">{resources.length}</p>
          </div>
          <div className="border border-border rounded-lg p-3 bg-card">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="w-3.5 h-3.5" />
              Skill
            </div>
            <p className="text-xl font-semibold text-foreground mt-1">{skillCount}</p>
          </div>
          <div className="border border-border rounded-lg p-3 bg-card">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Server className="w-3.5 h-3.5" />
              MCP
            </div>
            <p className="text-xl font-semibold text-foreground mt-1">{mcpCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索资源…"
              className="pl-8 h-8 text-xs"
            />
          </div>
          <div className="flex gap-1 bg-muted/50 rounded p-0.5">
            {([
              { key: "all", label: "全部" },
              { key: "skill", label: "Skill" },
              { key: "mcp", label: "MCP" },
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  filter === f.key ? "bg-background shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground">
              暂无匹配的资源
            </div>
          ) : (
            filtered.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 border border-border rounded-lg px-4 py-3 bg-card hover:shadow-sm transition-shadow"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  r.type === "skill" ? "bg-amber-500/10" : "bg-blue-500/10"
                }`}>
                  {r.type === "skill" ? (
                    <Zap className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Server className="w-4 h-4 text-blue-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-foreground">{r.name}</p>
                    <Badge variant={r.status === "active" ? "default" : "secondary"} className="text-[9px] h-4 px-1.5">
                      {r.status === "active" ? "启用" : "停用"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{r.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground">使用 {r.usageCount} 次</p>
                  <p className="text-[10px] text-muted-foreground">{r.addedAt}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleStatus(r.id)}
                    className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-1 rounded hover:bg-muted transition-colors"
                  >
                    {r.status === "active" ? "停用" : "启用"}
                  </button>
                  <button
                    onClick={() => handleRemove(r.id)}
                    className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-muted transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">添加资源</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">类型</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as "skill" | "mcp")}>
                <SelectTrigger className="mt-1.5 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skill" className="text-xs">Skill</SelectItem>
                  <SelectItem value="mcp" className="text-xs">MCP 服务</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">名称</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1.5 h-8 text-xs" placeholder="例如：PDF Parser" />
            </div>
            <div>
              <Label className="text-xs">描述</Label>
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="mt-1.5 text-xs" rows={2} placeholder="简要描述该资源的功能" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>取消</Button>
            <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResourceLibrary;
