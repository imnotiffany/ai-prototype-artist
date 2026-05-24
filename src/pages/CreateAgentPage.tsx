import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Send, ChevronRight, CheckCircle2, Copy, Loader2, ChevronDown, Code2, Settings2,
  Zap, Server, Plus, X, Rocket, Package, Bot, ScrollText, MessageSquare, Bug,
  History, FormInput, KeyRound, Link2, Eye, EyeOff, AlertCircle, ExternalLink, Save, Sparkles, RefreshCw,
  Search,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { AIStatusPill } from "@/components/AIStatusPill";
import { ToolCallGroup, type ToolCall } from "@/components/ToolCallCard";
import { CapabilityPickerDialog } from "@/components/CapabilityPickerDialog";
import { mcpRequiresCredential, mockCredentials, categories, mockApiKeys } from "@/data/mockData";
import { isMcpConfigured, subscribeMcpStore } from "@/data/mcpCredentialStore";
import { AlertTriangle, FolderKanban } from "lucide-react";

/* ── Types ── */
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  type?: "question" | "confirm" | "api-call" | "text" | "assembly" | "tool-calls" | "clarify" | "assembly-summary";
  attachments?: { type: "skill" | "mcp"; name: string }[];
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
  /** clarify 类型：澄清问题列表 */
  clarifyQuestions?: string[];
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
  apiKey: string;
  systemPrompt: string;
  tools: { name: string; id: string; permissions: number; permissionPolicy: string }[];
  skills: string[];
  mcpServers: string[];
  subagents: string[];
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
  model: "aliyun/qwen3.6-plus",
  apiKey: "",
  systemPrompt: "",
  tools: [],
  skills: [],
  mcpServers: [],
  subagents: [],
  fengsheng: { enabled: false, appKey: "", appSecret: "", robotCode: "", connected: false },
};

// Demo 默认绑定（无论用户输入什么，都先帮 Ta 装好这几个）
const DEMO_DEFAULT_SKILLS_COUNT = 3;
const DEMO_DEFAULT_MCPS_COUNT = 2;
const DEMO_DEFAULT_SUBAGENTS_COUNT = 2;

/* ── Available Skills & MCPs (from shared resource library) ── */
import { getActiveSkills, getActiveMCPs } from "@/data/mockData";
const availableSkills = getActiveSkills();
const availableMCPs = getActiveMCPs();
const availableSubagents = availableSkills.slice(0, 8).map((s) => ({
  name: `${s.name} 子智能体`,
  description: `基于「${s.name}」封装的子智能体，可被主智能体调用`,
  scope: "market" as const,
  tags: s.tags ?? [],
}));

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
  // Demo 阶段：无论输入什么，都默认绑定一组 Skill / MCP / 子智能体，方便演示
  const demoSkills = availableSkills.slice(0, 3).map((s) => s.name);
  const demoMCPs = availableMCPs.slice(0, 2).map((m) => m.name);
  const demoSubagents = availableSubagents.slice(0, 2).map((s) => s.name);
  const allSkills = [...new Set([...skills, ...detectedSkills, ...demoSkills])];
  const allMCPs = [...new Set([...mcps, ...detectedMCPs, ...demoMCPs])];

  const lower = description.toLowerCase();
  let model = "aliyun/qwen3.6-plus";
  if (lower.includes("快速") || lower.includes("简单")) model = "aliyun/deepseek-v4-flash";
  if (lower.includes("分析") || lower.includes("推理")) model = "aliyun/deepseek-v4-pro";

  const systemPrompt = `你是一个专业的AI助手。\n\n## 核心能力\n${description}\n\n## 工具使用\n${allSkills.length > 0 ? `你可以使用以下技能：${allSkills.join("、")}` : "暂无外部技能"}\n${allMCPs.length > 0 ? `你可以连接以下服务：${allMCPs.join("、")}` : ""}\n\n## 行为准则\n- 始终准确、有帮助地回答问题\n- 在需要时主动使用可用工具\n- 输出结构化、易读的结果`;

  return {
    name: description.slice(0, 20).replace(/[，。！？]/g, ""),
    version: "v0.0.1",
    model,
    apiKey: "",
    systemPrompt,
    tools: [],
    skills: allSkills,
    mcpServers: allMCPs,
    subagents: demoSubagents,
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
        {/* 名称在「保存」时弹出确认卡片中编辑，配置区不展示 */}

        {/* Version 在自动创建调试页固定为 v0.0.1，隐藏切换器 */}
        <div className="px-5 py-4">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Version</label>
          <div className="h-8 px-3 flex items-center text-xs text-foreground bg-muted/30 rounded border border-border">
            {config.version}
            <span className="ml-auto text-[10px] text-muted-foreground">首次创建固定版本</span>
          </div>
        </div>

        {/* Model */}
        <div className="px-5 py-4">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Model</label>
          <Select value={config.model} onValueChange={(v) => onConfigChange({ ...config, model: v })}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aliyun/qwen3.6-plus">aliyun/qwen3.6-plus</SelectItem>
              <SelectItem value="aliyun/deepseek-v4-pro">aliyun/deepseek-v4-pro</SelectItem>
              <SelectItem value="aliyun/deepseek-v4-flash">aliyun/deepseek-v4-flash</SelectItem>
              <SelectItem value="aiplat/GLM-5.1">aiplat/GLM-5.1</SelectItem>
            </SelectContent>
          </Select>

          {/* API Key */}
          <label className="text-xs font-medium text-muted-foreground mb-1 block mt-3">API Key</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="h-8 w-full justify-between text-xs font-normal px-3"
              >
                {config.apiKey
                  ? mockApiKeys.find((k) => k.id === config.apiKey)?.name ?? "选择 API Key"
                  : "选择 API Key"}
                <Search className="ml-2 h-3 w-3 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="搜索 API Key..." className="h-9 text-xs" />
                <CommandList>
                  <CommandEmpty className="text-xs py-3">未找到匹配的 API Key</CommandEmpty>
                  <CommandGroup>
                    {mockApiKeys.map((k) => (
                      <CommandItem
                        key={k.id}
                        value={k.name}
                        onSelect={() => {
                          onConfigChange({ ...config, apiKey: k.id });
                        }}
                        className="text-xs"
                      >
                        <span className="font-medium">{k.name}</span>
                        <span className="ml-2 text-[10px] text-muted-foreground">{k.keyMask}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-muted-foreground">MCP 服务</label>
            <CapabilityPickerDialog
              items={availableMCPs}
              selected={config.mcpServers}
              onToggle={(name) => onConfigChange(
                config.mcpServers.includes(name)
                  ? { ...config, mcpServers: config.mcpServers.filter((s) => s !== name) }
                  : { ...config, mcpServers: [...config.mcpServers, name] }
              )}
              icon={<Server className="w-3.5 h-3.5" />}
              label="MCP"
              marketLink="/vault"
            />
          </div>
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
          {/* MCP Servers — 仿手动组装：chip + 凭据 popover */}
          {config.mcpServers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {config.mcpServers.map((mcpName, i) => {
                const needsCred = mcpRequiresCredential(mcpName);
                const creds = mockCredentials.filter((c) => c.mcpServer === mcpName);
                const bound = needsCred && (isMcpConfigured(mcpName) || creds.length > 0);
                const credMissing = needsCred && !bound;
                return (
                  <div
                    key={i}
                    className={`inline-flex items-center gap-1.5 rounded-md border pl-2 pr-1 py-1 text-xs ${
                      credMissing ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/20" : "border-border bg-card"
                    }`}
                  >
                    <Server className="w-3 h-3 text-primary shrink-0" />
                    <span className="font-medium max-w-[140px] truncate">{mcpName}</span>
                    {needsCred ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className={`inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded ${
                              credMissing ? "text-amber-700 hover:bg-amber-100" : "text-emerald-700 hover:bg-emerald-100"
                            }`}
                            title="凭据"
                          >
                            {credMissing ? <AlertTriangle className="w-2.5 h-2.5" /> : <KeyRound className="w-2.5 h-2.5" />}
                            {credMissing ? "未绑定" : "已绑定"}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" align="start">
                          <Label className="text-[11px] text-muted-foreground">选择凭据</Label>
                          {creds.length === 0 ? (
                            <div className="mt-2 space-y-2">
                              <p className="text-[11px] text-amber-600">该 MCP 暂无可用凭据</p>
                              <Link
                                to="/vault"
                                className="inline-flex items-center justify-center gap-1 h-7 px-2 rounded border border-border text-xs hover:bg-muted w-full"
                              >
                                前往凭据管理 <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                          ) : (
                            <Select defaultValue={creds[0].id}>
                              <SelectTrigger className="h-7 text-xs mt-1.5"><SelectValue placeholder="选择凭据" /></SelectTrigger>
                              <SelectContent>
                                {creds.map((c) => (
                                  <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/30 text-[10px] h-4 px-1">免凭据</Badge>
                    )}
                    <button
                      onClick={() => onConfigChange({ ...config, mcpServers: config.mcpServers.filter((_, j) => j !== i) })}
                      className="text-muted-foreground hover:text-destructive p-0.5"
                      title="移除"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground">Skill</label>
            <CapabilityPickerDialog
              items={availableSkills}
              selected={config.skills}
              onToggle={(name) => onConfigChange(
                config.skills.includes(name)
                  ? { ...config, skills: config.skills.filter((s) => s !== name) }
                  : { ...config, skills: [...config.skills, name] }
              )}
              icon={<Zap className="w-3.5 h-3.5" />}
              label="Skill"
              marketLink="https://ai.sf-express.com/project/enter/skill-app/skills"
            />
          </div>
          {config.skills.length === 0 ? (
            <p className="text-xs text-muted-foreground">暂无技能</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {config.skills.map((s) => {
                const meta = availableSkills.find((x) => x.name === s);
                return (
                  <div
                    key={s}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card pl-2 pr-1 py-1 text-xs"
                    title={meta?.description}
                  >
                    <Zap className="w-3 h-3 text-primary shrink-0" />
                    <span className="font-medium max-w-[160px] truncate">{s}</span>
                    {meta?.scope === "project" && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1 border-border">项目</Badge>
                    )}
                    <button
                      onClick={() => onConfigChange({ ...config, skills: config.skills.filter((x) => x !== s) })}
                      className="text-muted-foreground hover:text-destructive p-0.5"
                      title="移除"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 子智能体 */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground">子智能体</label>
            <CapabilityPickerDialog
              items={availableSubagents}
              selected={config.subagents}
              onToggle={(name) => onConfigChange(
                config.subagents.includes(name)
                  ? { ...config, subagents: config.subagents.filter((s) => s !== name) }
                  : { ...config, subagents: [...config.subagents, name] }
              )}
              icon={<Bot className="w-3.5 h-3.5" />}
              label="子智能体"
              marketLink="/"
            />
          </div>
          {config.subagents.length === 0 ? (
            <p className="text-xs text-muted-foreground">暂无子智能体</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {config.subagents.map((s) => {
                const meta = availableSubagents.find((x) => x.name === s);
                return (
                  <div
                    key={s}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card pl-2 pr-1 py-1 text-xs"
                    title={meta?.description}
                  >
                    <Bot className="w-3 h-3 text-primary shrink-0" />
                    <span className="font-medium max-w-[160px] truncate">{s}</span>
                    <button
                      onClick={() => onConfigChange({ ...config, subagents: config.subagents.filter((x) => x !== s) })}
                      className="text-muted-foreground hover:text-destructive p-0.5"
                      title="移除"
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
${config.tools.map(t => `  - type: ${t.id}
    configs: []
    default_config:
      enabled: true
      permission_policy:
        type: ${t.permissionPolicy === "Always allow" ? "always_allow" : "user_controlled"}`).join("\n") || "  []"}
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
      tools: config.tools.map(t => ({ type: t.id, configs: [], default_config: { enabled: true, permission_policy: { type: t.permissionPolicy === "Always allow" ? "always_allow" : "user_controlled" } })),
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

/* ── Assembly Summary Card (auto-装配后的汇总卡片) ── */
const AssemblySummaryCard = ({
  config,
  onAddSkill,
  onAddMcp,
  onAddSubagent,
  onSave,
  onDebug,
}: {
  config: AgentConfig;
  onAddSkill: (name: string) => void;
  onAddMcp: (name: string) => void;
  onAddSubagent: (name: string) => void;
  onSave: () => void;
  onDebug: () => void;
}) => {
  // 订阅凭据 store，配置完成后自动刷新
  const [, setTick] = useState(0);
  useEffect(() => subscribeMcpStore(() => setTick((t) => t + 1)), []);

  const skillItems = getActiveSkills();
  const mcpItems = getActiveMCPs();
  // 子智能体可选项 mock：从 active skills 借用名字简化，可后续替换
  const subagentItems = skillItems.slice(0, 6).map((s) => ({ name: `${s.name} 子智能体`, description: `基于「${s.name}」封装的子智能体`, scope: "market" as const }));

  const pending = config.mcpServers.filter((m) => mcpRequiresCredential(m) && !isMcpConfigured(m));
  const ready = config.mcpServers.filter((m) => !pending.includes(m));
  const total = config.skills.length + config.mcpServers.length;
  const downscale = total > 8;

  return (
    <div className="space-y-2.5">
      {/* Downscale 提示条 */}
      {downscale && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800/60">
          <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div className="flex-1">
            为保证响应速度，已为你精简到核心能力（{total} 项）。
            <button className="ml-1 underline hover:no-underline" onClick={() => toast({ title: "查看被精简的能力", description: "（mock）将展示剔除项与原因" })}>
              查看被精简项
            </button>
          </div>
        </div>
      )}

      {/* 基础信息 */}
      <div className="border border-border rounded-lg p-3 bg-card">
        <div className="flex items-center gap-1.5 mb-2">
          <Settings2 className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">基础信息</span>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 ml-auto">{config.version}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div><span className="text-muted-foreground">名称：</span><span className="text-foreground">{config.name || "—"}</span></div>
          <div><span className="text-muted-foreground">模型：</span><span className="text-foreground">{config.model}</span></div>
        </div>
      </div>

      {/* System Prompt 折叠 */}
      <details className="border border-border rounded-lg bg-card group">
        <summary className="flex items-center gap-1.5 px-3 py-2 cursor-pointer text-xs font-semibold text-foreground list-none">
          <ScrollText className="w-3.5 h-3.5 text-primary" />
          System Prompt
          <ChevronDown className="w-3 h-3 ml-auto group-open:rotate-180 transition-transform" />
        </summary>
        <pre className="px-3 pb-3 text-[10px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed border-t border-border pt-2">
          {config.systemPrompt.slice(0, 600)}{config.systemPrompt.length > 600 && "…"}
        </pre>
      </details>

      {/* MCP 装配 */}
      <div className="border border-border rounded-lg p-3 bg-card">
        <div className="flex items-center gap-1.5 mb-2">
          <Server className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">MCP 服务</span>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5">{config.mcpServers.length}</Badge>
          {pending.length > 0 && (
            <Badge className="text-[10px] h-4 px-1.5 bg-destructive/10 text-destructive border-destructive/30">{pending.length} 待配置</Badge>
          )}
          <div className="ml-auto">
            <CapabilityPickerDialog
              items={mcpItems}
              selected={config.mcpServers}
              onToggle={onAddMcp}
              icon={<Server className="w-3.5 h-3.5" />}
              label="MCP"
              marketLink="/vault"
            />
          </div>
        </div>
        {config.mcpServers.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-1">未匹配到 MCP，可手动添加</p>
        ) : (
          <ul className="space-y-1">
            {ready.map((m) => (
              <li key={m} className="flex items-center gap-2 text-[11px] py-1">
                <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                <span className="text-foreground truncate">{m}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{mcpRequiresCredential(m) ? "已配置" : "开箱即用"}</span>
              </li>
            ))}
            {pending.map((m) => (
              <li key={m} className="flex items-center gap-2 text-[11px] py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                <span className="text-foreground truncate">{m}</span>
                <Link
                  to="/vault"
                  className="ml-auto text-[10px] text-primary hover:underline flex items-center gap-0.5"
                  title="前往 MCP 管理配置凭据"
                >
                  去 MCP 配置 <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Skill 装配 */}
      <div className="border border-border rounded-lg p-3 bg-card">
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Skill</span>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5">{config.skills.length}</Badge>
          <div className="ml-auto">
            <CapabilityPickerDialog
              items={skillItems}
              selected={config.skills}
              onToggle={onAddSkill}
              icon={<Zap className="w-3.5 h-3.5" />}
              label="Skill"
              marketLink="https://ai.sf-express.com/project/enter/skill-app/skills"
            />
          </div>
        </div>
        {config.skills.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-1">未匹配到 Skill，可手动添加</p>
        ) : (
          <ul className="space-y-1">
            {config.skills.map((s) => (
              <li key={s} className="flex items-center gap-2 text-[11px] py-1">
                <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                <span className="text-foreground truncate">{s}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 子智能体（默认展开） */}
      <div className="border border-border rounded-lg p-3 bg-card">
        <div className="flex items-center gap-1.5 mb-2">
          <Bot className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">子智能体</span>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5">0</Badge>
          <div className="ml-auto">
            <CapabilityPickerDialog
              items={subagentItems}
              selected={[]}
              onToggle={onAddSubagent}
              icon={<Bot className="w-3.5 h-3.5" />}
              label="子智能体"
              marketLink="/"
            />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground py-1">AI 暂未推荐子智能体，可手动添加</p>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" className="h-8 text-xs gap-1.5 flex-1" onClick={onSave}>
          <Save className="w-3.5 h-3.5" /> 保存
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 flex-1" onClick={onDebug}>
          <Bug className="w-3.5 h-3.5" /> 立即调试
        </Button>
      </div>
      {pending.length > 0 && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-destructive" />
          仍有 {pending.length} 项 MCP 凭据未配置，配置完成前无法发布到广场
        </p>
      )}
    </div>
  );
};

/* ── Main Component ── */
const CreateAgentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialState = (location.state ?? {}) as { description?: string; autoStart?: boolean };
  const [configViewMode, setConfigViewMode] = useState<"structured" | "raw">("structured");
  const [rightTab, setRightTab] = useState<"config" | "preview" | "logs">("config");
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStartedAt, setThinkingStartedAt] = useState<number | null>(null);
  const [thinkingStage, setThinkingStage] = useState(0);
  const [previewInput, setPreviewInput] = useState("");
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentConfig, setAgentConfig] = useState<AgentConfig>(() => ({
    ...defaultConfig,
    skills: availableSkills.slice(0, DEMO_DEFAULT_SKILLS_COUNT).map((s) => s.name),
    mcpServers: availableMCPs.slice(0, DEMO_DEFAULT_MCPS_COUNT).map((m) => m.name),
    subagents: availableSubagents.slice(0, DEMO_DEFAULT_SUBAGENTS_COUNT).map((s) => s.name),
  }));
  const [agentCreated, setAgentCreated] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  // Save 确认卡片字段（仿手动组装）
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [saveCategory, setSaveCategory] = useState(categories[0]);
  const [saveAllowCopy, setSaveAllowCopy] = useState(true);
  const [savePublishToHub, setSavePublishToHub] = useState(false);
  const [avatarSeed, setAvatarSeed] = useState(() => Math.random().toString(36).slice(2, 10));
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const avatarUrl = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=dbeafe,fde68a,bbf7d0,fecaca,e9d5ff`;
  const regenerateAvatar = () => {
    setGeneratingAvatar(true);
    setTimeout(() => {
      setAvatarSeed(Math.random().toString(36).slice(2, 10) + Date.now().toString(36));
      setGeneratingAvatar(false);
    }, 600);
  };

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

  // 自动开始：来自 CreatePage 的「立即生成」入口
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (initialState.autoStart && initialState.description?.trim()) {
      autoStartedRef.current = true;
      setInput(initialState.description.trim());
      // 下一个 tick 触发发送
      setTimeout(() => { handleSendRef.current?.(); }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleSendRef = useRef<() => void>();

  const toggleSkill = (name: string) => {
    setSelectedSkills((prev) => prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]);
  };
  const toggleMCP = (name: string) => {
    setSelectedMCPs((prev) => prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]);
  };

  /* ── Send: create or refine agent ── */
  const handleSend = () => {
    // 注意：autoStart 时 input 在上一个 tick 由 setInput 写入
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
          const fullText = `智能体草稿已生成！\n\n**配置摘要：**\n- 模型：${newConfig.model}\n- 技能：${newConfig.skills.length > 0 ? newConfig.skills.join("、") : "无"}\n- MCP：${newConfig.mcpServers.length > 0 ? newConfig.mcpServers.join("、") : "无"}\n\n下方卡片中可继续添加 MCP / Skill / 子智能体，需要凭据的 MCP 请点击「去 MCP 配置」。`;

          setMessages((prev) => [...prev, { id: responseId, role: "assistant", content: "", isStreaming: true }]);
          let charIndex = 0;
          const interval = setInterval(() => {
            charIndex += 3;
            if (charIndex >= fullText.length) {
              clearInterval(interval);
              setMessages((prev) =>
                prev.map((m) => m.id === responseId ? { ...m, content: fullText, isStreaming: false } : m)
              );
              // 装配结果直接体现在右侧「配置」面板，无需在对话流插入汇总卡片
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
  handleSendRef.current = handleSend;

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

  const rightTabs = [
    { key: "config" as const, label: "配置", icon: FormInput },
    { key: "preview" as const, label: "对话视图", icon: MessageSquare },
    { key: "logs" as const, label: "调试视图", icon: History },
  ];

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
            {isThinking && (
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
              {/* Save button — 始终展示，点击弹出确认卡片 */}
              <Button
                size="sm"
                className="h-7 text-[11px] gap-1.5 px-3"
                onClick={() => {
                  setSaveName((prev) => prev || agentConfig.name || "");
                  setSaveDesc((prev) => prev || initialState.description || "");
                  setPublishOpen(true);
                }}
              >
                <Save className="w-3 h-3" />
                保存
              </Button>
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

      {/* Save Dialog — 仿手动组装的保存确认卡片 */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-1.5">
              <FolderKanban className="w-4 h-4 text-primary" />
              保存到项目管理
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              确认基础信息后保存为新版本（{agentConfig.version}）。如需发布，请在项目管理或详情页右上角的「发布」按钮中操作。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="text-xs">头像</Label>
              <div className="mt-1.5 flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg border border-border bg-muted/40 overflow-hidden flex items-center justify-center shrink-0">
                  {generatingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <img src={avatarUrl} alt="智能体头像" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={regenerateAvatar} disabled={generatingAvatar}>
                    <RefreshCw className={`w-3 h-3 ${generatingAvatar ? "animate-spin" : ""}`} />
                    {generatingAvatar ? "生成中…" : "AI 重新生成"}
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs">名称 <span className="text-destructive">*</span></Label>
              <Input
                className="mt-1.5 h-8 text-xs"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="例如：财务月报助手"
              />
            </div>
            <div>
              <Label className="text-xs">简介</Label>
              <Textarea
                className="mt-1.5 text-xs"
                rows={3}
                value={saveDesc}
                onChange={(e) => setSaveDesc(e.target.value)}
                placeholder="一句话描述智能体能力"
              />
            </div>
            <div>
              <Label className="text-xs">分类</Label>
              <Select value={saveCategory} onValueChange={setSaveCategory}>
                <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
              <div>
                <p className="text-xs text-foreground">支持复制</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">允许其他成员复制本智能体作为模板</p>
              </div>
              <Switch checked={saveAllowCopy} onCheckedChange={setSaveAllowCopy} />
            </div>
            <div className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
              <div>
                <p className="text-xs text-foreground">同步发布到 Agent Hub</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">开启后保存即同步发布，并提供运行监控</p>
              </div>
              <Switch checked={savePublishToHub} onCheckedChange={setSavePublishToHub} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPublishOpen(false)}>取消</Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => {
                if (!saveName.trim()) {
                  toast({ title: "请填写智能体名称", variant: "destructive" });
                  return;
                }
                setAgentConfig({ ...agentConfig, name: saveName.trim() });
                setAgentCreated(true);
                setPublishOpen(false);
                toast({
                  title: "已保存到项目管理",
                  description: `${saveName.trim()} · ${saveCategory}${savePublishToHub ? "（已同步发布到 Agent Hub）" : ""}`,
                });
              }}
            >
              <Save className="w-3 h-3" /> 保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateAgentPage;
