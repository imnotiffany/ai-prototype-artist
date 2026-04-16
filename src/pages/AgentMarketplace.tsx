import { useState } from "react";
import { Search, Download, Clock } from "lucide-react";
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
      const matchSearch =
        !search ||
        a.name.includes(search) ||
        a.description.includes(search) ||
        a.tags.some((t) => t.includes(search));
      const matchCategory = !activeCategory || a.category === activeCategory;
      return matchSearch && matchCategory;
    })
    .sort((a, b) =>
      sortBy === "downloads"
        ? b.downloads - a.downloads
        : b.updatedAt.localeCompare(a.updatedAt)
    );

  return (
    <div className="flex-1 overflow-auto animate-fade-in">
      {/* Hero */}
      <div className="pt-12 pb-6 text-center">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          精彩应用，
          <span className="text-primary font-bold">即刻慧用</span>
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          精选全场景 AI 生产力应用，汇聚实战力量，让业务化繁为简
        </p>
      </div>

      {/* Search bar */}
      <div className="flex items-center justify-center gap-2 mb-6 px-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索应用"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-xs pr-9"
          />
        </div>
        <Button
          size="sm"
          variant="default"
          className="h-9 text-xs px-4 shrink-0"
          onClick={() => navigate("/project-agents")}
        >
          我的应用
        </Button>
      </div>

      {/* Category filters */}
      <div className="flex items-center justify-center gap-1.5 mb-5 px-6 flex-wrap">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1 rounded text-xs transition-colors ${
            !activeCategory
              ? "text-primary font-medium border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          全部应用
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() =>
              setActiveCategory(activeCategory === cat ? null : cat)
            }
            className={`px-3 py-1 rounded text-xs transition-colors ${
              activeCategory === cat
                ? "text-primary font-medium border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <button
            onClick={() => setSortBy("latest")}
            className={`px-2 py-0.5 rounded ${
              sortBy === "latest"
                ? "text-primary font-medium"
                : "hover:text-foreground"
            }`}
          >
            最新
          </button>
          <span className="text-border">|</span>
          <button
            onClick={() => setSortBy("downloads")}
            className={`px-2 py-0.5 rounded ${
              sortBy === "downloads"
                ? "text-primary font-medium"
                : "hover:text-foreground"
            }`}
          >
            下载量
          </button>
        </div>
      </div>

      {/* Agent grid */}
      <div className="px-6 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {filtered.map((agent) => (
            <div
              key={agent.id}
              className="border border-border rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer bg-card"
              onClick={() => navigate(`/agent/${agent.id}`)}
            >
              <div className="flex items-start gap-2.5 mb-2">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg shrink-0">
                  {agent.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-medium text-foreground truncate">
                    {agent.name}
                  </h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    {agent.tags.slice(0, 1).map((tag, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 text-primary border-primary/30"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                {agent.description}
              </p>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="truncate">
                  {agent.platform} · {agent.author}（{agent.authorId}）
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                {agent.updatedAt}更新
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AgentMarketplace;
