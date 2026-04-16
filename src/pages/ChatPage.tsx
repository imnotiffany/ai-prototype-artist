import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Square, ChevronRight, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { mockAgents } from "@/data/mockData";

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
  const [showDebug, setShowDebug] = useState(true);

  if (!agent) return <div className="p-6">智能体不存在</div>;

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsRunning(true);

    // Simulate tool call based on agent's actual skills
    const firstSkill = agent.skills[0];
    setTimeout(() => {
      if (firstSkill) {
        setMessages((prev) => [...prev, { role: "tool", content: `正在调用 ${firstSkill} 工具…`, toolName: firstSkill }]);
      }
    }, 800);

    // Simulate agent response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: "根据搜索结果，我已经找到了相关信息。以下是我的分析：\n\n1. **关键发现**：数据显示近期趋势明显\n2. **建议操作**：建议进一步深入分析\n3. **参考来源**：已附上相关文档链接" },
      ]);
      setIsRunning(false);
    }, 2000);
  };

  return (
    <div className="flex h-full animate-fade-in">
      {/* Left: Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-lg">
              {agent.avatar}
            </div>
            <div>
              <span className="font-medium text-sm">{agent.name}</span>
              <Badge variant="outline" className="ml-2 text-xs">运行中</Badge>
            </div>
          </div>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-muted-foreground hover:text-foreground"
          >
            {showDebug ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
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
        <div className="border-t border-border p-4">
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
              <Button size="icon" onClick={handleSend}>
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Right: Debug panel */}
      {showDebug && (
        <div className="w-80 border-l border-border flex flex-col">
          <div className="border-b border-border px-4 py-3">
            <div className="flex gap-2">
              <button className="text-sm font-medium text-primary border-b-2 border-primary pb-1">Transcript</button>
              <button className="text-sm text-muted-foreground pb-1 hover:text-foreground">Debug</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-3 text-xs">
            {messages.map((msg, i) => (
              <div key={i} className="p-2 rounded bg-secondary">
                <div className="font-medium text-muted-foreground mb-1">
                  {msg.role === "user" ? "👤 User" : msg.role === "tool" ? `🔧 ${msg.toolName}` : "🤖 Agent"}
                </div>
                <div className="text-foreground truncate">{msg.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
