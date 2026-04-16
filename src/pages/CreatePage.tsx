import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Monitor, Bot, Zap, ArrowRight, Clock, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockAgents } from "@/data/mockData";

const tabs = [
  { key: "web", label: "网页应用", icon: Monitor },
  { key: "agent", label: "智能体", icon: Bot },
  { key: "skill", label: "技能", icon: Zap },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const placeholders: Record<TabKey, string> = {
  web: "描述你想要创建的网页应用，例如：一个任务管理看板",
  agent: "描述你想要创建的智能体，例如：一个小红书爬虫助手",
  skill: "描述你想要创建的技能，例如：一个将 Markdown 转 PDF 的技能",
};

const CreatePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("agent");
  const [description, setDescription] = useState("");

  const recentAgents = mockAgents.slice(0, 3);

  const handleCreate = () => {
    if (activeTab === "agent") {
      navigate("/create-agent");
    } else if (activeTab === "web") {
      navigate("/create-web");
    } else if (activeTab === "skill") {
      navigate("/create-skill");
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Hero */}
      <div className="pt-16 pb-8 text-center">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          描述你的想法，
          <span className="text-primary">即刻构建</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          通过自然语言快速创建网页应用、智能体或技能
        </p>
      </div>

      {/* Creation card */}
      <div className="max-w-2xl mx-auto px-6">
        <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border bg-muted/30">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors relative ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Textarea */}
          <div className="p-4">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={placeholders[activeTab]}
              rows={4}
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-4 pb-3">
            <Button
              size="sm"
              className="gap-1.5 text-xs h-8 px-4"
              onClick={handleCreate}
              disabled={!description.trim()}
            >
              立即创建
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Recent & Hot sections */}
      <div className="max-w-2xl mx-auto px-6 mt-10">
        {/* Recent */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              近期创建
            </div>
            <button className="text-xs text-muted-foreground hover:text-primary transition-colors">
              查看全部 →
            </button>
          </div>
          <div className="text-center py-8 text-xs text-muted-foreground">
            暂无近期创建的项目
          </div>
        </div>

        {/* Hot agents */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              热门应用
            </div>
            <button
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
              onClick={() => navigate("/")}
            >
              查看全部 →
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {recentAgents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => navigate(`/agent/${agent.id}`)}
                className="border border-border rounded-lg p-3 hover:shadow-sm transition-shadow cursor-pointer bg-card"
              >
                <h4 className="text-xs font-medium text-foreground truncate">{agent.name}</h4>
                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                  {agent.description}
                </p>
                <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {agent.updatedAt}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePage;
