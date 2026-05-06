import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Square, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { mockAgents } from "@/data/mockData";
import { AgentInfoPanel } from "@/components/AgentInfoPanel";

interface Message {
  role: "user" | "agent" | "tool";
  content: string;
  toolName?: string;
}

const ChatPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const agent = mockAgents.find((a) => a.id === id);
  const [messages, setMessages] = useState<Message[]>([
    { role: "agent", content: `你好！我是 ${agent?.name ?? "智能体"}，有什么可以帮你的吗？` },
  ]);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  if (!agent) return <div className="p-6">智能体不存在</div>;

  const handleSend = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: value }]);
    setIsRunning(true);

    const firstSkill = agent.skills[0];
    setTimeout(() => {
      if (firstSkill) {
        setMessages((prev) => [...prev, { role: "tool", content: `正在调用 ${firstSkill} 工具…`, toolName: firstSkill }]);
      }
    }, 800);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: "根据搜索结果，我已经找到了相关信息。以下是我的分析：\n\n1. **关键发现**：数据显示近期趋势明显\n2. **建议操作**：建议进一步深入分析\n3. **参考来源**：已附上相关文档链接" },
      ]);
      setIsRunning(false);
    }, 2000);
  };

  // Build suggestion list from skills/category
  const suggestions = [
    `${agent.name}能帮我做什么？`,
    agent.skills[0] ? `用 ${agent.skills[0]} 帮我处理一个任务` : `给我一个示例`,
    `${agent.category}相关的最佳实践`,
  ].filter(Boolean) as string[];

  return (
    <div className="flex h-full animate-fade-in">
      {/* Left: chat column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
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

        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === "tool" ? (
                <div className="flex items-center gap-2 py-2 px-3 rounded bg-accent text-accent-foreground text-sm mx-auto w-fit">
                  <ChevronRight className="w-3.5 h-3.5" />
                  {msg.content}
                </div>
              ) : (
                <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-border p-4 shrink-0">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="输入消息，Enter 发送"
              className="flex-1"
            />
            {isRunning ? (
              <Button variant="destructive" size="icon" onClick={() => setIsRunning(false)}>
                <Square className="w-4 h-4" />
              </Button>
            ) : (
              <Button size="icon" onClick={() => handleSend()}>
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Right: info panel */}
      <AgentInfoPanel agent={agent} suggestions={suggestions} onSuggestionClick={(q) => handleSend(q)} />
    </div>
  );
};

export default ChatPage;
