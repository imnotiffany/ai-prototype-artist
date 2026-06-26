import { useState } from "react";
import { ChevronRight, ChevronLeft, Wand2, Wrench, Server, User, Calendar, Tag, Bot, Sparkles } from "lucide-react";
import type { Agent } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { getLatestSkillVersion } from "@/lib/skillVersion";
import { OFFICE_MCP_SKUS, OFFICE_SKILL_SKUS } from "@/components/OfficeSuiteSection";

interface Props {
  agent: Agent;
  /** Suggested questions (optional, mainly for chat agents) */
  suggestions?: string[];
  onSuggestionClick?: (q: string) => void;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
}

export const AgentInfoPanel = ({ agent, suggestions, onSuggestionClick, defaultCollapsed }: Props) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);
  const isApp = agent.kind === "app";

  if (collapsed) {
    return (
      <div className="border-l border-border bg-card/30 flex flex-col items-center py-3 w-9 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
          title="展开详情"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="mt-3 [writing-mode:vertical-rl] text-[11px] text-muted-foreground tracking-widest">
          {isApp ? "应用详情" : "智能体详情"}
        </div>
      </div>
    );
  }

  return (
    <aside className="w-[280px] shrink-0 border-l border-border bg-card/30 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-12 px-3 border-b border-border flex items-center justify-between shrink-0">
        <span className="text-xs font-medium text-foreground">
          {isApp ? "应用详情" : "智能体详情"}
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
          title="收起"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Hero */}
        <div className="flex flex-col items-center text-center pt-1">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-secondary flex items-center justify-center text-3xl mb-2">
            {agent.avatar}
          </div>
          <h3 className="text-sm font-semibold text-foreground leading-tight">{agent.name}</h3>
          <div className="mt-1.5 flex items-center gap-1 flex-wrap justify-center">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary">
              {agent.category}
            </span>
            {agent.versions[0]?.version && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground">
                {agent.versions[0].version}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            {agent.description}
          </p>
        </div>

        {/* Tags */}
        {agent.tags.length > 0 && (
          <Section icon={Tag} title="标签">
            <div className="flex flex-wrap gap-1">
              {agent.tags.map((t, i) => (
                <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* MCP */}
        {agent.mcpServers.length > 0 && (
          <Section icon={Server} title={`MCP · ${agent.mcpServers.length}`}>
            <div className="space-y-1">
              {agent.mcpServers.map((m) => (
                <div key={m} className="text-[11px] text-foreground/80 px-2 py-1 rounded bg-secondary/60">
                  {m}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Skills */}
        {agent.skills.length > 0 && (
          <Section icon={Wrench} title={`Skill · ${agent.skills.length}`}>
            <div className="space-y-1">
              {agent.skills.map((s) => (
                <div key={s} className="text-[11px] text-foreground/80 px-2 py-1 rounded bg-secondary/60 flex items-center justify-between gap-2">
                  <span className="truncate">{s}</span>
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">{getLatestSkillVersion(s)}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Subagents */}
        {agent.subagents && agent.subagents.length > 0 && (
          <Section icon={Bot} title={`子智能体 · ${agent.subagents.length}`}>
            <div className="space-y-1">
              {agent.subagents.map((s) => (
                <div key={s} className="text-[11px] text-foreground/80 px-2 py-1 rounded bg-secondary/60">
                  {s}
                </div>
              ))}
            </div>
          </Section>
        )}


        {/* Author / Updated */}
        <Section icon={User} title="发布者">
          <div className="text-[11px] text-muted-foreground">
            {agent.author}（{agent.authorId}）· {agent.platform}
          </div>
        </Section>

        <Section icon={Calendar} title="最近更新">
          <div className="text-[11px] text-muted-foreground">
            {agent.updatedAt}
          </div>
        </Section>
      </div>
    </aside>
  );
};

const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <div>
    <div className="flex items-center gap-1.5 mb-1.5">
      <Icon className="w-3 h-3 text-muted-foreground" />
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{title}</span>
    </div>
    <div className={cn("")}>{children}</div>
  </div>
);
