import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Square, ChevronRight, Info, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockAgents, sharedResources } from "@/data/mockData";

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
  const [detailOpen, setDetailOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);

  if (!agent) return <div className="p-6">智能体不存在</div>;

  const skillDetails = agent.skills.map((s) => {
    const res = sharedResources.find((r) => r.name === s && r.type === "skill");
    return { name: s, description: res?.description ?? "" };
  });
  const mcpDetails = agent.mcpServers.map((s) => {
    const res = sharedResources.find((r) => r.name === s && r.type === "mcp");
    return { name: s, description: res?.description ?? "" };
  });

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
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

  return (
    <div className="flex flex-col h-full animate-fade-in">
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

        <div className="flex items-center gap-1" />
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
            <Button size="icon" onClick={handleSend}>
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-[420px] sm:max-w-[420px] overflow-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span className="text-2xl">{agent.avatar}</span>
              {agent.name}
            </SheetTitle>
            <SheetDescription>{agent.description}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4 text-sm">
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">使用次数</div>
                <div className="text-lg font-semibold mt-1">{agent.sessionCount}</div>
              </div>
              <div className="border border-border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">下载次数</div>
                <div className="text-lg font-semibold mt-1">{agent.downloads}</div>
              </div>
              <div className="border border-border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">分类</div>
                <div className="text-sm font-semibold mt-1 truncate">{agent.category}</div>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">作者</div>
              <div className="text-sm">{agent.platform} · {agent.author}（{agent.authorId}）</div>
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">挂载的 Skill</div>
              {skillDetails.length > 0 ? (
                <div className="space-y-1.5">
                  {skillDetails.map((s, i) => (
                    <div key={i} className="p-2 bg-secondary rounded text-xs">
                      <div className="font-medium">{s.name}</div>
                      {s.description && <div className="text-muted-foreground mt-0.5">{s.description}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">暂无挂载</p>
              )}
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">挂载的 MCP 服务器</div>
              {mcpDetails.length > 0 ? (
                <div className="space-y-1.5">
                  {mcpDetails.map((s, i) => (
                    <div key={i} className="p-2 bg-secondary rounded text-xs">
                      <div className="font-medium">{s.name}</div>
                      {s.description && <div className="text-muted-foreground mt-0.5">{s.description}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">暂无挂载</p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Versions drawer */}
      <Sheet open={versionsOpen} onOpenChange={setVersionsOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-auto">
          <SheetHeader>
            <SheetTitle>版本管理</SheetTitle>
            <SheetDescription>{agent.name} 的历史版本</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {agent.versions.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">暂无版本记录</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>版本号</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>大小</TableHead>
                    <TableHead>下载</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agent.versions.map((v) => (
                    <TableRow key={v.version}>
                      <TableCell className="font-medium">{v.version}</TableCell>
                      <TableCell className="text-xs">{v.createdAt}</TableCell>
                      <TableCell className="text-xs">{v.fileSize}</TableCell>
                      <TableCell className="text-xs">{v.downloads}</TableCell>
                      <TableCell>
                        <Badge variant={v.status === "published" ? "default" : "outline"} className="text-[10px]">
                          {v.status === "published" ? "已发布" : "未发布"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ChatPage;
