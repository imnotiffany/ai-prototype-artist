import { useState, useRef, useEffect } from "react";
import { Send, Code2, Eye, Upload, Download, FileCode } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

let msgId = 0;
const uid = () => `web-msg-${++msgId}`;

const CreateWebPage = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: uid(), role: "assistant", content: "你好，我可以帮你快速生成可运行的网页应用。你想做一个什么应用？" },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [view, setView] = useState<"preview" | "code">("preview");
  const [hasGenerated, setHasGenerated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    setMessages((prev) => [...prev, { id: uid(), role: "user", content: text }]);
    setIsStreaming(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", content: "好的，我正在为你生成应用，请稍等..." },
      ]);
      setHasGenerated(true);
      setIsStreaming(false);
    }, 1500);
  };

  const handlePublish = () => {
    if (!hasGenerated) {
      toast({ title: "暂无可发布的应用", description: "请先生成应用后再发布到广场" });
      return;
    }
    toast({ title: "已提交发布", description: "应用正在审核，稍后会出现在数字同事" });
  };

  const handleDownload = () => {
    if (!hasGenerated) {
      toast({ title: "暂无可下载的源码", description: "请先生成应用后再下载" });
      return;
    }
    toast({ title: "开始下载", description: "源代码压缩包正在准备..." });
  };

  return (
    <div className="flex-1 h-full">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left: Chat */}
        <ResizablePanel defaultSize={38} minSize={28}>
          <div className="flex flex-col h-full bg-muted/20">
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                      <span className="text-xs">🤖</span>
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
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
                  placeholder="描述你想要的应用... (可粘贴/拖拽图片)"
                  rows={2}
                  className="w-full resize-none bg-card border border-border rounded-lg px-3 py-2.5 pr-20 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  </Button>
                  <Button size="icon" className="h-7 w-7" onClick={handleSend} disabled={!input.trim() || isStreaming}>
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right: Preview / Code with fixed toolbar */}
        <ResizablePanel defaultSize={62} minSize={30}>
          <div className="h-full flex flex-col bg-background">
            {/* Fixed toolbar — always visible */}
            <div className="h-12 px-3 border-b border-border flex items-center justify-between shrink-0 bg-card/40">
              <Tabs value={view} onValueChange={(v) => setView(v as "preview" | "code")}>
                <TabsList className="h-8">
                  <TabsTrigger value="preview" className="h-6 text-xs gap-1.5 px-2.5">
                    <Eye className="w-3.5 h-3.5" />
                    预览网页
                  </TabsTrigger>
                  <TabsTrigger value="code" className="h-6 text-xs gap-1.5 px-2.5">
                    <FileCode className="w-3.5 h-3.5" />
                    预览代码
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleDownload}>
                  <Download className="w-3.5 h-3.5" />
                  下载源码
                </Button>
                <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handlePublish}>
                  <Upload className="w-3.5 h-3.5" />
                  发布到广场
                </Button>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-auto">
              {!hasGenerated ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <Code2 className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium text-foreground/60">暂未生成应用</p>
                  <p className="text-xs mt-1 text-muted-foreground/60">
                    {view === "preview" ? "生成后的网页预览会展示在这里" : "生成后的多文件代码会展示在这里"}
                  </p>
                </div>
              ) : view === "preview" ? (
                <div className="h-full flex items-center justify-center bg-muted/10">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Eye className="w-7 h-7 text-primary" />
                    </div>
                    <p className="text-sm font-medium">网页预览</p>
                    <p className="text-xs text-muted-foreground mt-1">这里会渲染生成的应用</p>
                  </div>
                </div>
              ) : (
                <pre className="p-4 text-xs font-mono text-foreground/80 leading-relaxed">
{`// src/App.tsx
export default function App() {
  return (
    <div className="p-8">
      <h1>Hello from your generated app</h1>
    </div>
  );
}`}
                </pre>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default CreateWebPage;
