import { useState, useMemo } from "react";
import { Search, Clock, MessageSquare, Globe, Zap, Plus, ChevronDown, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { mockAgents, SKILL_CATEGORIES, type Agent } from "@/data/mockData";

type KindFilter = "app" | "agent";

const openAgent = (a: Agent, navigate: (p: string) => void) => {
  if (a.kind === "app") navigate(`/app/${a.id}`);
  else navigate(`/chat/${a.id}`);
};

const AgentMarketplace = () => {
  const navigate = useNavigate();
  const [scopeTab, setScopeTab] = useState<"marketplace" | "project">("marketplace");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [sortBy, setSortBy] = useState<"latest" | "downloads">("latest");
  const [catPopOpen, setCatPopOpen] = useState(false);

  const allPublished = mockAgents.filter(
    (a) => a.status === "published" && a.publishScope === scopeTab
  );

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
    { value: "app", label: "应用" },
    { value: "agent", label: "智能体" },
  ];

  return (
    <div className="flex-1 overflow-auto animate-fade-in">
      {/* Top tabs */}
      <div className="px-6 pt-4 border-b border-border">
        <div className="flex items-center gap-6">
          {([
            { value: "marketplace", label: "作品广场" },
            { value: "project", label: "项目作品" },
          ] as const).map((t) => (
            <button
              key={t.value}
              onClick={() => setScopeTab(t.value)}
              className={`relative pb-3 text-sm transition-colors ${
                scopeTab === t.value
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {scopeTab === t.value && (
                <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div className="pt-6 pb-6 text-center">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          数字同事就位，
          <span className="text-primary font-bold">组建你的专属团队</span>
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          精选全场景应用及智能体，汇聚实战力量，让业务化繁为简
        </p>
      </div>

      {/* Search bar */}
      <div className="flex items-center justify-center gap-2 mb-4 px-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索应用或智能体"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-xs pr-9"
          />
        </div>
        <Button
          size="sm"
          variant="default"
          className="h-9 text-xs px-4 shrink-0 gap-1.5"
          onClick={() => navigate("/create")}
        >
          <Plus className="w-3.5 h-3.5" />
          新建作品
        </Button>
      </div>

      {/* Category filters + sort/kind controls */}
      {(() => {
        const counts = new Map<string, number>();
        allPublished.forEach((a) => {
          if (a.category) counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
        });
        const ranked = ([...SKILL_CATEGORIES] as string[]).sort(
          (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0)
        );
        const VISIBLE = 12;
        const visible = ranked.slice(0, VISIBLE);
        const overflow = ranked.slice(VISIBLE);
        // Promote selected category into the visible row if it's currently hidden
        if (activeCategory && !visible.includes(activeCategory) && overflow.includes(activeCategory)) {
          visible.push(activeCategory);
        }
        const totalCount = allPublished.length;
        const overflowSelectedCount = activeCategory && overflow.includes(activeCategory) ? 1 : 0;

        return (
          <div className="px-6 mb-5 space-y-3">
            <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors border ${
                !activeCategory
                  ? "bg-primary/10 text-primary border-primary/30 font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              全部
            </button>
            {visible.map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(active ? null : cat)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-colors border ${
                    active
                      ? "bg-primary/10 text-primary border-primary/30 font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
            {overflow.length > 0 && (
              <Popover open={catPopOpen} onOpenChange={setCatPopOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={`px-2.5 py-1 rounded-full text-xs transition-colors border inline-flex items-center gap-1 ${
                      overflowSelectedCount > 0
                        ? "bg-primary/10 text-primary border-primary/30 font-medium"
                        : "border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    更多分类
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-36" align="end">
                  <Command>
                    <CommandInput placeholder="搜索分类…" className="h-8 text-xs" />
                    <CommandList className="max-h-[280px]">
                      <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">未找到分类</CommandEmpty>
                      {ranked.map((cat) => {
                        const active = activeCategory === cat;
                        return (
                          <CommandItem
                            key={cat}
                            value={cat}
                            onSelect={() => {
                              setActiveCategory(active ? null : cat);
                              setCatPopOpen(false);
                            }}
                            className={`text-xs px-2.5 py-1.5 cursor-pointer ${
                              active ? "text-primary font-medium" : "text-foreground"
                            }`}
                          >
                            {cat}
                          </CommandItem>
                        );
                      })}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            </div>

            {/* Second row: kind filter (left) + sort (right) */}
            <div className="flex items-center gap-3 text-xs">
              <div className="inline-flex items-center bg-muted rounded-md p-0.5">
                {kindTabs.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setKindFilter(t.value)}
                    className={`px-2.5 py-0.5 text-xs rounded transition-colors ${
                      kindFilter === t.value
                        ? "bg-background text-foreground shadow-sm font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-1 text-muted-foreground">
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
                  最热
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Agent grid */}
      <div className="px-6 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((agent) => {
            const isApp = agent.kind === "app";
            const allowCopy = agent.allowCopy !== false;
            return (
              <div
                key={agent.id}
                onClick={() => openAgent(agent, navigate)}
                className="group relative border border-border rounded-lg p-3.5 bg-card hover:shadow-sm hover:border-primary/40 transition-all cursor-pointer flex flex-col"
              >
                {/* Kind badge */}
                <div
                  className={`absolute top-2.5 right-2.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    isApp
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                  }`}
                >
                  {isApp ? <Globe className="w-2.5 h-2.5" /> : <MessageSquare className="w-2.5 h-2.5" />}
                  {isApp ? "应用" : "智能体"}
                </div>

                {/* Header: icon + title */}
                <div className="flex items-start gap-2.5 mb-2 pr-12">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/10 to-secondary flex items-center justify-center text-lg shrink-0">
                    {agent.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[13px] font-semibold text-foreground truncate leading-tight">
                      {agent.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1 flex-wrap">
                      {agent.tags.slice(0, 1).map((tag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-normal bg-primary/10 text-primary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed mb-2.5">
                  {agent.description}
                </p>

                {/* Author chips */}
                <div className="flex items-center gap-1 flex-wrap mb-2">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                    {agent.platform}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground truncate max-w-[140px]">
                    {agent.author}
                    {agent.authorId ? `（${agent.authorId}）` : ""}
                  </span>
                </div>

                {/* Footer: updated time */}
                <div className="mt-auto pt-1.5 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{agent.updatedAt}更新</span>
                  {allowCopy && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toast({
                          title: `已复制${isApp ? "应用" : "智能体"}`,
                          description: `${agent.name} 已添加到「我的项目」，可在项目中继续编辑`,
                        });
                      }}
                      className="text-[10px] text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      复制到我的项目
                    </button>
                  )}
                </div>
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

