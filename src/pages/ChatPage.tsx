import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { mockAgents } from "@/data/mockData";
import { AgentInfoPanel } from "@/components/AgentInfoPanel";
import { type ToolCall } from "@/components/ToolCallCard";
import { AIStatusPill } from "@/components/AIStatusPill";
import { RunTranscriptView, type TranscriptEvent } from "@/components/RunViews";

type Message =
  | { role: "user"; content: string }
  | { role: "agent"; content: string }
  | { role: "tools"; calls: ToolCall[] };

const ChatPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const agent = mockAgents.find((a) => a.id === id);
  const [messages, setMessages] = useState<Message[]>([
    { role: "agent", content: `你好！我是 ${agent?.name ?? "智能体"}，有什么可以帮你的吗？` },
  ]);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const stages = ["分析问题", "选择工具", "调用工具", "整理回答"];

  if (!agent) return <div className="p-6">智能体不存在</div>;

  // Mutate the last tools-message in place to update a single tool call status.
  const updateLastToolCall = (id: string, patch: Partial<ToolCall>) => {
    setMessages((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        const m = next[i];
        if (m.role === "tools") {
          next[i] = { ...m, calls: m.calls.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
          break;
        }
      }
      return next;
    });
  };

  const handleSend = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || isRunning) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: value }]);
    setIsRunning(true);
    setStageIndex(0);

    const firstSkill = agent.skills[0] ?? "内置推理";
    const callId = `c-${Date.now()}`;

    // stage: choose tool
    setTimeout(() => setStageIndex(1), 350);

    // stage: tool running
    setTimeout(() => {
      setStageIndex(2);
      setMessages((prev) => [
        ...prev,
        {
          role: "tools",
          calls: [
            {
              id: callId,
              kind: "skill",
              name: firstSkill,
              summary: `query: "${value.slice(0, 40)}"`,
              status: "running",
              input: JSON.stringify({ query: value }, null, 2),
            },
          ],
        },
      ]);
    }, 700);

    // stage: tool success
    setTimeout(() => {
      updateLastToolCall(callId, {
        status: "success",
        summary: `返回 3 条结果 · 412ms`,
        output: JSON.stringify(
          { results: [{ title: "示例结果 1" }, { title: "示例结果 2" }, { title: "示例结果 3" }] },
          null,
          2,
        ),
      });
      setStageIndex(3);
    }, 1500);

    // stage: agent reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content:
            "根据搜索结果，我已经找到了相关信息。以下是我的分析：\n\n1. **关键发现**：数据显示近期趋势明显\n2. **建议操作**：建议进一步深入分析\n3. **参考来源**：已附上相关文档链接",
        },
      ]);
      setIsRunning(false);
    }, 2200);
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
        <div className="flex-1 min-h-0 flex flex-col">
          <RunTranscriptView
            showSearch={false}
            events={messages.map<TranscriptEvent>((m, i) => {
              if (m.role === "tools") return { id: `t${i}`, type: "tools", calls: m.calls };
              if (m.role === "user") return { id: `u${i}`, type: "user", content: m.content };
              return { id: `a${i}`, type: "agent", content: m.content };
            })}
          />
          {isRunning && (
            <div className="px-4 pb-2 shrink-0">
              <AIStatusPill stages={stages} stageIndex={stageIndex} />
            </div>
          )}
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
