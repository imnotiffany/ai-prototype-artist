import { useState } from "react";
import { Search, Clock, MessageSquare, Globe, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMarketplaceAgents, categories, type Agent } from "@/data/mockData";

type KindFilter = "all" | "app" | "agent";

const openAgent = (a: Agent, navigate: (p: string) => void) => {
  if (a.kind === "app") navigate(`/app/${a.id}`);
  else navigate(`/chat/${a.id}`);
};

const AgentMarketplace = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [sortBy, setSortBy] = useState<"latest" | "downloads">("latest");

  const allPublished = getMarketplaceAgents();

  const filtered = allPublished
    .filter((a) => {
      const matchSearch =
        !search ||
        a.name.includes(search) ||
        a.description.includes(search) ||
        a.tags.some((t) => t.includes(search));
      const matchCategory = !activeCategory || a.category === activeCategory;
      const matchKind = kindFilter === "all" || a.kind === kindFilter;
      return matchSearch && matchCategory && matchKind;
    })
    .sort((a, b) =>
      sortBy === "downloads"
        ? b.downloads - a.downloads
        : b.updatedAt.localeCompare(a.updatedAt)
    );

  const kindTabs: { value: KindFilter; label: string }[] = [
    { value: "all", label: "全部" },
    { value: "app", label: "应用" },
    { value: "agent", label: "Agent" },
  ];

  return (
    <div className="flex-1 overflow-auto animate-fade-in">
      {/* Hero */}
      <div className="pt-12 pb-6 text-center">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          精选好物，
          <span className="text-primary font-bold">即刻慧用</span>
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          精选全场景应用、智能体与技能，汇聚实战力量，让业务化繁为简
        </p>
      </div>

      {/* Search bar */}
      <div className="flex items-center justify-center gap-2 mb-4 px-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索应用 / Agent"
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

      {/* Type filter (app vs agent) */}
      <div className="flex items-center justify-center gap-1 mb-4 px-6">
        <div className="inline-flex items-center bg-muted rounded-md p-0.5">
          {kindTabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setKindFilter(t.value)}
              className={`px-4 py-1 text-xs rounded transition-colors ${
                kindFilter === t.value
                  ? "bg-background text-foreground shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
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
          全部分类
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
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
      <div className="px-6 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {filtered.map((agent) => {
            const isApp = agent.kind === "app";
            return (
              <div
                key={agent.id}
                className="relative border border-border rounded-lg p-4 hover:shadow-sm hover:border-primary/40 transition-all cursor-pointer bg-card"
                onClick={() => openAgent(agent, navigate)}
              >
                {/* Kind corner badge */}
                <div
                  className={`absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    isApp
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                  }`}
                >
                  {isApp ? <Globe className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                  {isApp ? "应用" : "Agent"}
                </div>

                <div className="flex items-start gap-2.5 mb-2 pr-12">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg shrink-0">
                    {agent.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-medium text-foreground truncate">{agent.name}</h3>
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
                <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                  {agent.description}
                </p>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-3">
                  <span className="truncate">{agent.platform} · {agent.author}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {agent.updatedAt}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full h-7 text-xs gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast({
                      title: "已复制到「我的项目」",
                      description: `${agent.name} 配置已克隆，可立即体验`,
                    });
                    navigate("/project-agents");
                  }}
                >
                  <Zap className="w-3 h-3" />
                  快速体验
                </Button>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground">暂无匹配的内容</div>
        )}
      </div>
    </div>
  );
};

export default AgentMarketplace;

