import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockAgents, getSessionsByAgent, getChatSession, type ChatMessage } from "@/data/mockData";
import { AgentInfoPanel } from "@/components/AgentInfoPanel";
import { type ToolCall } from "@/components/ToolCallCard";
import { AIStatusPill } from "@/components/AIStatusPill";

import { SessionDrawer, type SessionListItem } from "@/components/SessionDrawer";
import { ChatComposer, type ChatComposerPayload } from "@/components/ChatComposer";
import { ArtifactsDrawer } from "@/components/ArtifactsDrawer";
import { mockArtifacts, guessTypeFromName, type Artifact } from "@/data/artifacts";
import { RunTimelineView } from "@/components/RunTimelineView";
import { TIMELINE_SCENARIOS, getTimelineScenario } from "@/data/timelineMock";

type Message = ChatMessage;

const ChatPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const agent = mockAgents.find((a) => a.id === id);

  const greetingFor = (name?: string): Message => ({
    role: "agent",
    content: `你好！我是 ${name ?? "智能体"}，有什么可以帮你的吗？`,
  });

  const initialSessions = useMemo<SessionListItem[]>(() => {
    const real = agent ? getSessionsByAgent(agent.id).map((s) => ({ id: s.id, title: s.title, lastActiveAt: s.lastActiveAt })) : [];
    // 注入"新方案"演示会话，方便预览不同场景
    const demo = TIMELINE_SCENARIOS.map((s) => ({ id: s.id, title: `[演示] ${s.title}`, lastActiveAt: "刚刚" }));
    return [...demo, ...real];
  }, [agent]);
  const [sessions, setSessions] = useState<SessionListItem[]>(initialSessions);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessions[0]?.id ?? null);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);

  const [messages, setMessages] = useState<Message[]>(() => {
    const first = initialSessions[0];
    const full = first ? getChatSession(first.id) : undefined;
    return full?.messages ?? [greetingFor(agent?.name)];
  });

  // 切换 agent 时重置
  useEffect(() => {
    setSessions(initialSessions);
    const first = initialSessions[0];
    setCurrentSessionId(first?.id ?? null);
    const full = first ? getChatSession(first.id) : undefined;
    setMessages(full?.messages ?? [greetingFor(agent?.name)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.id]);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const stages = ["分析问题", "选择工具", "调用工具", "整理回答"];
  /** 「文件」侧栏开关 + 用户上传的会话文件 */
  const [artifactsOpen, setArtifactsOpen] = useState(false);
  const [sessionArtifacts, setSessionArtifacts] = useState<Artifact[]>([]);
  const mergedArtifacts = useMemo(() => [...sessionArtifacts, ...mockArtifacts], [sessionArtifacts]);
  /** 自动弹开记号：首次上传 / 首次产物，各只触发一次；用户主动收起后均不再自动弹开 */
  const autoOpenedRef = useRef({ upload: false, output: false });
  const handleArtifactsOpenChange = useCallback((v: boolean) => {
    setArtifactsOpen(v);
    if (!v) autoOpenedRef.current = { upload: true, output: true };
  }, []);
  const prevRunningRef = useRef(false);
  useEffect(() => {
    if (prevRunningRef.current && !isRunning) {
      if (!autoOpenedRef.current.output) {
        autoOpenedRef.current.output = true;
        setArtifactsOpen(true);
      }
    }
    prevRunningRef.current = isRunning;
  }, [isRunning]);
  const ingestUploads = useCallback((payload: ChatComposerPayload) => {
    if (!payload.attachments?.length) return;
    const now = new Date().toISOString();
    const fresh: Artifact[] = payload.attachments.map((a) => ({
      id: `up-${a.id}`,
      path: a.name,
      name: a.name,
      type: a.type ?? guessTypeFromName(a.name),
      mime: a.mime ?? "application/octet-stream",
      size: a.size,
      url: a.url ?? "#",
      createdAt: now,
      source: "user_upload",
    }));
    setSessionArtifacts((prev) => {
      if (prev.length === 0 && !autoOpenedRef.current.upload) {
        autoOpenedRef.current.upload = true;
        setArtifactsOpen(true);
      }
      return [...fresh, ...prev];
    });
  }, []);

  if (!agent) return <div className="p-6">智能体不存在</div>;

  // 更新指定 id 的工具调用（不限定哪条消息）
  const patchToolCall = (id: string, patch: Partial<ToolCall>) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.role === "tools"
          ? { ...m, calls: m.calls.map((c) => (c.id === id ? { ...c, ...patch } : c)) }
          : m,
      ),
    );
  };

  const appendToolCall = (call: ToolCall) => {
    setMessages((prev) => {
      // 追加到最后一条 tools 消息；若末尾不是 tools，则新建一条
      const last = prev[prev.length - 1];
      if (last && last.role === "tools") {
        return [...prev.slice(0, -1), { ...last, calls: [...last.calls, call] }];
      }
      return [...prev, { role: "tools", calls: [call] }];
    });
  };

  const handleSend = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || isRunning) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: value }]);
    setIsRunning(true);
    setStageIndex(0);

    const mcpName = agent.mcpServers[0] ?? "智水-MCP服务";
    const skillName = agent.skills[0] ?? "Log Analyzer";
    const mcpId = `mcp-${Date.now()}`;
    const skillId = `skill-${Date.now()}`;

    // ─ 阶段 1：选择 MCP 工具
    setTimeout(() => setStageIndex(1), 300);

    // ─ 阶段 2：调用 MCP（running）
    setTimeout(() => {
      setStageIndex(2);
      appendToolCall({
        id: mcpId,
        kind: "mcp",
        name: "query_logs",
        provider: `${mcpName}（领慧 MCP）`,
        endpoint: "mcp.smartwater.query_logs",
        summary: `查询最近 1h 的相关日志`,
        status: "running",
        params: [
          { key: "query", value: value },
          { key: "time_range", value: "last_1h" },
          { key: "limit", value: "20" },
        ],
        steps: [
          { label: "路由决策", detail: `LLM 判定需调用 ${mcpName}`, ms: 86, status: "done" },
          { label: "建立 MCP 连接", detail: "Streamable HTTP · TLS 已就绪", ms: 124, status: "done" },
          { label: "执行 query_logs", status: "running" },
        ],
      });
    }, 700);

    // ─ 阶段 3：MCP 完成
    setTimeout(() => {
      patchToolCall(mcpId, {
        status: "success",
        summary: `返回 3 条日志 · 412ms`,
        steps: [
          { label: "路由决策", detail: `LLM 判定需调用 ${mcpName}`, ms: 86, status: "done" },
          { label: "建立 MCP 连接", detail: "Streamable HTTP · TLS 已就绪", ms: 124, status: "done" },
          { label: "执行 query_logs", detail: "命中索引 logs_idx_1h", ms: 412, status: "done" },
          { label: "解析返回", detail: "JSON-RPC 200 OK · 3 条结果", ms: 18, status: "done" },
        ],
        resultSummary: "3 条结果 · 412ms",
        resultItems: [
          { title: "[ERROR] connection refused @ node-3", meta: "10:24:18" },
          { title: "[WARN] cpu usage 92% @ node-1", meta: "10:24:16" },
          { title: "[INFO] alert escalated to ops-team", meta: "10:24:15" },
        ],
      });
    }, 1500);

    // ─ 阶段 4：调用 Skill 处理 MCP 返回
    setTimeout(() => {
      appendToolCall({
        id: skillId,
        kind: "skill",
        name: skillName,
        provider: "内置 Skill",
        endpoint: "skill.log_analyzer.summarize",
        summary: "对日志做根因分析",
        status: "running",
        params: [
          { key: "logs", value: "← 来自 query_logs 的 3 条记录" },
          { key: "mode", value: "root_cause" },
        ],
        steps: [
          { label: "加载 Skill", ms: 32, status: "done" },
          { label: "推理中", status: "running" },
        ],
      });
    }, 1900);

    // ─ 阶段 5：Skill 完成 + Agent 回复
    setTimeout(() => {
      patchToolCall(skillId, {
        status: "success",
        summary: "已生成根因分析",
        steps: [
          { label: "加载 Skill", ms: 32, status: "done" },
          { label: "推理中", detail: "LLM 调用 · 1240 tokens", ms: 980, status: "done" },
          { label: "生成报告", ms: 40, status: "done" },
        ],
        resultSummary: "1 份报告",
        resultItems: [
          { title: "根因：node-3 网络抖动导致连接被拒" },
          { title: "影响范围：3 个上游服务" },
          { title: "建议：重启 node-3 网卡，并检查交换机端口" },
        ],
      });
      setStageIndex(3);
    }, 2900);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content:
            `根据 ${mcpName} 拉取的日志和 ${skillName} 的分析，定位结果如下：\n\n` +
            "1. **根因**：node-3 网络抖动，导致 connection refused\n" +
            "2. **影响**：3 个上游服务受影响\n" +
            "3. **建议**：重启 node-3 网卡，并联系网络组检查交换机端口",
        },
      ]);
      setIsRunning(false);
    }, 3300);
  };

  const stop = () => {
    setIsRunning(false);
    setMessages((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        const m = next[i];
        if (m.role === "tools") {
          next[i] = {
            ...m,
            calls: m.calls.map((c) => (c.status === "running" ? { ...c, status: "failed", error: "用户中断" } : c)),
          };
          break;
        }
      }
      return next;
    });
  };

  const handleSelectSession = (sid: string) => {
    if (isRunning) return;
    setCurrentSessionId(sid);
    const full = getChatSession(sid);
    setMessages(full?.messages ?? [greetingFor(agent.name)]);
  };

  const handleNewSession = () => {
    if (isRunning) return;
    const newId = `cs-new-${Date.now()}`;
    const now = new Date().toISOString().replace("T", " ").slice(0, 16);
    setSessions((prev) => [{ id: newId, title: "新会话", lastActiveAt: now }, ...prev]);
    setCurrentSessionId(newId);
    setMessages([greetingFor(agent.name)]);
  };

  const handleRenameSession = (sid: string, title: string) => {
    setSessions((prev) => prev.map((s) => (s.id === sid ? { ...s, title } : s)));
  };

  const handleDeleteSession = (sid: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== sid);
      if (sid === currentSessionId) {
        const fallback = next[0];
        setCurrentSessionId(fallback?.id ?? null);
        const full = fallback ? getChatSession(fallback.id) : undefined;
        setMessages(full?.messages ?? [greetingFor(agent.name)]);
      }
      return next;
    });
  };

  const suggestions = [
    `${agent.name}能帮我做什么？`,
    agent.skills[0] ? `用 ${agent.skills[0]} 帮我处理一个任务` : `给我一个示例`,
    `${agent.category}相关的最佳实践`,
  ].filter(Boolean) as string[];



  return (
    <div className="flex h-full animate-fade-in">
      <SessionDrawer
        sessions={sessions}
        currentId={currentSessionId}
        onSelect={handleSelectSession}
        onNew={handleNewSession}
        onRename={handleRenameSession}
        onDelete={handleDeleteSession}
        collapsed={drawerCollapsed}
        onToggle={() => setDrawerCollapsed((v) => !v)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-12 flex items-center justify-between border-b border-border px-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground" aria-label="返回">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-lg shrink-0">
              {agent.avatar}
            </div>
            <div className="min-w-0 flex items-center gap-2">
              <span className="font-medium text-sm truncate">{agent.name}</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] gap-1.5 px-2.5"
            onClick={() => setArtifactsOpen(true)}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            文件
            {mergedArtifacts.length > 0 && (
              <span className="ml-0.5 text-[10px] text-muted-foreground">{mergedArtifacts.length}</span>
            )}
          </Button>
        </div>

        {/* Messages — 统一走新时间线视图 */}
        <div className="flex-1 min-h-0 flex relative">
          <div className="flex-1 min-w-0 relative">
            {(() => {
              const preset = getTimelineScenario(currentSessionId);
              if (preset) {
                return (
                  <RunTimelineView
                    scenario={preset}
                    agentAvatar={agent.avatar}
                    footer={isRunning ? <AIStatusPill /> : undefined}
                  />
                );
              }

              // 实时会话：把 Message[] 转成 TimelineScenario
              const lastAgentIdx = (() => {
                for (let i = messages.length - 1; i >= 0; i--) {
                  if (messages[i].role === "agent") return i;
                }
                return -1;
              })();
              const events = messages.map((m, i) => {
                if (m.role === "user") {
                  return { id: `u${i}`, kind: "user" as const, text: m.content };
                }
                if (m.role === "agent") {
                  return {
                    id: `a${i}`,
                    kind: "agent" as const,
                    text: m.content,
                    final: i === lastAgentIdx && !isRunning,
                  };
                }
                // tools
                const subs = m.calls.map((c) => {
                  const dur = c.steps?.reduce((a, s) => a + (s.ms ?? 0), 0);
                  const params = Object.fromEntries((c.params ?? []).map((p) => [p.key, p.value]));
                  return {
                    id: c.id,
                    category: c.kind as "mcp" | "skill" | "subagent" | "search",
                    title: c.summary ? `${c.name} · ${c.summary}` : c.name,
                    status: c.status as "running" | "success" | "failed",
                    durationMs: dur && dur > 0 ? dur : undefined,
                    error: c.error,
                    raw:
                      c.params?.length || c.resultItems?.length
                        ? {
                            args: params,
                            steps: c.steps,
                            result: c.resultItems,
                            summary: c.resultSummary,
                          }
                        : undefined,
                  };
                });
                return { id: `t${i}`, kind: "events" as const, events: subs };
              });

              const scenario = {
                id: currentSessionId ?? "live",
                title: "实时会话",
                status: isRunning ? ("running" as const) : ("done" as const),
                events,
              };

              return (
                <RunTimelineView
                  scenario={scenario}
                  agentAvatar={agent.avatar}
                  footer={isRunning ? <AIStatusPill /> : undefined}
                />
              );
            })()}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 shrink-0">
          <ChatComposer
            value={input}
            onChange={setInput}
            onSend={(payload) => {
              ingestUploads(payload);
              handleSend(payload.text);
            }}
            isStreaming={isRunning}
            onStop={stop}
            placeholder="输入消息，Enter 发送"
            onOpenFiles={() => setArtifactsOpen(true)}
            mentionableFiles={mergedArtifacts}
          />
        </div>
      </div>

      <AgentInfoPanel agent={agent} suggestions={suggestions} onSuggestionClick={(q) => handleSend(q)} defaultCollapsed />
      <ArtifactsDrawer
        open={artifactsOpen}
        onOpenChange={handleArtifactsOpenChange}
        title="文件"
        artifacts={mergedArtifacts}
      />
    </div>
  );
};

export default ChatPage;
