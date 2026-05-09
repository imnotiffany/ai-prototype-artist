import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Monitor, Bot, ArrowRight, Clock, Flame, Wand, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getRecentAgents, getMyAgents } from "@/data/mockData";

const tabs = [
  { key: "web", label: "网页应用", icon: Monitor },
  { key: "agent", label: "智能体", icon: Bot },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const placeholders: Record<TabKey, string> = {
  web: "描述你想要创建的网页应用，例如：一个任务管理看板",
  agent: "描述你想要创建的智能体，例如：一个小红书爬虫助手",
};

const CreatePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("agent");
  const [description, setDescription] = useState("");
  const [agentMode, setAgentMode] = useState<"auto" | "manual">("auto");

  const myAgents = getMyAgents().slice(0, 3);
  const hotAgents = getRecentAgents().slice(0, 3);

  const handleCreate = () => {
    if (activeTab === "agent") {
      if (agentMode === "auto") {
        navigate("/create-agent", { state: { description } });
      } else {
        navigate("/create-agent-manual");
      }
    } else if (activeTab === "web") {
      navigate("/create-web");
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Hero */}
      <div className="pt-16 pb-8 text-center">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          一句话描述，<span className="text-primary">数字同事立马上岗</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          描述你的想法，一键快速构建功能完整的强大应用或智能体
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
          {activeTab !== "agent" && (
            <div className="p-4">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={placeholders[activeTab]}
                rows={4}
                className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none leading-relaxed"
              />
            </div>
          )}

          {activeTab === "agent" && (
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setAgentMode("auto")}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    agentMode === "auto"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Wand className={`w-3.5 h-3.5 ${agentMode === "auto" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-xs font-medium text-foreground">自动组装</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 ml-auto">推荐</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    输入需求一句话描述，AI 自动检索匹配 MCP / Skill / 子智能体 并生成智能体
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setAgentMode("manual")}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    agentMode === "manual"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <SlidersHorizontal className={`w-3.5 h-3.5 ${agentMode === "manual" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-xs font-medium text-foreground">手动组装</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    自行配置模型、提示词、MCP / Skill、子智能体，并对接至丰声 NEXT 机器人
                  </p>
                </button>
              </div>
              {agentMode === "auto" && (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="描述你想要创建的智能体，例如：一个小红书爬虫助手"
                  rows={3}
                  className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none leading-relaxed border-t border-border pt-3"
                />
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end px-4 py-3">
            <Button
              size="sm"
              className="gap-1.5 text-xs h-8 px-4"
              onClick={handleCreate}
              disabled={
                activeTab === "agent"
                  ? agentMode === "auto" && !description.trim()
                  : !description.trim()
              }
            >
              {activeTab === "agent"
                ? agentMode === "auto"
                  ? "立即生成"
                  : "进入手动组装"
                : "立即创建"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Recent & Hot sections */}
      <div className="max-w-2xl mx-auto px-6 mt-10">
        {/* My recent projects */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              近期创建
            </div>
            <button
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
              onClick={() => navigate("/project-agents")}
            >
              查看全部 →
            </button>
          </div>
          {myAgents.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {myAgents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => navigate(`/agent/${agent.id}`)}
                  className="border border-border rounded-lg p-3 hover:shadow-sm transition-shadow cursor-pointer bg-card"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{agent.avatar}</span>
                    <h4 className="text-xs font-medium text-foreground truncate">{agent.name}</h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {agent.description}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                      {agent.status === "published" ? (agent.publishScope === "marketplace" ? "已发布到广场" : "已发布到项目") : "未发布"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{agent.updatedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-muted-foreground">
              暂无近期创建的项目
            </div>
          )}
        </div>

        {/* Hot agents from marketplace */}
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
            {hotAgents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => navigate(`/agent/${agent.id}`)}
                className="border border-border rounded-lg p-3 hover:shadow-sm transition-shadow cursor-pointer bg-card"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-lg">{agent.avatar}</span>
                  <h4 className="text-xs font-medium text-foreground truncate">{agent.name}</h4>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
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
