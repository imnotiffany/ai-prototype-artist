import { useState, useRef, useEffect } from "react";
import { Send, Code2 } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";

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

    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", content: "好的，我正在为你生成应用，请稍等..." },
      ]);
      setIsStreaming(false);
    }, 1500);
  };

  return (
    <div className="flex-1 h-full">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left: Chat */}
        <ResizablePanel defaultSize={38} minSize={28}>
          <div className="flex flex-col h-full bg-muted/20">
            {/* Messages */}
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
                  placeholder="描述你想要的应用... (可粘贴/拖拽图片)"
                  rows={2}
                  className="w-full resize-none bg-card border border-border rounded-lg px-3 py-2.5 pr-20 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  </Button>
                  <Button
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleSend}
                    disabled={!input.trim() || isStreaming}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right: Preview */}
        <ResizablePanel defaultSize={62} minSize={30}>
          <div className="h-full flex flex-col items-center justify-center bg-background text-muted-foreground">
            <Code2 className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium text-foreground/60">暂未生成应用</p>
            <p className="text-xs mt-1 text-muted-foreground/60">生成后的多文件应用预览会展示在这里</p>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default CreateWebPage;
