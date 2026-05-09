import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send, ChevronRight, CheckCircle2, Copy, Loader2, ChevronDown, Code2, Settings2,
  Zap, Server, Plus, X, Rocket, Package, Bot, ScrollText, MessageSquare, Bug,
  History, FormInput, KeyRound, Link2, Eye, EyeOff,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { AIStatusPill } from "@/components/AIStatusPill";
import { ToolCallGroup, type ToolCall } from "@/components/ToolCallCard";

/* ── Types ── */
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  type?: "question" | "confirm" | "api-call" | "text" | "assembly" | "tool-calls";
  attachments?: { type: "skill" | "mcp"; name: string }[];
  toolCalls?: ToolCall[];
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

/* ── Agent Config ── */
interface AgentConfig {
  name: string;
  version: string;
  model: string;
  systemPrompt: string;
  tools: { name: string; id: string; permissions: number; permissionPolicy: string }[];
  skills: string[];
  mcpServers: string[];
  fengsheng: {
    enabled: boolean;
    appKey: string;
    appSecret: string;
    robotCode: string;
    connected: boolean;
  };
}

const defaultConfig: AgentConfig = {
  name: "",
  version: "v0.0.1",
  model: "claude-sonnet-4-6",
  systemPrompt: "",
  tools: [
    { name: "Built-in tools", id: "agent_toolset_20260401", permissions: 8, permissionPolicy: "Always allow" },
  ],
  skills: [],
  mcpServers: [],
  fengsheng: { enabled: false, appKey: "", appSecret: "", robotCode: "", connected: false },
};

/* ── Available Skills & MCPs (from shared resource library) ── */
import { getActiveSkills, getActiveMCPs } from "@/data/mockData";
const availableSkills = getActiveSkills();
const availableMCPs = getActiveMCPs();

const versions = ["v0.0.1", "v0.0.2", "v0.0.3"];

/* ── NLP Detection: extract skill/MCP names from natural language ── */

const detectFromText = (text: string): { detectedSkills: string[]; detectedMCPs: string[] } => {
  const lower = text.toLowerCase();
  const detectedSkills = availableSkills.filter((s) => lower.includes(s.name.toLowerCase())).map((s) => s.name);
  const detectedMCPs = availableMCPs.filter((s) => lower.includes(s.name.toLowerCase())).map((s) => s.name);

  // Also detect by keyword hints
  if ((lower.includes("搜索") || lower.includes("search")) && !detectedSkills.includes("Web Search")) detectedSkills.push("Web Search");
  if ((lower.includes("代码") || lower.includes("code")) && !detectedSkills.includes("Code Analysis")) detectedSkills.push("Code Analysis");
  if ((lower.includes("邮件") || lower.includes("email")) && !detectedSkills.includes("Email Parser")) detectedSkills.push("Email Parser");
  if ((lower.includes("翻译") || lower.includes("translat")) && !detectedSkills.includes("Translation Engine")) detectedSkills.push("Translation Engine");
  if ((lower.includes("sql") || lower.includes("数据库")) && !detectedSkills.includes("SQL Generator")) detectedSkills.push("SQL Generator");
  if ((lower.includes("api") || lower.includes("接口")) && !detectedMCPs.includes("yapi-mcp-server")) detectedMCPs.push("yapi-mcp-server");
  if ((lower.includes("文档") || lower.includes("腾讯文档")) && !detectedMCPs.includes("sfdoc-mcp")) detectedMCPs.push("sfdoc-mcp");
  if ((lower.includes("钉钉") || lower.includes("机器人")) && !detectedMCPs.includes("机器人消息")) detectedMCPs.push("机器人消息");
  if ((lower.includes("数据") || lower.includes("丰景台")) && !detectedMCPs.includes("丰景台")) detectedMCPs.push("丰景台");
  if ((lower.includes("缺陷") || lower.includes("测试")) && !detectedMCPs.includes("测试管理-MCP")) detectedMCPs.push("测试管理-MCP");

  return { detectedSkills, detectedMCPs };
};

/* ── Simulated Assembly Logic ── */
const assembleAgent = (
  description: string,
  skills: string[],
  mcps: string[]
): AgentConfig => {
  // Merge manually selected + NLP-detected
  const { detectedSkills, detectedMCPs } = detectFromText(description);
  const allSkills = [...new Set([...skills, ...detectedSkills])];
  const allMCPs = [...new Set([...mcps, ...detectedMCPs])];

  const lower = description.toLowerCase();
  let model = "claude-sonnet-4-6";
  if (lower.includes("快速") || lower.includes("简单")) model = "gemini-2.5-flash";
  if (lower.includes("分析") || lower.includes("推理")) model = "gpt-4o";

  const systemPrompt = `你是一个专业的AI助手。\n\n## 核心能力\n${description}\n\n## 工具使用\n${allSkills.length > 0 ? `你可以使用以下技能：${allSkills.join("、")}` : "暂无外部技能"}\n${allMCPs.length > 0 ? `你可以连接以下服务：${allMCPs.join("、")}` : ""}\n\n## 行为准则\n- 始终准确、有帮助地回答问题\n- 在需要时主动使用可用工具\n- 输出结构化、易读的结果`;

  return {
    name: description.slice(0, 20).replace(/[，。！？]/g, ""),
    version: "v0.0.1",
    model,
    systemPrompt,
    tools: [
      { name: "Built-in tools", id: "agent_toolset_20260401", permissions: 8, permissionPolicy: "Always allow" },
    ],
    skills: allSkills,
    mcpServers: allMCPs,
    fengsheng: { enabled: false, appKey: "", appSecret: "", robotCode: "", connected: false },
  };
};

/* ── Attachment Picker ── */
const AttachmentPicker = ({
  type,
  items,
  selected,
  onToggle,
}: {
  type: "skill" | "mcp";
  items: { name: string; description: string }[];
  selected: string[];
  onToggle: (name: string) => void;
}) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 px-2">
        {type === "skill" ? <Zap className="w-3 h-3" /> : <Server className="w-3 h-3" />}
        {type === "skill" ? "Skill" : "MCP"}
        {selected.length > 0 && (
          <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">{selected.length}</Badge>
        )}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-64 p-2" align="start">
      <p className="text-[11px] font-medium text-muted-foreground px-2 py-1">
        {type === "skill" ? "选择技能" : "选择 MCP 服务"}
      </p>
      <div className="max-h-48 overflow-auto space-y-0.5 mt-1">
        {items.map((item) => {
          const isSelected = selected.includes(item.name);
          return (
            <button
              key={item.name}
              onClick={() => onToggle(item.name)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-colors ${
                isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                isSelected ? "bg-primary border-primary" : "border-border"
              }`}>
                {isSelected && <CheckCircle2 className="w-2.5 h-2.5 text-primary-foreground" />}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </PopoverContent>
  </Popover>
);

/* ── Structured Config View ── */
const StructuredConfigView = ({ config, onConfigChange }: { config: AgentConfig; onConfigChange: (c: AgentConfig) => void }) => {
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <div className="flex-1 overflow-auto">
      <div className="divide-y divide-border">
        {/* Name */}
        <div className="px-5 py-4">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">名称</label>
          <Input
            value={config.name}
            onChange={(e) => onConfigChange({ ...config, name: e.target.value })}
            className="h-8 text-sm"
            placeholder="智能体名称"
          />
        </div>

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
          {/* MCP Servers */}
          {config.mcpServers.length > 0 && (
            <div className="space-y-1.5 mt-2">
              {config.mcpServers.map((mcp, i) => (
                <div key={i} className="flex items-center gap-2 border border-border rounded-lg px-3 py-2">
                  <Server className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-foreground flex-1">{mcp}</span>
                  <button
                    onClick={() => onConfigChange({ ...config, mcpServers: config.mcpServers.filter((_, j) => j !== i) })}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="px-5 py-4">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Skills</label>
          {config.skills.length === 0 ? (
            <p className="text-xs text-muted-foreground">暂无技能</p>
          ) : (
            <div className="space-y-1.5">
              {config.skills.map((s, i) => {
                const meta = availableSkills.find((x) => x.name === s);
                return (
                  <div key={i} className="flex items-center gap-2 border border-border rounded-lg px-3 py-2">
                    <Zap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground truncate">{s}</p>
                      {meta?.description && (
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{meta.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => onConfigChange({ ...config, skills: config.skills.filter((_, j) => j !== i) })}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

/* ── Raw Code View ── */
const generateYaml = (config: AgentConfig) =>
  `name: ${config.name || "我的智能体"}
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
mcp_servers: [${config.mcpServers.map(s => `"${s}"`).join(", ")}]
skills: [${config.skills.map(s => `"${s}"`).join(", ")}]
metadata: {}`;

const generateJson = (config: AgentConfig) =>
  JSON.stringify(
    {
      name: config.name || "我的智能体",
      description: "An agent that helps users with tasks.",
      model: { id: config.model, speed: "standard" },
      system: config.systemPrompt,
      tools: [{ type: config.tools[0]?.id || "agent_toolset_20260401", configs: [], default_config: { enabled: true, permission_policy: { type: "always_allow" } } }],
      mcp_servers: config.mcpServers,
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
  const [rightTab, setRightTab] = useState<"config" | "preview" | "logs">("config");
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStartedAt, setThinkingStartedAt] = useState<number | null>(null);
  const [thinkingStage, setThinkingStage] = useState(0);
  const [previewInput, setPreviewInput] = useState("");
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentConfig, setAgentConfig] = useState<AgentConfig>(defaultConfig);
  const [agentCreated, setAgentCreated] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  // Attachments for chat input
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedMCPs, setSelectedMCPs] = useState<string[]>([]);

  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      role: "system",
      content: "👋 描述你想要创建的智能体，可以附带选择需要的 MCP 和 Skill 服务。系统会自动组装并生成配置。",
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

  const toggleSkill = (name: string) => {
    setSelectedSkills((prev) => prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]);
  };
  const toggleMCP = (name: string) => {
    setSelectedMCPs((prev) => prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]);
  };

  /* ── Send: create or refine agent ── */
  const handleSend = () => {
    if (!input.trim() || isThinking) return;
    const userMsg = input.trim();
    const attachments = [
      ...selectedSkills.map((s) => ({ type: "skill" as const, name: s })),
      ...selectedMCPs.map((s) => ({ type: "mcp" as const, name: s })),
    ];
    setInput("");

    setMessages((prev) => [...prev, { id: uid(), role: "user", content: userMsg, attachments: attachments.length > 0 ? attachments : undefined }]);
    setIsThinking(true);
    setThinkingStartedAt(Date.now());
    setThinkingStage(0);

    const streamDelay = 800 + Math.random() * 600;
    setTimeout(() => {
      if (!agentCreated) {
        // First message: assemble the agent
        const newConfig = assembleAgent(userMsg, selectedSkills, selectedMCPs);
        setAgentConfig(newConfig);
        setAgentCreated(true);
        setSelectedSkills([]);
        setSelectedMCPs([]);

        // Stage 1: 分析需求
        setThinkingStage(0);

        // Stage 2: 匹配 MCP / Skill — 以工具调用卡片树展示
        setTimeout(() => {
          setThinkingStage(1);
          const toolCalls: ToolCall[] = [
            {
              id: uid(),
              kind: "search",
              name: "需求解析",
              summary: `提取关键词：${userMsg.slice(0, 30)}`,
              status: "success",
              input: userMsg,
              output: `intents: [agent_assembly]\nkeywords detected`,
            },
            ...newConfig.mcpServers.map<ToolCall>((m) => ({
              id: uid(),
              kind: "mcp",
              name: "匹配 MCP",
              summary: `命中：${m}`,
              status: "success",
              input: `query: ${userMsg.slice(0, 40)}`,
              output: `matched mcp: ${m}`,
            })),
            ...newConfig.skills.map<ToolCall>((s) => ({
              id: uid(),
              kind: "skill",
              name: "匹配 Skill",
              summary: `命中：${s}`,
              status: "success",
              input: `query: ${userMsg.slice(0, 40)}`,
              output: `matched skill: ${s}`,
            })),
          ];
          setMessages((prev) => [
            ...prev,
            { id: uid(), role: "system", content: "", type: "tool-calls", toolCalls },
          ]);
        }, 600);

        // Stage 3: 生成配置
        setTimeout(() => {
          setThinkingStage(2);
          const genCall: ToolCall = {
            id: uid(),
            kind: "skill",
            name: "生成配置",
            summary: `model=${newConfig.model} · ${newConfig.skills.length} skills · ${newConfig.mcpServers.length} mcps`,
            status: "success",
            output: `system prompt generated\nmodel: ${newConfig.model}`,
          };
          setMessages((prev) => [
            ...prev,
            { id: uid(), role: "system", content: "", type: "tool-calls", toolCalls: [genCall] },
          ]);
        }, 1300);

        setTimeout(() => {
          setMessages((prev) => [...prev, { id: uid(), role: "system", content: "✅ 智能体草稿已生成，可在右侧微调", type: "confirm" }]);

          // Stream assistant response
          const responseId = uid();
          const fullText = `智能体草稿已生成！\n\n**配置摘要：**\n- 模型：${newConfig.model}\n- 技能：${newConfig.skills.length > 0 ? newConfig.skills.join("、") : "无"}\n- MCP：${newConfig.mcpServers.length > 0 ? newConfig.mcpServers.join("、") : "无"}\n\n你可以在右侧「配置」面板查看和编辑详细配置，或切换到「调试」面板发送消息测试智能体。\n\n如果需要修改，直接告诉我即可。`;

          setMessages((prev) => [...prev, { id: responseId, role: "assistant", content: "", isStreaming: true }]);
          let charIndex = 0;
          const interval = setInterval(() => {
            charIndex += 3;
            if (charIndex >= fullText.length) {
              clearInterval(interval);
              setMessages((prev) =>
                prev.map((m) => m.id === responseId ? { ...m, content: fullText, isStreaming: false } : m)
              );
              setIsThinking(false);
              setThinkingStartedAt(null);
            } else {
              setMessages((prev) =>
                prev.map((m) => m.id === responseId ? { ...m, content: fullText.slice(0, charIndex) } : m)
              );
            }
          }, 20);

          // Add debug events
          setDebugEvents((prev) => [
            ...prev,
            { id: uid(), type: "init", detail: "智能体初始化完成", timestamp: new Date() },
            { id: uid(), type: "config", detail: `模型: ${newConfig.model}`, timestamp: new Date() },
            { id: uid(), type: "config", detail: `技能: [${newConfig.skills.join(", ")}]`, timestamp: new Date() },
            { id: uid(), type: "config", detail: `MCP: [${newConfig.mcpServers.join(", ")}]`, timestamp: new Date() },
          ]);
        }, 2000);
      } else {
        // Subsequent messages: refine the agent
        const lower = userMsg.toLowerCase();
        const responseId = uid();
        let fullText = "好的，已根据你的需求更新了配置。";

        if (lower.includes("prompt") || lower.includes("提示词") || lower.includes("系统")) {
          fullText = "System Prompt 已更新。你可以在配置面板中查看修改后的内容。";
          setDebugEvents((prev) => [...prev, { id: uid(), type: "update", detail: "System Prompt 已更新", timestamp: new Date() }]);
        } else if (lower.includes("模型") || lower.includes("model")) {
          fullText = "模型已更新。建议在调试面板中重新测试智能体表现。";
          setDebugEvents((prev) => [...prev, { id: uid(), type: "update", detail: "模型配置已更新", timestamp: new Date() }]);
        } else if (lower.includes("skill") || lower.includes("技能")) {
          fullText = "技能列表已更新。新添加的技能将在智能体下次运行时生效。";
          setDebugEvents((prev) => [...prev, { id: uid(), type: "update", detail: "技能配置已更新", timestamp: new Date() }]);
        } else if (lower.includes("mcp")) {
          fullText = "MCP 服务已更新。新服务连接将在下次调用时生效。";
          setDebugEvents((prev) => [...prev, { id: uid(), type: "update", detail: "MCP 服务已更新", timestamp: new Date() }]);
        }

        setMessages((prev) => [...prev, { id: uid(), role: "system", content: "✓ 配置已更新", type: "confirm" }]);
        setMessages((prev) => [...prev, { id: responseId, role: "assistant", content: "", isStreaming: true }]);

        let charIndex = 0;
        const interval = setInterval(() => {
          charIndex += 2;
          if (charIndex >= fullText.length) {
            clearInterval(interval);
            setMessages((prev) =>
              prev.map((m) => m.id === responseId ? { ...m, content: fullText, isStreaming: false } : m)
            );
            setIsThinking(false);
            setThinkingStartedAt(null);
          } else {
            setMessages((prev) =>
              prev.map((m) => m.id === responseId ? { ...m, content: fullText.slice(0, charIndex) } : m)
            );
          }
        }, 30);
      }
    }, streamDelay);
  };

  /* ── Preview send (debug chat) ── */
  const handlePreviewSend = () => {
    if (!previewInput.trim() || isAgentRunning) return;
    const msg = previewInput.trim();
    setPreviewInput("");
    setPreviewMessages((prev) => [...prev, { id: uid(), role: "user", content: msg, timestamp: new Date() }]);
    setDebugEvents((prev) => [...prev, { id: uid(), type: "input", detail: `用户输入: "${msg}"`, timestamp: new Date() }]);
    setIsAgentRunning(true);

    // Simulate tool call
    setTimeout(() => {
      if (agentConfig.skills.includes("Web Search")) {
        setPreviewMessages((prev) => [
          ...prev,
          { id: uid(), role: "tool", content: "正在调用 Web Search…", toolName: "Web Search", timestamp: new Date() },
        ]);
        setDebugEvents((prev) => [...prev, { id: uid(), type: "tool_call", detail: "调用工具: Web Search", timestamp: new Date() }]);
      }
    }, 600);

    setTimeout(() => {
      if (agentConfig.skills.includes("Web Search")) {
        setDebugEvents((prev) => [...prev, { id: uid(), type: "tool_result", detail: "Web Search 返回 3 条结果", timestamp: new Date() }]);
      }
    }, 1200);

    setTimeout(() => {
      const responseId = uid();
      const fullText = `根据你的需求，这是我的回答：\n\n1. **关键信息**：已分析与「${msg}」相关的内容\n2. **建议操作**：可以进一步优化和调整\n3. **当前状态**：智能体运行正常`;

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

  const formatTime = (d: Date) => d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const handlePublish = (target: "marketplace" | "agent") => {
    setPublishOpen(false);
    toast({
      title: target === "marketplace" ? "已发布到应用广场" : "已作为独立应用发布",
      description: `${agentConfig.name || "我的智能体"} 已成功发布`,
    });
  };

  const rightTabs = agentCreated
    ? [
        { key: "preview" as const, label: "在线体验", icon: MessageSquare },
        { key: "config" as const, label: "配置", icon: FormInput },
        { key: "logs" as const, label: "会话记录", icon: History },
      ]
    : [{ key: "config" as const, label: "配置", icon: FormInput }];

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
        {/* ── Left: Chat ── */}
        <ResizablePanel defaultSize={38} minSize={20} maxSize={55} className="flex flex-col min-w-0">
          <div ref={leftScrollRef} className="flex-1 overflow-auto p-5 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.type === "confirm" ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    {msg.content}
                  </div>
                ) : msg.type === "tool-calls" && msg.toolCalls ? (
                  <ToolCallGroup calls={msg.toolCalls} />
                ) : msg.type === "assembly" ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                    {msg.content}
                  </div>
                ) : msg.role === "system" ? (
                  <div>
                    <p className="text-xs text-muted-foreground">{msg.content}</p>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 border border-border rounded-lg p-2.5 bg-muted/30">
                        <div className="flex flex-wrap gap-1.5">
                          {msg.attachments.map((att, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px] gap-1 h-5 bg-card">
                              {att.type === "skill" ? <Zap className="w-2.5 h-2.5 text-primary" /> : <Server className="w-2.5 h-2.5 text-primary" />}
                              {att.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : msg.role === "user" ? (
                  <div className="flex flex-col items-end gap-1">
                    <div className="max-w-[80%] rounded-lg px-3 py-2 text-xs bg-primary text-primary-foreground whitespace-pre-wrap">
                      {msg.content}
                    </div>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1 max-w-[80%] justify-end">
                        {msg.attachments.map((att, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] gap-1 h-5">
                            {att.type === "skill" ? <Zap className="w-2.5 h-2.5" /> : <Server className="w-2.5 h-2.5" />}
                            {att.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="max-w-[85%] text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                    {msg.isStreaming && <span className="inline-block w-1 h-3.5 bg-primary ml-0.5 animate-pulse" />}
                  </div>
                )}
              </div>
            ))}
            {isThinking && !messages.some((m) => m.isStreaming) && (
              <AIStatusPill stageIndex={thinkingStage} startedAt={thinkingStartedAt ?? undefined} />
            )}
          </div>

          {/* Input area with attachments */}
          <div className="border-t border-border p-3 space-y-2">
            {/* Selected attachments */}
            {(selectedSkills.length > 0 || selectedMCPs.length > 0) && (
              <div className="flex flex-wrap gap-1">
                {selectedSkills.map((s) => (
                  <Badge key={s} variant="secondary" className="text-[10px] gap-1 h-5">
                    <Zap className="w-2.5 h-2.5" />
                    {s}
                    <button onClick={() => toggleSkill(s)} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                  </Badge>
                ))}
                {selectedMCPs.map((s) => (
                  <Badge key={s} variant="secondary" className="text-[10px] gap-1 h-5">
                    <Server className="w-2.5 h-2.5" />
                    {s}
                    <button onClick={() => toggleMCP(s)} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder={agentCreated ? "继续修改或完善智能体…" : "描述你想创建的智能体…"}
                disabled={isThinking}
                className="flex-1 h-8 text-xs"
              />
              <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSend} disabled={isThinking || !input.trim()}>
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* ── Right: Workspace ── */}
        <ResizablePanel defaultSize={62} minSize={30} className="flex flex-col min-w-0">
          {/* Header tabs */}
          <div className="border-b border-border px-4 flex items-center justify-between">
            <div className="flex gap-1">
              {rightTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setRightTab(tab.key)}
                    className={`text-xs py-2.5 px-2.5 transition-colors flex items-center gap-1.5 ${
                      rightTab === tab.key
                        ? "font-medium text-foreground border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
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
              {/* Publish button */}
              {agentCreated && (
                <Button size="sm" className="h-7 text-[11px] gap-1.5 px-3" onClick={() => setPublishOpen(true)}>
                  <Rocket className="w-3 h-3" />
                  发布
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          {rightTab === "config" ? (
            configViewMode === "structured" ? (
              <StructuredConfigView config={agentConfig} onConfigChange={setAgentConfig} />
            ) : (
              <RawConfigView config={agentConfig} />
            )
          ) : rightTab === "preview" ? (
            <div className="flex flex-col flex-1 min-h-0">
              <div ref={rightScrollRef} className="flex-1 overflow-auto p-4">
                {previewMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                    <MessageSquare className="w-8 h-8 opacity-30" />
                    <p className="text-xs">发送消息来调试智能体</p>
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
                )}
              </div>
              {/* Debug chat input */}
              <div className="border-t border-border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={previewInput}
                    onChange={(e) => setPreviewInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handlePreviewSend()}
                    placeholder="向智能体发送消息来测试…"
                    disabled={isAgentRunning}
                    className="flex-1 h-8 text-xs"
                  />
                  <Button
                    size="icon"
                    className="h-8 w-8"
                    onClick={handlePreviewSend}
                    disabled={isAgentRunning || !previewInput.trim()}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Logs tab */
            <div className="flex-1 overflow-auto p-4">
              {debugEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                  <Bug className="w-8 h-8 opacity-30" />
                  <p className="text-xs">暂无日志记录</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {debugEvents.map((evt) => (
                    <div key={evt.id} className="flex items-start gap-2 p-2 rounded bg-muted/50 text-[10px] font-mono">
                      <span className="text-muted-foreground shrink-0">{formatTime(evt.timestamp)}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">{evt.type}</Badge>
                      <span className="text-foreground">{evt.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Publish Dialog */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">发布智能体</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            选择发布方式，将 <span className="font-medium text-foreground">{agentConfig.name || "我的智能体"}</span> 发布到平台。
          </p>
          <div className="grid gap-3 py-2">
            <button
              onClick={() => handlePublish("marketplace")}
              className="flex items-center gap-3 border border-border rounded-lg p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">发布到应用广场</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">作为独立应用发布，其他用户可以直接使用</p>
              </div>
            </button>
            <button
              onClick={() => handlePublish("agent")}
              className="flex items-center gap-3 border border-border rounded-lg p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">发布为项目智能体</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">添加到项目智能体列表，供团队内部使用</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateAgentPage;
