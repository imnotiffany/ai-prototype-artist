import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Square, ChevronRight, CheckCircle2, Copy, Loader2, ChevronDown, Code2, Settings2 } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

/* ── Simulated agent config ── */
interface AgentConfig {
  version: string;
  model: string;
  systemPrompt: string;
  tools: { name: string; id: string; permissions: number; permissionPolicy: string }[];
  skills: string[];
}

const defaultConfig: AgentConfig = {
  version: "v1",
  model: "claude-sonnet-4-6",
  systemPrompt: "You are a helpful assistant. Follow user instructions carefully and provide clear, actionable responses.",
  tools: [
    { name: "Built-in tools", id: "agent_toolset_20260401", permissions: 8, permissionPolicy: "Always allow" },
  ],
  skills: [],
};

const versions = ["v1", "v2", "v3"];

/* ── Simulated responses ── */
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

/* ── Structured Config View ── */
const StructuredConfigView = ({ config, onConfigChange }: { config: AgentConfig; onConfigChange: (c: AgentConfig) => void }) => {
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <div className="flex-1 overflow-auto">
      <div className="divide-y divide-border">
        {/* Version */}
        <div className="px-5 py-4">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Version</label>
          <Select value={config.version} onValueChange={(v) => onConfigChange({ ...config, version: v })}>
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v} value={v} className="text-xs">{`Version: ${v}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model */}
        <div className="px-5 py-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Model</label>
          <Select value={config.model} onValueChange={(v) => onConfigChange({ ...config, model: v })}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="claude-sonnet-4-6">Claude Sonnet 4 (6)</SelectItem>
              <SelectItem value="claude-sonnet-4-5">Claude Sonnet 4 (5)</SelectItem>
              <SelectItem value="claude-haiku-3-5">Claude Haiku 3.5</SelectItem>
              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
              <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
              <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
              <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
              <SelectItem value="deepseek-v3">DeepSeek V3</SelectItem>
              <SelectItem value="qwen-max">Qwen Max</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* System Prompt */}
        <div className="px-5 py-4">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">System prompt</label>
          <div className="bg-muted/30 rounded-lg p-3 border border-border">
            <textarea
              value={config.systemPrompt}
              onChange={(e) => onConfigChange({ ...config, systemPrompt: e.target.value })}
              className="w-full bg-transparent text-xs text-foreground font-mono leading-relaxed resize-none focus:outline-none min-h-[120px]"
              spellCheck={false}
            />
          </div>
        </div>

        {/* MCPs and tools */}
        <div className="px-5 py-4">
          <label className="text-xs font-medium text-muted-foreground mb-3 block">MCPs and tools</label>
          {config.tools.map((tool, i) => (
            <div key={i} className="border border-border rounded-lg p-3 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                  <Settings2 className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{tool.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{tool.id}</p>
                </div>
              </div>
              <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full mt-3 pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ChevronDown className={`w-3 h-3 transition-transform ${toolsOpen ? "rotate-180" : ""}`} />
                    <span>Tool permissions</span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{tool.permissions}</Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {tool.permissionPolicy}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="text-[10px] text-muted-foreground space-y-1 pl-4">
                    <p>• web_search — allowed</p>
                    <p>• file_read — allowed</p>
                    <p>• file_write — allowed</p>
                    <p>• bash — allowed</p>
                    <p>• code_exec — allowed</p>
                    <p>• browser — allowed</p>
                    <p>• mcp_call — allowed</p>
                    <p>• api_request — allowed</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}
        </div>

        {/* Skills */}
        <div className="px-5 py-4">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Skills</label>
          {config.skills.length === 0 ? (
            <p className="text-xs text-muted-foreground">暂无技能</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {config.skills.map((s, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] font-mono">{s}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Raw Code View ── */
const generateYaml = (config: AgentConfig) =>
  `name: 我的智能体
description: An agent that helps users with tasks.
model:
  id: ${config.model}
  speed: standard
system: |-
  ${config.systemPrompt.split("\n").join("\n  ")}
tools:
  - type: ${config.tools[0]?.id || "agent_toolset_20260401"}
    configs: []
    default_config:
      enabled: true
      permission_policy:
        type: always_allow
mcp_servers: []
skills: [${config.skills.map(s => `"${s}"`).join(", ")}]
metadata: {}`;

const generateJson = (config: AgentConfig) =>
  JSON.stringify(
    {
      name: "我的智能体",
      description: "An agent that helps users with tasks.",
      model: { id: config.model, speed: "standard" },
      system: config.systemPrompt,
      tools: [{ type: config.tools[0]?.id || "agent_toolset_20260401", configs: [], default_config: { enabled: true, permission_policy: { type: "always_allow" } } }],
      mcp_servers: [],
      skills: config.skills,
      metadata: {},
    },
    null,
    2
  );

const RawConfigView = ({ config }: { config: AgentConfig }) => {
  const [format, setFormat] = useState<"yaml" | "json">("yaml");
  const content = format === "yaml" ? generateYaml(config) : generateJson(config);
  const lines = content.split("\n");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex gap-1">
          {(["yaml", "json"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                format === f ? "bg-secondary text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <button onClick={() => navigator.clipboard.writeText(content)} className="text-muted-foreground hover:text-foreground">
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-muted/10">
        <div className="flex min-h-full">
          <div className="select-none text-right pr-3 pl-4 py-3 text-[10px] font-mono text-muted-foreground/50 leading-relaxed shrink-0">
            {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
          </div>
          <pre className="flex-1 py-3 pr-4 text-[10px] font-mono leading-relaxed text-foreground whitespace-pre-wrap">{content}</pre>
        </div>
      </div>
    </div>
  );
};

/* ── Main Component ── */
const CreateAgentPage = () => {
  const navigate = useNavigate();
  const [configViewMode, setConfigViewMode] = useState<"structured" | "raw">("structured");
  const [rightTab, setRightTab] = useState<"config" | "preview">("config");
  const [previewTab, setPreviewTab] = useState<"transcript" | "debug">("transcript");
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [previewInput, setPreviewInput] = useState("");
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [sessionActive, setSessionActive] = useState(true);
  const [agentConfig, setAgentConfig] = useState<AgentConfig>(defaultConfig);

  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      role: "system",
      content: "欢迎使用智能体构建器！描述你的需求，我将帮你创建和配置智能体。",
      type: "text",
    },
  ]);

  const [previewMessages, setPreviewMessages] = useState<PreviewMessage[]>([]);
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);

  const scrollToBottom = useCallback((ref: React.RefObject<HTMLDivElement>) => {
    setTimeout(() => ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }), 50);
  }, []);

  useEffect(() => { scrollToBottom(leftScrollRef); }, [messages, scrollToBottom]);
  useEffect(() => { scrollToBottom(rightScrollRef); }, [previewMessages, debugEvents, scrollToBottom]);

  /* ── Left: send ── */
  const handleSend = () => {
    if (!input.trim() || isThinking) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { id: uid(), role: "user", content: userMsg }]);
    setIsThinking(true);

    const streamDelay = 600 + Math.random() * 800;
    setTimeout(() => {
      const responses = getResponse(userMsg);
      const newMsgs: Message[] = [];

      if (Math.random() > 0.5) {
        newMsgs.push({ id: uid(), role: "system", content: "✓ 配置已更新", type: "confirm" });
      }

      const responseId = uid();
      newMsgs.push({ id: responseId, role: "assistant", content: "", isStreaming: true });
      setMessages((prev) => [...prev, ...newMsgs]);

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

  /* ── Right: Preview send ── */
  const handlePreviewSend = () => {
    if (!previewInput.trim() || isAgentRunning) return;
    const msg = previewInput.trim();
    setPreviewInput("");
    setPreviewMessages((prev) => [...prev, { id: uid(), role: "user", content: msg, timestamp: new Date() }]);
    setDebugEvents((prev) => [...prev, { id: uid(), type: "input", detail: `用户输入: "${msg}"`, timestamp: new Date() }]);
    setIsAgentRunning(true);

    setTimeout(() => {
      setPreviewMessages((prev) => [
        ...prev,
        { id: uid(), role: "tool", content: "正在调用 Web Search…", toolName: "Web Search", timestamp: new Date() },
      ]);
      setDebugEvents((prev) => [
        ...prev,
        { id: uid(), type: "tool_call", detail: "调用工具: Web Search", timestamp: new Date() },
      ]);
    }, 600);

    setTimeout(() => {
      setDebugEvents((prev) => [
        ...prev,
        { id: uid(), type: "tool_result", detail: "Web Search 返回 3 条结果", timestamp: new Date() },
      ]);
    }, 1200);

    setTimeout(() => {
      const responseId = uid();
      const fullText = `根据搜索结果，这是我的分析：\n\n1. **关键发现**：已找到与「${msg}」相关的信息\n2. **建议操作**：可以进一步深入分析\n3. **参考来源**：已附上相关链接`;

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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatTime = (d: Date) => d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
        {/* ── Left: Chat ── */}
        <ResizablePanel defaultSize={35} minSize={20} maxSize={60} className="flex flex-col min-w-0">
          <div ref={leftScrollRef} className="flex-1 overflow-auto p-5 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.type === "confirm" ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    {msg.content}
                  </div>
                ) : msg.type === "api-call" ? (
                  <div className="border border-border rounded-lg overflow-hidden max-w-lg">
                    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/30">
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-mono">
                        POST
                      </Badge>
                      <span className="text-xs text-foreground font-mono">
                        {msg.content.split("\n")[0].replace("POST  ", "")}
                      </span>
                      <div className="ml-auto">
                        <button onClick={() => handleCopy(msg.content.split("\n\n").slice(1).join("\n\n"))} className="text-muted-foreground hover:text-foreground">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <pre className="p-2.5 text-[10px] text-muted-foreground font-mono whitespace-pre-wrap bg-muted/10 overflow-x-auto">
                      {msg.content.split("\n\n").slice(1).join("\n\n")}
                    </pre>
                  </div>
                ) : msg.role === "system" ? (
                  <p className="text-xs text-muted-foreground">{msg.content}</p>
                ) : msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-lg px-3 py-2 text-xs bg-primary text-primary-foreground whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[80%] text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                    {msg.isStreaming && <span className="inline-block w-1 h-3.5 bg-primary ml-0.5 animate-pulse" />}
                  </div>
                )}
              </div>
            ))}
            {isThinking && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                正在思考…
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="描述你的需求…"
                disabled={isThinking}
                className="flex-1 h-8 text-xs"
              />
              <Button size="icon" className="h-8 w-8" onClick={handleSend} disabled={isThinking || !input.trim()}>
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* ── Right: Workspace ── */}
        <ResizablePanel defaultSize={65} minSize={30} className="flex flex-col min-w-0">
          {/* Tabs: Config / Preview */}
          <div className="border-b border-border px-4 flex items-center justify-between">
            <div className="flex gap-1">
              {(["config", "preview"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  className={`text-xs py-2.5 px-2 transition-colors ${
                    rightTab === tab
                      ? "font-medium text-foreground border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "config" ? "配置" : "预览"}
                </button>
              ))}
            </div>
            {/* Toggle structured / raw when on config tab */}
            {rightTab === "config" && (
              <div className="flex items-center gap-1 bg-muted/50 rounded p-0.5">
                <button
                  onClick={() => setConfigViewMode("structured")}
                  className={`p-1 rounded transition-colors ${
                    configViewMode === "structured" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="结构化视图"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setConfigViewMode("raw")}
                  className={`p-1 rounded transition-colors ${
                    configViewMode === "raw" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="代码视图"
                >
                  <Code2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {rightTab === "config" ? (
            configViewMode === "structured" ? (
              <StructuredConfigView config={agentConfig} onConfigChange={setAgentConfig} />
            ) : (
              <RawConfigView config={agentConfig} />
            )
          ) : (
            <>
              {/* Transcript / Debug tabs */}
              <div className="flex items-center gap-3 px-4 py-2 border-b border-border">
                {(["transcript", "debug"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setPreviewTab(t)}
                    className={`text-xs pb-0.5 transition-colors ${
                      previewTab === t
                        ? "font-medium text-foreground border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "transcript" ? "对话记录" : "调试日志"}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div ref={rightScrollRef} className="flex-1 overflow-auto p-4">
                {previewTab === "transcript" ? (
                  previewMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                      发送消息后将显示在此处
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {previewMessages.map((msg) => (
                        <div key={msg.id}>
                          {msg.role === "tool" ? (
                            <div className="flex items-center gap-2 py-1.5 px-3 rounded bg-accent text-accent-foreground text-xs mx-auto w-fit">
                              <ChevronRight className="w-3 h-3" />
                              {msg.content}
                            </div>
                          ) : (
                            <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`max-w-[80%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap ${
                                  msg.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary text-secondary-foreground"
                                }`}
                              >
                                {msg.content}
                                {msg.content === "" && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {isAgentRunning && previewMessages[previewMessages.length - 1]?.role !== "agent" && (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          智能体处理中…
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div className="space-y-1.5">
                    {debugEvents.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center mt-8">暂无调试日志</div>
                    ) : (
                      debugEvents.map((evt) => (
                        <div key={evt.id} className="flex items-start gap-2 p-2 rounded bg-muted/50 text-[10px] font-mono">
                          <span className="text-muted-foreground shrink-0">{formatTime(evt.timestamp)}</span>
                          <Badge variant="outline" className="text-[9px] shrink-0">{evt.type}</Badge>
                          <span className="text-foreground">{evt.detail}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Preview input */}
              <div className="border-t border-border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={previewInput}
                    onChange={(e) => setPreviewInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handlePreviewSend()}
                    placeholder="向智能体发送消息"
                    disabled={!sessionActive || isAgentRunning}
                    className="flex-1 h-8 text-xs"
                  />
                  <Button
                    size="icon"
                    className="h-8 w-8"
                    onClick={handlePreviewSend}
                    disabled={!sessionActive || isAgentRunning || !previewInput.trim()}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default CreateAgentPage;
