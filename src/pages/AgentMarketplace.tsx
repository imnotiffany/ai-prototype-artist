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
    <div className="px-5 py-4 max-w-[1400px] mx-auto animate-fade-in">
      {/* Top bar: search + actions */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索名称/描述/标签"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Button size="sm" onClick={() => navigate("/create-agent")} className="gap-1 h-8 text-xs px-3">
          <Plus className="w-3.5 h-3.5" />
          创建智能体
        </Button>
        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <BookOpen className="w-3.5 h-3.5" />
          集成指南
        </button>
      </div>

      {/* Category filters */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:border-primary/50"
            }`}
          >
            {cat}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <button
            onClick={() => setSortBy("latest")}
            className={`px-2 py-0.5 rounded ${sortBy === "latest" ? "text-primary font-medium" : "hover:text-foreground"}`}
          >
            最新
          </button>
          <span className="text-border">|</span>
          <button
            onClick={() => setSortBy("downloads")}
            className={`px-2 py-0.5 rounded ${sortBy === "downloads" ? "text-primary font-medium" : "hover:text-foreground"}`}
          >
            下载量
          </button>
        </div>
      </div>

      {/* Agent grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((agent) => (
          <div
            key={agent.id}
            className="border border-border rounded-md p-3 hover:shadow-sm transition-shadow cursor-pointer bg-card group"
            onClick={() => navigate(`/agent/${agent.id}`)}
          >
            <div className="flex items-start gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center text-lg shrink-0">
                {agent.avatar}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-foreground truncate">{agent.name}</h3>
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  {agent.tags.slice(0, 3).map((tag, i) => (
                    <Badge
                      key={i}
                      variant={i === 0 ? "default" : "outline"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">{agent.description}</p>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="truncate">{agent.author} · {agent.updatedAt}</span>
              <span className="flex items-center gap-0.5 shrink-0">
                <Download className="w-3 h-3" />
                {agent.downloads}
              </span>
            </div>
            <Button
              size="sm"
              className="mt-2 w-full h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
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
