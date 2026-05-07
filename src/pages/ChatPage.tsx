import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { mockAgents, getSessionsByAgent, getChatSession, type ChatMessage } from "@/data/mockData";
import { AgentInfoPanel } from "@/components/AgentInfoPanel";
import { type ToolCall } from "@/components/ToolCallCard";
import { AIStatusPill } from "@/components/AIStatusPill";
import { RunTranscriptView, type TranscriptEvent } from "@/components/RunViews";
import { SessionDrawer, type SessionListItem } from "@/components/SessionDrawer";

type Message = ChatMessage;

const ChatPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const agent = mockAgents.find((a) => a.id === id);

  const greetingFor = (name?: string): Message => ({
    role: "agent",
    content: `你好！我是 ${name ?? "智能体"}，有什么可以帮你的吗？`,
  });

  const initialSessions = useMemo<SessionListItem[]>(
    () => (agent ? getSessionsByAgent(agent.id).map((s) => ({ id: s.id, title: s.title, lastActiveAt: s.lastActiveAt })) : []),
    [agent],
  );
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

  const suggestions = [
    `${agent.name}能帮我做什么？`,
    agent.skills[0] ? `用 ${agent.skills[0]} 帮我处理一个任务` : `给我一个示例`,
    `${agent.category}相关的最佳实践`,
  ].filter(Boolean) as string[];

  return (
    <div className="flex h-full animate-fade-in">
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
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-primary border-primary/30 shrink-0">
                智能体
              </Badge>
            </div>
          </div>
        </div>

        {/* Messages — 与对话视图保持一致 */}
        <div className="flex-1 min-h-0">
          <RunTranscriptView
            showSearch={false}
            events={messages.map<TranscriptEvent>((m, i) => {
              if (m.role === "tools") return { id: `t${i}`, type: "tools", calls: m.calls };
              if (m.role === "user") return { id: `u${i}`, type: "user", content: m.content };
              return { id: `a${i}`, type: "agent", content: m.content };
            })}
            footer={isRunning ? <AIStatusPill stages={stages} stageIndex={stageIndex} /> : undefined}
          />
        </div>

        {/* Input */}
        <div className="border-t border-border p-4 shrink-0">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={isRunning ? "智能体正在处理…按 Esc 或点击停止" : "输入消息，Enter 发送"}
              disabled={isRunning}
              className="flex-1"
            />
            {isRunning ? (
              <Button variant="destructive" size="icon" onClick={stop} title="停止">
                <Square className="w-4 h-4" />
              </Button>
            ) : (
              <Button size="icon" onClick={() => handleSend()}>
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
          {isRunning && (
            <p className="text-[10px] text-muted-foreground mt-1.5 pl-1">
              点击右侧 ■ 中断当前任务
            </p>
          )}
        </div>
      </div>

      <AgentInfoPanel agent={agent} suggestions={suggestions} onSuggestionClick={(q) => handleSend(q)} />
    </div>
  );
};

export default ChatPage;
