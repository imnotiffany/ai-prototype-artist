import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Folder, FileCode, ChevronRight, ChevronDown, Package, Rocket, Bot } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
}

let msgId = 0;
const uid = () => `skill-msg-${++msgId}`;

const MOCK_FILE_TREE: FileNode[] = [
  {
    name: "markdown-to-pdf",
    type: "folder",
    children: [
      { name: "skill.yaml", type: "file" },
      { name: "main.py", type: "file" },
      {
        name: "utils",
        type: "folder",
        children: [
          { name: "converter.py", type: "file" },
          { name: "styles.py", type: "file" },
        ],
      },
      { name: "requirements.txt", type: "file" },
      { name: "README.md", type: "file" },
    ],
  },
];

const FileTreeNode = ({ node, depth = 0 }: { node: FileNode; depth?: number }) => {
  const [open, setOpen] = useState(true);
  const isFolder = node.type === "folder";

  return (
    <div>
      <button
        onClick={() => isFolder && setOpen(!open)}
        className={`w-full flex items-center gap-1.5 py-1 px-2 text-xs hover:bg-muted/50 rounded transition-colors ${
          isFolder ? "text-foreground font-medium" : "text-muted-foreground"
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {isFolder ? (
          open ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />
        ) : (
          <FileCode className="w-3 h-3 shrink-0 text-primary/60" />
        )}
        {isFolder && <Folder className="w-3 h-3 shrink-0 text-yellow-500/80" />}
        <span className="truncate">{node.name}</span>
      </button>
      {isFolder && open && node.children?.map((child, i) => (
        <FileTreeNode key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
};

const CreateSkillPage = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      role: "assistant",
      content: "你好！我是 Skill Creator，将为你创建自定义技能。\n\n沙盒环境已就绪，请描述你想完善的方向，或者我们可以直接开始测试。",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [buildPhase, setBuildPhase] = useState<"building" | "ready">("building");
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [buildLogs, setBuildLogs] = useState<string[]>([
    "🔧 初始化沙盒环境...",
    "📦 调用 Claude Skill Creator...",
    "📝 生成 skill.yaml 配置文件",
    "🐍 创建 main.py 入口文件",
    "📂 生成 utils/converter.py",
    "📂 生成 utils/styles.py",
    "📋 生成 requirements.txt",
    "📖 生成 README.md",
    "✅ Skill 创建完成！",
  ]);
  const [visibleLogs, setVisibleLogs] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const logBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Simulate progressive log output
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < buildLogs.length) {
        setVisibleLogs((prev) => [...prev, buildLogs[i]]);
        i++;
        if (i === buildLogs.length) {
          setBuildPhase("ready");
        }
      } else {
        clearInterval(interval);
      }
    }, 600);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    logBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleLogs]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    setMessages((prev) => [...prev, { id: uid(), role: "user", content: text }]);
    setIsStreaming(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content: "已根据你的反馈更新了技能配置。右侧目录已同步刷新，你可以继续完善或点击「发布」将技能上线。",
        },
      ]);
      setIsStreaming(false);
    }, 1500);
  };

  const handlePublish = (type: "skill" | "agent") => {
    setShowPublishDialog(false);
    if (type === "agent") {
      navigate("/");
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex-1 h-full">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left: Chat */}
        <ResizablePanel defaultSize={42} minSize={28}>
          <div className="flex flex-col h-full bg-muted/20">
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                      <span className="text-[10px]">⚡</span>
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border">
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="描述你想完善的方向..."
                  rows={2}
                  className="w-full resize-none bg-card border border-border rounded-lg px-3 py-2.5 pr-12 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <Button
                  size="icon"
                  className="absolute right-2 bottom-2 h-6 w-6"
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                >
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right: Build output */}
        <ResizablePanel defaultSize={58} minSize={30}>
          <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-foreground">Skill 工作区</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  buildPhase === "ready"
                    ? "bg-green-500/10 text-green-600"
                    : "bg-yellow-500/10 text-yellow-600"
                }`}>
                  {buildPhase === "ready" ? "就绪" : "构建中..."}
                </span>
              </div>
              {buildPhase === "ready" && (
                <Button
                  size="sm"
                  className="h-7 text-[11px] gap-1.5"
                  onClick={() => setShowPublishDialog(true)}
                >
                  <Rocket className="w-3 h-3" />
                  发布
                </Button>
              )}
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* File tree */}
              <div className="w-48 border-r border-border overflow-auto py-2">
                <div className="px-3 mb-2">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">文件目录</span>
                </div>
                {buildPhase === "ready" ? (
                  MOCK_FILE_TREE.map((node, i) => <FileTreeNode key={i} node={node} />)
                ) : (
                  <div className="px-3 text-[10px] text-muted-foreground animate-pulse">生成中...</div>
                )}
              </div>

              {/* Build logs */}
              <div className="flex-1 overflow-auto p-4 font-mono">
                <div className="space-y-1.5">
                  {visibleLogs.map((log, i) => (
                    <div key={i} className="text-[11px] text-muted-foreground leading-relaxed">
                      <span className="text-foreground/40 mr-2 select-none">{String(i + 1).padStart(2, "0")}</span>
                      {log}
                    </div>
                  ))}
                  <div ref={logBottomRef} />
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">发布技能</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <button
              onClick={() => handlePublish("skill")}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <div className="text-xs font-medium text-foreground">发布到技能广场</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">作为独立 Skill 包供他人引用</div>
              </div>
            </button>
            <button
              onClick={() => handlePublish("agent")}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <div className="text-xs font-medium text-foreground">发布为智能体</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">直接发布到智能广场，他人可直接调用</div>
              </div>
            </button>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowPublishDialog(false)}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateSkillPage;
