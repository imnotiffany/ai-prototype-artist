import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Square, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  type?: "question" | "confirm" | "api-call";
  options?: { label: string; value: string }[];
}

interface PreviewMessage {
  role: "user" | "agent" | "tool";
  content: string;
  toolName?: string;
}

const steps = [
  { key: "quickstart", label: "Quickstart" },
  { key: "create", label: "Create agent" },
  { key: "configure", label: "Configure environment" },
  { key: "session", label: "Start session" },
  { key: "integrate", label: "Integrate" },
];

const CreateAgentPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(true);
  const [previewTab, setPreviewTab] = useState<"transcript" | "debug">("transcript");
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [previewInput, setPreviewInput] = useState("");

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content: "An **environment** is a container template that defines the compute workspace where your agent's tools execute — including networking rules.",
    },
    { role: "system", content: "✓ Environments loaded", type: "confirm" },
    {
      role: "assistant",
      content: "你想使用哪个执行环境？",
      type: "question",
      options: [{ label: "创建新环境", value: "new" }],
    },
    {
      role: "assistant",
      content: "这个 Agent 需要什么网络权限？",
      type: "question",
      options: [{ label: "不受限", value: "unrestricted" }],
    },
    { role: "system", content: "✓ Environment created", type: "confirm" },
    {
      role: "system",
      content: `POST  /v1/environments\n\ncurl -X POST \\\n  https://api.anthropic.com/v1/environments \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: $ANTHROPIC_API_KEY" \\\n  -d '{\n    "name": "default-env",\n    "description": "Default environment"\n  }'`,
      type: "api-call",
    },
    { role: "assistant", content: "环境已创建完毕！" },
  ]);

  const [previewMessages, setPreviewMessages] = useState<PreviewMessage[]>([]);
  const [previewEvents, setPreviewEvents] = useState<string[]>([]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "好的，我已经更新了 Agent 的配置。你可以在右边的预览窗口中测试效果。" },
      ]);
    }, 1000);
  };

  const handlePreviewSend = () => {
    if (!previewInput.trim()) return;
    const msg = previewInput;
    setPreviewInput("");
    setPreviewMessages((prev) => [...prev, { role: "user", content: msg }]);
    setIsRunning(true);

    setTimeout(() => {
      setPreviewMessages((prev) => [
        ...prev,
        { role: "tool", content: "正在调用工具…", toolName: "Web Search" },
      ]);
      setPreviewEvents((prev) => [...prev, `Tool call: Web Search`]);
    }, 800);

    setTimeout(() => {
      setPreviewMessages((prev) => [
        ...prev,
        { role: "agent", content: "这是 Agent 的回复。你可以继续测试或回到左侧调整配置。" },
      ]);
      setPreviewEvents((prev) => [...prev, `Agent response generated`]);
      setIsRunning(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Top stepper */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3 bg-background">
        <div className="flex items-center gap-6">
          {steps.map((step, i) => (
            <div key={step.key} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px bg-border" />}
              <div className="flex items-center gap-1.5">
                {i < currentStep ? (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                ) : i === currentStep ? (
                  <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center text-xs font-medium text-primary">
                    {i + 1}
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground">
                    {i + 1}
                  </div>
                )}
                <span className={`text-sm ${i <= currentStep ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <Square className="w-3.5 h-3.5 mr-1.5" />
          Stop session
        </Button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Config chat */}
        <div className="flex-1 flex flex-col border-r border-border min-w-0">
          <div className="flex-1 overflow-auto p-6 space-y-4">
            {messages.map((msg, i) => (
              <div key={i}>
                {msg.type === "confirm" ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    {msg.content}
                  </div>
                ) : msg.type === "api-call" ? (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
                      <Badge className="bg-green-100 text-green-700 text-xs">POST</Badge>
                      <span className="text-sm text-foreground font-mono">/v1/environments</span>
                      <span className="ml-auto text-xs text-muted-foreground">cURL</span>
                    </div>
                    <pre className="p-3 text-xs text-muted-foreground font-mono whitespace-pre-wrap bg-muted/10">
                      {msg.content.split("\n\n").slice(1).join("\n\n")}
                    </pre>
                  </div>
                ) : msg.type === "question" ? (
                  <div className="border border-border rounded-lg p-4 max-w-md">
                    <div className="font-medium text-sm mb-2">{msg.content}</div>
                    {msg.options?.map((opt) => (
                      <div key={opt.value} className="text-sm text-muted-foreground">{opt.label}</div>
                    ))}
                  </div>
                ) : msg.role === "system" ? (
                  <p className="text-sm text-muted-foreground">{msg.content}</p>
                ) : msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[70%] rounded-lg px-4 py-2.5 text-sm bg-primary text-primary-foreground whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[70%] text-sm text-foreground whitespace-pre-wrap">
                    {msg.content}
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
                placeholder="Reply..."
                className="flex-1"
              />
              <Button size="icon" onClick={handleSend}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Preview panel */}
        {showPreview && (
          <div className="w-[480px] flex flex-col min-w-0">
            {/* Preview tabs: Config / Preview */}
            <div className="border-b border-border px-4">
              <div className="flex gap-4">
                <button className="text-sm text-muted-foreground py-3 hover:text-foreground">Config</button>
                <button className="text-sm font-medium text-foreground py-3 border-b-2 border-primary">Preview</button>
              </div>
            </div>

            {/* Environment selector */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>📁</span>
                <Select defaultValue="default">
                  <SelectTrigger className="h-7 border-0 shadow-none text-sm p-0 w-auto gap-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">default-env</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <button className="text-sm text-primary hover:underline">View session ↗</button>
            </div>

            {/* Transcript / Debug tabs */}
            <div className="flex items-center gap-4 px-4 py-2 border-b border-border">
              <button
                onClick={() => setPreviewTab("transcript")}
                className={`text-sm pb-1 ${previewTab === "transcript" ? "font-medium text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                Transcript
              </button>
              <button
                onClick={() => setPreviewTab("debug")}
                className={`text-sm pb-1 ${previewTab === "debug" ? "font-medium text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                Debug
              </button>
              <div className="ml-auto flex items-center gap-2">
                <Select defaultValue="all">
                  <SelectTrigger className="h-7 text-xs border-0 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All events</SelectItem>
                  </SelectContent>
                </Select>
                <button className="text-muted-foreground hover:text-foreground">🔍</button>
              </div>
            </div>

            {/* Preview content */}
            <div className="flex-1 overflow-auto p-4">
              {previewTab === "transcript" ? (
                previewMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No events yet. Events will appear here as they occur.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {previewMessages.map((msg, i) => (
                      <div key={i}>
                        {msg.role === "tool" ? (
                          <div className="flex items-center gap-2 py-2 px-3 rounded bg-accent text-accent-foreground text-sm mx-auto w-fit">
                            <ChevronRight className="w-3.5 h-3.5" />
                            {msg.content}
                          </div>
                        ) : (
                          <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap ${
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
                )
              ) : (
                <div className="space-y-2">
                  {previewEvents.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center mt-8">No debug events yet.</div>
                  ) : (
                    previewEvents.map((evt, i) => (
                      <div key={i} className="p-2 rounded bg-muted/50 text-xs font-mono text-muted-foreground">
                        {evt}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Preview input */}
            <div className="border-t border-border p-4">
              <div className="flex items-center gap-2">
                <Input
                  value={previewInput}
                  onChange={(e) => setPreviewInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handlePreviewSend()}
                  placeholder="Send a message to the agent"
                  className="flex-1"
                />
                <Button size="icon" onClick={handlePreviewSend} disabled={isRunning}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateAgentPage;
