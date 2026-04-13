import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Square, ChevronRight, CheckCircle2, Search, Copy, Loader2 } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/* ── Types ── */
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  type?: "question" | "confirm" | "api-call" | "text";
  options?: { label: string; value: string }[];
  selectedOption?: string;
  isStreaming?: boolean;
}

interface PreviewMessage {
  id: string;
  role: "user" | "agent" | "tool";
  content: string;
  toolName?: string;
  timestamp: Date;
}

interface DebugEvent {
  id: string;
  type: string;
  detail: string;
  timestamp: Date;
}

let msgId = 0;
const uid = () => `msg-${++msgId}`;

/* ── Steps ── */
const steps = [
  { key: "quickstart", label: "快速开始" },
  { key: "create", label: "创建智能体" },
  { key: "configure", label: "配置环境" },
  { key: "session", label: "启动会话" },
  { key: "integrate", label: "集成" },
];

/* ── Simulated agent config responses ── */
const agentResponses: Record<string, string[]> = {
  default: [
    "好的，我来帮你处理这个需求。请稍等…",
    "已更新智能体配置。你可以在右侧预览窗口中测试效果。",
  ],
  system_prompt: [
    "System Prompt 已更新。新的 Prompt 将在下一次会话中生效。",
  ],
  tool: [
    "工具已成功挂载到智能体。你可以在右侧发送消息来测试工具调用是否正常。",
  ],
};

const getResponse = (userMsg: string): string[] => {
  const lower = userMsg.toLowerCase();
  if (lower.includes("prompt") || lower.includes("提示词") || lower.includes("系统")) {
    return agentResponses.system_prompt;
  }
  if (lower.includes("工具") || lower.includes("tool") || lower.includes("mcp") || lower.includes("skill")) {
    return agentResponses.tool;
  }
  return agentResponses.default;
};

/* ── Config Editor Component ── */
const generateYaml = (name: string) =>
  `name: ${name || "我的智能体"}
description: An agent that helps users with tasks.
model:
  id: claude-sonnet-4-6
  speed: standard
system: |-
  You are a helpful assistant. Follow user instructions carefully
  and provide clear, actionable responses.
tools:
  - type: agent_toolset_20260401
    configs: []
    default_config:
      enabled: true
      permission_policy:
        type: always_allow
mcp_servers: []
skills: []
metadata: {}`;

const generateJson = (name: string) =>
  JSON.stringify(
    {
      name: name || "我的智能体",
      description: "An agent that helps users with tasks.",
      model: { id: "claude-sonnet-4-6", speed: "standard" },
      system: "You are a helpful assistant. Follow user instructions carefully and provide clear, actionable responses.",
      tools: [{ type: "agent_toolset_20260401", configs: [], default_config: { enabled: true, permission_policy: { type: "always_allow" } } }],
      mcp_servers: [],
      skills: [],
      metadata: {},
    },
    null,
    2
  );

const ConfigEditor = ({ envName }: { envName: string }) => {
  const [format, setFormat] = useState<"yaml" | "json">("yaml");
  const [content, setContent] = useState(() => generateYaml(envName));

  const switchFormat = (fmt: "yaml" | "json") => {
    setFormat(fmt);
    setContent(fmt === "yaml" ? generateYaml(envName) : generateJson(envName));
  };

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(content);
  };

  // Line numbers
  const lines = content.split("\n");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Format toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex gap-1">
          <button
            onClick={() => switchFormat("yaml")}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              format === "yaml" ? "bg-secondary text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            YAML
          </button>
          <button
            onClick={() => switchFormat("json")}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              format === "json" ? "bg-secondary text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            JSON
          </button>
        </div>
        <button onClick={handleCopyConfig} className="text-muted-foreground hover:text-foreground transition-colors">
          <Copy className="w-4 h-4" />
        </button>
      </div>

      {/* Code editor area */}
      <div className="flex-1 overflow-auto bg-muted/10">
        <div className="flex min-h-full">
          {/* Line numbers */}
          <div className="select-none text-right pr-3 pl-4 py-3 text-xs font-mono text-muted-foreground/50 leading-relaxed shrink-0">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          {/* Editable content */}
          <div className="flex-1 relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="absolute inset-0 w-full h-full py-3 pr-4 text-xs font-mono leading-relaxed bg-transparent text-foreground resize-none focus:outline-none"
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Main Component ── */
const CreateAgentPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [rightTab, setRightTab] = useState<"config" | "preview">("preview");
  const [previewTab, setPreviewTab] = useState<"transcript" | "debug">("transcript");
  const [eventFilter, setEventFilter] = useState("all");
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [previewInput, setPreviewInput] = useState("");
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [envName, setEnvName] = useState("");

  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);

  /* ── Left messages (config chat) ── */
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      role: "system",
      content: "欢迎使用智能体构建器！我将引导你完成智能体的创建和配置。",
      type: "text",
    },
  ]);

  /* ── Right messages (preview) ── */
  const [previewMessages, setPreviewMessages] = useState<PreviewMessage[]>([]);
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);

  /* ── Auto-scroll ── */
  const scrollToBottom = useCallback((ref: React.RefObject<HTMLDivElement>) => {
    setTimeout(() => ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }), 50);
  }, []);

  useEffect(() => { scrollToBottom(leftScrollRef); }, [messages, scrollToBottom]);
  useEffect(() => { scrollToBottom(rightScrollRef); }, [previewMessages, debugEvents, scrollToBottom]);

  /* ── Left: Config chat send ── */
  const handleSend = () => {
    if (!input.trim() || isThinking) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { id: uid(), role: "user", content: userMsg }]);
    setIsThinking(true);

    // Step progression logic
    if (currentStep === 0 && !envName) {
      // User giving name
      setTimeout(() => {
        setEnvName(userMsg);
        setCurrentStep(1);
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "system", content: `✓ 智能体 "${userMsg}" 已创建`, type: "confirm" },
          {
            id: uid(),
            role: "assistant",
            content: "你想使用哪个执行环境？",
            type: "question",
            options: [
              { label: "创建新环境", value: "new" },
              { label: "使用默认环境", value: "default" },
            ],
          },
        ]);
        setIsThinking(false);
      }, 800);
      return;
    }

    // Normal flow — simulate thinking + response
    const streamDelay = 600 + Math.random() * 800;
    setTimeout(() => {
      const responses = getResponse(userMsg);
      const confirmId = uid();
      const newMsgs: Message[] = [];

      // Sometimes add a system confirm
      if (Math.random() > 0.5) {
        newMsgs.push({ id: confirmId, role: "system", content: "✓ 配置已更新", type: "confirm" });
      }

      // Add the main response with streaming effect
      const responseId = uid();
      newMsgs.push({ id: responseId, role: "assistant", content: "", isStreaming: true });
      setMessages((prev) => [...prev, ...newMsgs]);

      // Simulate streaming
      const fullText = responses[Math.floor(Math.random() * responses.length)];
      let charIndex = 0;
      const streamInterval = setInterval(() => {
        charIndex += 2;
        if (charIndex >= fullText.length) {
          clearInterval(streamInterval);
          setMessages((prev) =>
            prev.map((m) => m.id === responseId ? { ...m, content: fullText, isStreaming: false } : m)
          );
          setIsThinking(false);
        } else {
          setMessages((prev) =>
            prev.map((m) => m.id === responseId ? { ...m, content: fullText.slice(0, charIndex) } : m)
          );
        }
      }, 30);
    }, streamDelay);
  };

  /* ── Left: Handle question option click ── */
  const handleOptionClick = (msgId: string, option: { label: string; value: string }) => {
    setMessages((prev) =>
      prev.map((m) => m.id === msgId ? { ...m, selectedOption: option.value } : m)
    );

    // Process based on option
    if (option.value === "new" || option.value === "default") {
      setIsThinking(true);
      setTimeout(() => {
        setCurrentStep(2);
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "system", content: "✓ 环境已加载", type: "confirm" },
          {
            id: uid(),
            role: "assistant",
            content: "这个智能体需要什么网络权限？",
            type: "question",
            options: [
              { label: "不受限", value: "unrestricted" },
              { label: "仅内网", value: "internal" },
              { label: "无网络", value: "none" },
            ],
          },
        ]);
        setIsThinking(false);
      }, 600);
    } else if (["unrestricted", "internal", "none"].includes(option.value)) {
      setIsThinking(true);
      setTimeout(() => {
        setCurrentStep(3);
        setSessionActive(true);
        const networkLabel = option.value === "unrestricted" ? "不受限" : option.value === "internal" ? "仅内网" : "无网络";
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "system", content: `✓ 网络权限设置为「${networkLabel}」`, type: "confirm" },
          { id: uid(), role: "system", content: "✓ 环境已创建", type: "confirm" },
          {
            id: uid(),
            role: "system",
            content: `POST  /v1/environments\n\ncurl -X POST \\\n  https://api.example.com/v1/environments \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "name": "${envName || "default"}-env",\n    "network": "${option.value}"\n  }'`,
            type: "api-call",
          },
          {
            id: uid(),
            role: "assistant",
            content: `环境配置完成！你现在可以：\n\n1. 在右侧「预览」窗口中和智能体对话，测试效果\n2. 在这里继续调整配置（如修改 System Prompt、添加工具等）\n\n试试在右侧发送一条消息吧！`,
          },
        ]);
        setIsThinking(false);
      }, 1000);
    }
  };

  /* ── Right: Preview send ── */
  const handlePreviewSend = () => {
    if (!previewInput.trim() || isAgentRunning) return;
    const msg = previewInput.trim();
    setPreviewInput("");
    const userMsgId = uid();
    setPreviewMessages((prev) => [...prev, { id: userMsgId, role: "user", content: msg, timestamp: new Date() }]);
    setDebugEvents((prev) => [...prev, { id: uid(), type: "input", detail: `用户输入: "${msg}"`, timestamp: new Date() }]);
    setIsAgentRunning(true);

    // Simulate tool call
    setTimeout(() => {
      const toolId = uid();
      setPreviewMessages((prev) => [
        ...prev,
        { id: toolId, role: "tool", content: "正在调用 Web Search…", toolName: "Web Search", timestamp: new Date() },
      ]);
      setDebugEvents((prev) => [
        ...prev,
        { id: uid(), type: "tool_call", detail: "调用工具: Web Search", timestamp: new Date() },
        { id: uid(), type: "tool_input", detail: `搜索关键词: "${msg}"`, timestamp: new Date() },
      ]);
    }, 600);

    // Simulate tool result
    setTimeout(() => {
      setDebugEvents((prev) => [
        ...prev,
        { id: uid(), type: "tool_result", detail: "Web Search 返回 3 条结果", timestamp: new Date() },
      ]);
    }, 1200);

    // Simulate agent response with streaming
    setTimeout(() => {
      const responseId = uid();
      const fullText = `根据搜索结果，这是我的分析：\n\n1. **关键发现**：已找到与「${msg}」相关的信息\n2. **建议操作**：可以进一步深入分析\n3. **参考来源**：已附上相关链接\n\n还有什么需要我帮助的吗？`;

      setPreviewMessages((prev) => [
        ...prev,
        { id: responseId, role: "agent", content: "", timestamp: new Date() },
      ]);

      let charIndex = 0;
      const interval = setInterval(() => {
        charIndex += 3;
        if (charIndex >= fullText.length) {
          clearInterval(interval);
          setPreviewMessages((prev) =>
            prev.map((m) => m.id === responseId ? { ...m, content: fullText } : m)
          );
          setDebugEvents((prev) => [
            ...prev,
            { id: uid(), type: "response", detail: "智能体回复完成", timestamp: new Date() },
          ]);
          setIsAgentRunning(false);
        } else {
          setPreviewMessages((prev) =>
            prev.map((m) => m.id === responseId ? { ...m, content: fullText.slice(0, charIndex) } : m)
          );
        }
      }, 20);
    }, 1800);
  };

  /* ── Copy code block ── */
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatTime = (d: Date) => d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* ── Main split pane ── */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
        {/* ── Left: Config chat ── */}
        <ResizablePanel defaultSize={35} minSize={20} maxSize={60} className="flex flex-col min-w-0">
          <div ref={leftScrollRef} className="flex-1 overflow-auto p-6 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.type === "confirm" ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    {msg.content}
                  </div>
                ) : msg.type === "api-call" ? (
                  <div className="border border-border rounded-lg overflow-hidden max-w-lg">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-mono">
                        POST
                      </Badge>
                      <span className="text-sm text-foreground font-mono">
                        {msg.content.split("\n")[0].replace("POST  ", "")}
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">cURL</span>
                        <button
                          onClick={() => handleCopy(msg.content.split("\n\n").slice(1).join("\n\n"))}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <pre className="p-3 text-xs text-muted-foreground font-mono whitespace-pre-wrap bg-muted/10 overflow-x-auto">
                      {msg.content.split("\n\n").slice(1).join("\n\n")}
                    </pre>
                  </div>
                ) : msg.type === "question" && msg.options && msg.options.length > 0 ? (
                  <div className="max-w-md">
                    <div className="text-sm mb-3">{msg.content}</div>
                    <div className="space-y-2">
                      {msg.options.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => !msg.selectedOption && handleOptionClick(msg.id, opt)}
                          disabled={!!msg.selectedOption}
                          className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            msg.selectedOption === opt.value
                              ? "bg-primary/10 text-primary border border-primary/30"
                              : msg.selectedOption
                              ? "text-muted-foreground bg-muted/30 cursor-default"
                              : "text-foreground bg-secondary hover:bg-accent cursor-pointer"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : msg.type === "question" ? (
                  <div className="text-sm">{msg.content}</div>
                ) : msg.role === "system" ? (
                  <p className="text-sm text-muted-foreground">{msg.content}</p>
                ) : msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[70%] rounded-lg px-4 py-2.5 text-sm bg-primary text-primary-foreground whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[70%] text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                    {msg.isStreaming && <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse" />}
                  </div>
                )}
              </div>
            ))}
            {isThinking && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                正在思考…
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="输入消息…"
                disabled={isThinking}
                className="flex-1"
              />
              <Button size="icon" onClick={handleSend} disabled={isThinking || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* ── Right: Preview panel ── */}
        <ResizablePanel defaultSize={65} minSize={30} className="flex flex-col min-w-0">
          {/* Config / Preview tabs */}
          <div className="border-b border-border px-4">
            <div className="flex gap-1">
              <button
                onClick={() => setRightTab("config")}
                className={`text-sm py-3 px-2 transition-colors ${
                  rightTab === "config"
                    ? "font-medium text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                配置
              </button>
              <button
                onClick={() => setRightTab("preview")}
                className={`text-sm py-3 px-2 transition-colors ${
                  rightTab === "preview"
                    ? "font-medium text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                预览
              </button>
            </div>
          </div>

          {rightTab === "config" ? (
            /* ── Config tab: YAML/JSON editor ── */
            <ConfigEditor envName={envName} />
          ) : (
            /* ── Preview tab ── */
            <>
              {/* Environment selector */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>📁</span>
                  <span>{envName || "default"}-env</span>
                </div>
                <button className="text-sm text-primary hover:underline">查看会话 ↗</button>
              </div>

              {/* Transcript / Debug */}
              <div className="flex items-center gap-4 px-4 py-2 border-b border-border">
                <button
                  onClick={() => setPreviewTab("transcript")}
                  className={`text-sm pb-1 transition-colors ${
                    previewTab === "transcript"
                      ? "font-medium text-foreground border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  对话记录
                </button>
                <button
                  onClick={() => setPreviewTab("debug")}
                  className={`text-sm pb-1 transition-colors ${
                    previewTab === "debug"
                      ? "font-medium text-foreground border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  调试日志
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger className="h-7 text-xs border-0 shadow-none w-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部事件</SelectItem>
                      <SelectItem value="tool_call">工具调用</SelectItem>
                      <SelectItem value="response">智能体回复</SelectItem>
                    </SelectContent>
                  </Select>
                  <button className="text-muted-foreground hover:text-foreground">
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div ref={rightScrollRef} className="flex-1 overflow-auto p-4">
                {previewTab === "transcript" ? (
                  previewMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                      暂无事件，发送消息后将显示在此处。
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {previewMessages.map((msg) => (
                        <div key={msg.id}>
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
                                {msg.content === "" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {isAgentRunning && previewMessages[previewMessages.length - 1]?.role !== "agent" && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          智能体处理中…
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div className="space-y-1.5">
                    {debugEvents.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center mt-8">暂无调试日志。</div>
                    ) : (
                      debugEvents
                        .filter((e) => eventFilter === "all" || e.type === eventFilter)
                        .map((evt) => (
                          <div key={evt.id} className="flex items-start gap-2 p-2 rounded bg-muted/50 text-xs font-mono">
                            <span className="text-muted-foreground shrink-0">{formatTime(evt.timestamp)}</span>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {evt.type}
                            </Badge>
                            <span className="text-foreground">{evt.detail}</span>
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
                    placeholder={sessionActive ? "向智能体发送消息" : "请先在左侧完成配置"}
                    disabled={!sessionActive || isAgentRunning}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={handlePreviewSend}
                    disabled={!sessionActive || isAgentRunning || !previewInput.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateAgentPage;
