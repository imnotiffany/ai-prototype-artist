import { useState } from "react";
import { Search, Plus, Download, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockAgents, categories } from "@/data/mockData";


const AgentMarketplace = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"latest" | "downloads">("latest");
  

  const filtered = mockAgents
    .filter((a) => {
      const matchSearch = !search || a.name.includes(search) || a.description.includes(search) || a.tags.some(t => t.includes(search));
      const matchCategory = !activeCategory || a.category === activeCategory;
      return matchSearch && matchCategory;
    })
    .sort((a, b) => sortBy === "downloads" ? b.downloads - a.downloads : b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-foreground">智能体广场</h1>
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索名称/描述/标签"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => navigate("/create-agent")} className="gap-1.5">
            <Plus className="w-4 h-4" />
            创建智能体
          </Button>
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <BookOpen className="w-4 h-4" />
            集成指南
          </button>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:border-primary/50"
            }`}
          >
            {cat}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1 text-sm text-muted-foreground">
          <span>排序方式：</span>
          <button
            onClick={() => setSortBy("latest")}
            className={`px-3 py-1 rounded ${sortBy === "latest" ? "text-primary font-medium" : "hover:text-foreground"}`}
          >
            最新发布
          </button>
          <span className="text-border">|</span>
          <button
            onClick={() => setSortBy("downloads")}
            className={`px-3 py-1 rounded ${sortBy === "downloads" ? "text-primary font-medium" : "hover:text-foreground"}`}
          >
            最多下载
          </button>
        </div>
      </div>

      {/* Agent grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((agent) => (
          <div
            key={agent.id}
            className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-card group"
            onClick={() => navigate(`/agent/${agent.id}`)}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-2xl shrink-0">
                {agent.avatar}
              </div>
              <div className="min-w-0">
                <h3 className="font-medium text-foreground truncate">{agent.name}</h3>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {agent.tags.slice(0, 3).map((tag, i) => (
                    <Badge
                      key={i}
                      variant={i === 0 ? "default" : "outline"}
                      className="text-xs"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{agent.description}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{agent.platform} | {agent.author} ({agent.authorId}) | {agent.updatedAt}更新</span>
              <span className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                {agent.downloads}
              </span>
            </div>
            <Button
              size="sm"
              className="mt-3 w-full opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/chat/${agent.id}`);
              }}
            >
              开始对话
            </Button>
          </div>
        ))}
      </div>

      
    </div>
  );
};

export default AgentMarketplace;
