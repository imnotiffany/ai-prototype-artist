import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockAgents, getSessionsByAgent, getChatSession, type ChatMessage } from "@/data/mockData";
import { AgentInfoPanel } from "@/components/AgentInfoPanel";
import { type ToolCall } from "@/components/ToolCallCard";
import { AIStatusPill } from "@/components/AIStatusPill";
import { RunDualView, type TranscriptEvent, type DebugEvent } from "@/components/RunViews";
import { SessionDrawer, type SessionListItem } from "@/components/SessionDrawer";
import { ChatComposer } from "@/components/ChatComposer";
import { ArtifactsDrawer } from "@/components/ArtifactsDrawer";

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
  const [artifactsOpen, setArtifactsOpen] = useState(false);
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

  // 由对话消息派生调试事件（mock）
  const { debugEvents, debugMeta } = useMemo(() => {
    const events: DebugEvent[] = [];
    const baseTs = new Date(2026, 4, 6, 10, 24, 18, 102).getTime();
    let offset = 0;
    const fmt = (ms: number) => {
      const d = new Date(baseTs + ms);
      const pad = (n: number, w = 2) => String(n).padStart(w, "0");
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
    };
    const sid = currentSessionId ?? "sess-mock";
    const model = "claude-sonnet-4-6";
    let totalTokens = 0;
    let tokensIn = 0;
    let tokensOut = 0;

    events.push({ id: `dbg-start`, ts: fmt(offset), type: "session.start", data: { session_id: sid, model } });

    messages.forEach((m, i) => {
      offset += 140 + i * 30;
      if (m.role === "user") {
        const tokens = Math.max(20, Math.round(m.content.length * 1.4));
        tokensIn += tokens;
        events.push({ id: `dbg-llm-req-${i}`, ts: fmt(offset), type: "llm.request", data: { messages: 1, tokens_in: tokens } });
      } else if (m.role === "tools") {
        m.calls.forEach((c, ci) => {
          offset += 200;
          events.push({
            id: `dbg-tc-${i}-${ci}`,
            ts: fmt(offset),
            type: "tool.call",
            data: { name: c.name, args: Object.fromEntries((c.params ?? []).map((p) => [p.key, p.value])) },
          });
          offset += 800;
          events.push({
            id: `dbg-tr-${i}-${ci}`,
            ts: fmt(offset),
            type: c.status === "failed" ? "tool.error" : "tool.result",
            data: c.status === "failed"
              ? { name: c.name, error: c.error ?? "failed" }
              : { name: c.name, items: c.resultItems?.length ?? 0, summary: c.resultSummary },
          });
        });
      } else if (m.role === "agent") {
        const tokens = Math.max(40, Math.round(m.content.length * 1.5));
        tokensOut += tokens;
        offset += 600;
        events.push({ id: `dbg-llm-resp-${i}`, ts: fmt(offset), type: "llm.response", data: { tokens_out: tokens, finish_reason: "stop" } });
      }
    });

    totalTokens = tokensIn + tokensOut;
    offset += 110;
    events.push({
      id: `dbg-end`,
      ts: fmt(offset),
      type: "session.end",
      data: { status: isRunning ? "running" : "success", total_ms: offset, total_tokens: totalTokens },
    });

    const sec = Math.floor(offset / 1000);
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    return {
      debugEvents: events,
      debugMeta: [
        { label: "模型", value: model },
        { label: "总耗时", value: `00:${mm}:${ss}` },
        { label: "总 tokens", value: String(totalTokens) },
      ],
    };
  }, [messages, currentSessionId, isRunning]);


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
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-primary border-primary/30 shrink-0">
                智能体
              </Badge>
            </div>
          </div>
        </div>

        {/* Messages — 同步对话视图与调试视图 */}
        <div className="flex-1 min-h-0">
          <RunDualView
            showTranscriptSearch={false}
            showAvatars
            agentAvatar={agent.avatar}
            transcriptEvents={messages.map<TranscriptEvent>((m, i) => {
              if (m.role === "tools") return { id: `t${i}`, type: "tools", calls: m.calls };
              if (m.role === "user") return { id: `u${i}`, type: "user", content: m.content };
              return { id: `a${i}`, type: "agent", content: m.content };
            })}
            debugEvents={debugEvents}
            debugMeta={debugMeta}
            transcriptFooter={isRunning ? <AIStatusPill /> : undefined}
            toolbarRight={
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setArtifactsOpen(true)}>
                <FolderOpen className="w-3.5 h-3.5" />
                产物
              </Button>
            }
          />
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 shrink-0">
          <ChatComposer
            value={input}
            onChange={setInput}
            onSend={({ text }) => handleSend(text)}
            isStreaming={isRunning}
            onStop={stop}
            placeholder="输入消息，Enter 发送"
          />
        </div>
      </div>

      <ArtifactsDrawer open={artifactsOpen} onOpenChange={setArtifactsOpen} title={`${agent.name} · 产物`} />

      <AgentInfoPanel agent={agent} suggestions={suggestions} onSuggestionClick={(q) => handleSend(q)} />
    </div>
  );
};

export default ChatPage;
