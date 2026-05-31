import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Send, ChevronRight, CheckCircle2, Copy, Loader2, ChevronDown, Code2, Settings2,
  Zap, Server, Plus, X, Rocket, Package, Bot, ScrollText, MessageSquare, Bug,
  History, FormInput, KeyRound, Link2, Eye, EyeOff, AlertCircle, ExternalLink, Save, Wand2, RefreshCw,
  Search, Terminal,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
import { type ToolCall } from "@/components/ToolCallCard";
import { EventRow } from "@/components/RunTimelineView";
import type { TimelineSubEvent, CategoryKey } from "@/data/timelineMock";
import { CapabilityPickerDialog } from "@/components/CapabilityPickerDialog";
import { PublishAgentDialog } from "@/components/PublishAgentDialog";
import { mcpRequiresCredential, mockCredentials, categories, mockApiKeys } from "@/data/mockData";
import { isMcpConfigured, subscribeMcpStore } from "@/data/mcpCredentialStore";
import { AlertTriangle, FolderKanban, FolderOpen, ArrowRight } from "lucide-react";
import { ChatComposer, type ChatComposerPayload } from "@/components/ChatComposer";
import { ArtifactsDrawer } from "@/components/ArtifactsDrawer";
import { mockArtifacts, type Artifact, guessTypeFromName } from "@/data/artifacts";

/* ── Types ── */
interface ProposalDiff {
  addedMcps: string[];
  removedMcps: string[];
  addedSkills: string[];
  removedSkills: string[];
  promptChanged: boolean;
  promptNote?: string;
}
interface Proposal {
  diff: ProposalDiff;
  // 仅保存变更后的关键字段，采纳时合并到 agentConfig
  nextSkills: string[];
  nextMcps: string[];
  nextPrompt: string;
  status: "pending" | "accepted" | "withdrawn";
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  type?: "question" | "confirm" | "api-call" | "text" | "assembly" | "tool-calls" | "clarify" | "assembly-summary" | "proposal" | "draft";
  attachments?: { type: "skill" | "mcp"; name: string }[];
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
  /** clarify 类型：分步澄清问题 + 选项 */
  clarifySteps?: { question: string; options?: string[]; placeholder?: string }[];
  clarifyAnswers?: string[];
  clarifyDone?: boolean;
  /** proposal 类型：AI 建议的配置变更 */
  proposal?: Proposal;
  /** draft 类型：初始草稿快照 */
  draft?: {
    model: string;
    skills: string[];
    mcps: string[];
    note: string;
  };
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
  envId: string;
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
  envId: "env-default",
  systemPrompt: "",
  tools: [{ name: "内置工具", id: "builtin_tools", permissions: 8, permissionPolicy: "Always allow" }],

  skills: [],
  mcpServers: [],
  subagents: [],
  fengsheng: { enabled: true, appKey: "", appSecret: "", robotCode: "", connected: false },
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
    envId: "env-default",
    systemPrompt,
    tools: [{ name: "内置工具", id: "builtin_tools", permissions: 8, permissionPolicy: "Always allow" }],
    skills: allSkills,
    mcpServers: allMCPs,
    subagents: demoSubagents,
    fengsheng: { enabled: true, appKey: "", appSecret: "", robotCode: "", connected: false },
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

/* ── Tool Call Strip —— 复用 RunTimelineView 的 EventRow 渲染 ── */
const TOOL_CAT: Record<ToolCall["kind"], CategoryKey> = {
  search: "search",
  mcp: "mcp",
  skill: "skill",
  subagent: "subagent",
};
const ToolCallStrip = ({ calls }: { calls: ToolCall[] }) => (
  <div className="flex flex-col">
    {calls.map((c) => {
      const sub: TimelineSubEvent = {
        id: c.id,
        category: TOOL_CAT[c.kind] ?? "context",
        title: c.summary ? `${c.name}（${c.summary}）` : c.name,
        status: c.status,
        raw: c.input || c.output ? { input: c.input, output: c.output } : undefined,
      };
      return <EventRow key={c.id} ev={sub} showRaw={false} />;
    })}
  </div>
);

/* ── 统一状态 chip ── */
const StatusChip = ({ tone = "muted", children }: { tone?: "muted" | "primary" | "success"; children: React.ReactNode }) => (
  <span className={cn(
    "px-1.5 py-0.5 text-[10px] rounded font-medium",
    tone === "muted" && "bg-muted text-muted-foreground",
    tone === "primary" && "bg-primary/10 text-primary",
    tone === "success" && "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  )}>{children}</span>
);

/* ── Draft Card ── */
const DraftCard = ({ draft }: { draft: NonNullable<Message["draft"]> }) => (
  <div className="bg-card border border-border rounded-lg p-3 space-y-2">
    <div className="flex items-center justify-between">
      <h3 className="text-xs font-semibold text-foreground">智能体草稿</h3>
      <StatusChip tone="primary">草稿</StatusChip>
    </div>

    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="text-[10px] text-muted-foreground shrink-0">模型</span>
      <span className="font-mono text-foreground truncate">{draft.model}</span>
    </div>

    <div className="flex items-start gap-1.5 text-[11px]">
      <span className="text-[10px] text-muted-foreground shrink-0 pt-0.5">
        技能 · {draft.skills.length}
      </span>
      <div className="flex flex-wrap gap-1 min-w-0">
        {draft.skills.length === 0 ? (
          <span className="text-muted-foreground italic">无</span>
        ) : draft.skills.map((s) => (
          <span key={s} className="px-1.5 py-0 bg-muted text-foreground text-[10px] rounded">
            {s}
          </span>
        ))}
      </div>
    </div>

    <div className="flex items-start gap-1.5 text-[11px]">
      <span className="text-[10px] text-muted-foreground shrink-0 pt-0.5">
        MCP · {draft.mcps.length}
      </span>
      <div className="flex flex-wrap gap-1 min-w-0">
        {draft.mcps.length === 0 ? (
          <span className="text-muted-foreground italic">无</span>
        ) : draft.mcps.map((m) => (
          <span key={m} className="px-1.5 py-0 bg-primary/5 text-primary text-[10px] rounded border border-primary/20">
            {m}
          </span>
        ))}
      </div>
    </div>

    {draft.note && (
      <p className="text-[11px] text-muted-foreground leading-snug pt-1.5 border-t border-border">
        {draft.note}
      </p>
    )}
  </div>
);

/* ── Clarify Card：分步问答 ── */
const ClarifyCard = ({
  msg,
  onSubmit,
}: {
  msg: Message;
  onSubmit: (answers: string[]) => void;
}) => {
  const steps = msg.clarifySteps ?? [];
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() =>
    msg.clarifyAnswers ?? Array(steps.length).fill(""),
  );

  // 已完成态：只读摘要
  if (msg.clarifyDone) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-foreground">需要确认</h3>
          <StatusChip tone="success">已确认</StatusChip>
        </div>
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-2 text-[11px]">
            <span className="text-muted-foreground shrink-0">{s.question}</span>
            <span className="text-foreground font-medium truncate">{msg.clarifyAnswers?.[i] || "—"}</span>
          </div>
        ))}
      </div>
    );
  }

  const current = steps[step];
  if (!current) return null;
  const value = answers[step] ?? "";
  const isLast = step === steps.length - 1;
  const canNext = value.trim().length > 0;

  const setValue = (v: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[step] = v;
      return next;
    });
  };

  const handleNext = () => {
    if (!canNext) return;
    if (isLast) {
      onSubmit(answers.map((a) => a.trim()));
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground">需要确认</h3>
        <span className="text-[10px] text-muted-foreground">{step + 1} / {steps.length}</span>
      </div>

      {/* 已答步骤摘要 */}
      {step > 0 && (
        <div className="space-y-1 pb-1.5 border-b border-border">
          {steps.slice(0, step).map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px]">
              <span className="text-muted-foreground shrink-0">{s.question}</span>
              <span className="text-foreground truncate">{answers[i]}</span>
              <button
                onClick={() => setStep(i)}
                className="ml-auto text-primary hover:underline shrink-0"
              >
                修改
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-foreground">{current.question}</p>

      {current.options && current.options.length > 0 && (
        <div className="flex flex-col gap-1">
          {current.options.map((opt) => {
            const selected = value === opt;
            return (
              <button
                key={opt}
                onClick={() => setValue(opt)}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 text-[11px] rounded-md border transition-colors",
                  selected
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-card hover:bg-muted hover:border-primary/40",
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-1.5 pt-0.5">
        <input
          type="text"
          value={current.options?.includes(value) ? "" : value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleNext(); } }}
          placeholder={current.placeholder ?? "或自行输入…"}
          className="flex-1 px-2 py-1 text-[11px] rounded-md border border-border bg-background focus:outline-none focus:border-primary"
        />
        <button
          onClick={handleNext}
          disabled={!canNext}
          className={cn(
            "px-2.5 py-1 text-[11px] rounded-md font-medium transition-colors shrink-0",
            canNext
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed",
          )}
        >
          {isLast ? "完成" : "下一个"}
        </button>
      </div>
    </div>
  );
};

/* ── Proposal Card ── */
const ProposalCardInline = ({
  msg,
  onAccept,
  onWithdraw,
}: {
  msg: Message;
  onAccept: () => void;
  onWithdraw: () => void;
}) => {
  const p = msg.proposal!;
  const { diff, status } = p;
  type Row = { kind: "add" | "remove" | "prompt"; label: string; text: string };
  const rows: Row[] = [
    ...diff.addedMcps.map<Row>((x) => ({ kind: "add", label: "MCP", text: x })),
    ...diff.removedMcps.map<Row>((x) => ({ kind: "remove", label: "MCP", text: x })),
    ...diff.addedSkills.map<Row>((x) => ({ kind: "add", label: "Skill", text: x })),
    ...diff.removedSkills.map<Row>((x) => ({ kind: "remove", label: "Skill", text: x })),
    ...(diff.promptChanged ? [{ kind: "prompt" as const, label: "提示词", text: diff.promptNote ? `${diff.promptNote.slice(0, 40)}${diff.promptNote.length > 40 ? "…" : ""}` : "更新系统提示词" }] : []),
  ];
  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground">建议变更</h3>
        {status === "accepted" && <StatusChip tone="success">已采纳</StatusChip>}
        {status === "withdrawn" && <StatusChip tone="muted">已撤销</StatusChip>}
        {status === "pending" && <StatusChip tone="primary">待确认</StatusChip>}
      </div>

      <div className="space-y-1">
        {rows.map((r, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded text-[11px] border",
              r.kind === "add" && "bg-green-50/60 border-green-200/70 text-green-700 dark:bg-green-950/20 dark:border-green-900/40 dark:text-green-400",
              r.kind === "remove" && "bg-red-50/60 border-red-200/70 text-red-600 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-400",
              r.kind === "prompt" && "bg-primary/5 border-primary/20 text-primary",
            )}
          >
            <span className="font-bold w-3 text-center shrink-0">
              {r.kind === "add" ? "+" : r.kind === "remove" ? "−" : "✎"}
            </span>
            <span className="opacity-70">
              {r.kind === "add" ? "新增" : r.kind === "remove" ? "移除" : "更新"} {r.label}:
            </span>
            <span className={cn("font-medium", r.kind === "remove" && "line-through")}>{r.text}</span>
          </div>
        ))}
      </div>

      {status === "pending" && (
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" className="h-7 text-[11px] flex-1" onClick={onAccept}>
            采纳变更
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[11px] px-3" onClick={onWithdraw}>
            撤销
          </Button>
        </div>
      )}
    </div>
  );
};




/* ── Structured Config View ── */
interface PromptSnapshot {
  skills: string[];
  mcpServers: string[];
  subagents: string[];
}
const arrEqual = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");
const diffSnapshot = (cur: PromptSnapshot, snap: PromptSnapshot | null) => {
  if (!snap) return null;
  const diff = (a: string[], b: string[]) => ({
    added: a.filter((x) => !b.includes(x)),
    removed: b.filter((x) => !a.includes(x)),
  });
  const s = diff(cur.skills, snap.skills);
  const m = diff(cur.mcpServers, snap.mcpServers);
  const sa = diff(cur.subagents, snap.subagents);
  const total = s.added.length + s.removed.length + m.added.length + m.removed.length + sa.added.length + sa.removed.length;
  return total === 0 ? null : { skills: s, mcps: m, subagents: sa, total };
};

const StructuredConfigView = ({
  config,
  onConfigChange,
  promptSnapshot,
  onRegeneratePrompt,
  onAcknowledgePrompt,
  onSave,
  saveDisabled,
  saveDisabledReason,
  viewModeSwitcher,
}: {
  config: AgentConfig;
  onConfigChange: (c: AgentConfig) => void;
  promptSnapshot: PromptSnapshot | null;
  onRegeneratePrompt: () => Promise<void> | void;
  onAcknowledgePrompt: () => void;
  onSave: () => void;
  saveDisabled: boolean;
  saveDisabledReason?: string;
  viewModeSwitcher?: React.ReactNode;
}) => {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const cur: PromptSnapshot = { skills: config.skills, mcpServers: config.mcpServers, subagents: config.subagents };
  const diff = diffSnapshot(cur, promptSnapshot);

  const handleRegen = async () => {
    setRegenerating(true);
    try {
      await onRegeneratePrompt();
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Sticky 保存栏 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-3 py-2 flex items-center gap-2">
        {viewModeSwitcher}
        <div className="ml-auto flex items-center gap-2">
          {saveDisabled && saveDisabledReason && (
            <span className="text-[11px] text-muted-foreground hidden sm:inline">{saveDisabledReason}</span>
          )}
          <Button
            size="sm"
            className="h-7 text-[11px] gap-1.5 px-3"
            onClick={onSave}
            disabled={saveDisabled}
            title={saveDisabled ? saveDisabledReason : "保存配置"}
          >
            <Save className="w-3 h-3" />
            保存并测试
          </Button>
        </div>
      </div>

      {/* 通过 AI 对话更新能力时会同步重写系统提示词，无需横幅提醒 */}

      <div className="divide-y divide-border">
        {/* 名称在「保存」时弹出确认卡片中编辑，配置区不展示 */}


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

        {/* 系统提示词 */}
        <div className="px-5 py-4">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">系统提示词</label>
          <div className="bg-muted/30 rounded-lg p-3 border border-border">
            <textarea
              value={config.systemPrompt}
              onChange={(e) => {
                onConfigChange({ ...config, systemPrompt: e.target.value });
                onAcknowledgePrompt();
              }}
              className="w-full bg-transparent text-xs text-foreground font-mono leading-relaxed resize-none focus:outline-none min-h-[120px]"
              spellCheck={false}
            />
          </div>
        </div>


        {/* Built-in Tools — 紧凑单行 */}
        {config.tools.length > 0 && (
          <div className="px-5 py-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-muted-foreground shrink-0">内置工具</label>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {config.tools.map((tool, i) => (
                  <Popover key={i}>
                    <PopoverTrigger asChild>
                      <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-muted transition-colors">
                        <Settings2 className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium">{tool.name}</span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{tool.permissions}</Badge>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 p-3" align="end">
                      <p className="text-[11px] font-medium mb-1.5">{tool.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mb-2">{tool.id}</p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2 pb-2 border-b border-border">
                        <span>权限策略</span>
                        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{tool.permissionPolicy}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground space-y-0.5">
                        <p>• web_search · file_read · file_write</p>
                        <p>• bash · code_exec · browser</p>
                        <p>• mcp_call · api_request</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                ))}
              </div>
            </div>
          </div>
        )}



        {/* MCPs */}
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
          {/* MCP Servers — 仿手动组装：chip + 凭据 popover */}
          {config.mcpServers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {config.mcpServers.map((mcpName, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card pl-2 pr-1 py-1 text-xs"
                >
                  <Server className="w-3 h-3 text-primary shrink-0" />
                  <span className="font-medium max-w-[140px] truncate">{mcpName}</span>
                  <button
                    onClick={() => onConfigChange({ ...config, mcpServers: config.mcpServers.filter((_, j) => j !== i) })}
                    className="text-muted-foreground hover:text-destructive p-0.5"
                    title="移除"
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
      tools: config.tools.map(t => {
        const policyType = t.permissionPolicy === "Always allow" ? "always_allow" : "user_controlled";
        return { type: t.id, configs: [], default_config: { enabled: true, permission_policy: { type: policyType } } };
      }),
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

  // 状态机：① 未添加（不在 MCP 管理列表）② 已添加。不预判凭据状态，凭据问题在调试报错时引导。
  const notAdded = config.mcpServers.filter((m) => mcpRequiresCredential(m) && !isMcpConfigured(m));
  const added = config.mcpServers.filter((m) => !notAdded.includes(m));
  const total = config.skills.length + config.mcpServers.length;
  const downscale = total > 8;

  return (
    <div className="space-y-2.5">
      {/* Downscale 提示条 */}
      {downscale && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800/60">
          <Wand2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
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
          {notAdded.length > 0 && (
            <Badge className="text-[10px] h-4 px-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">{notAdded.length} 未添加</Badge>
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
            {added.map((m) => (
              <li key={m} className="flex items-center gap-2 text-[11px] py-1">
                <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                <span className="text-foreground truncate">{m}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">已添加</span>
              </li>
            ))}
            {notAdded.map((m) => (
              <li key={m} className="flex items-center gap-2 text-[11px] py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-foreground truncate">{m}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">MCP 管理中未添加 · 保存时自动添加</span>
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
          <Save className="w-3.5 h-3.5" /> 保存并测试
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 flex-1" onClick={onDebug}>
          <Bug className="w-3.5 h-3.5" /> 立即测试
        </Button>
      </div>
      {notAdded.length > 0 && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-amber-500" />
          保存时将自动添加 {notAdded.length} 个 MCP 到 MCP 管理；如需凭据请前往 MCP 管理配置
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
  const [rightTab, setRightTab] = useState<"config" | "integration" | "debug">("config");
  const [debugSubTab, setDebugSubTab] = useState<"preview" | "logs">("preview");
  const [hasSaved, setHasSaved] = useState(false);
  const [savedConfigSnapshot, setSavedConfigSnapshot] = useState<string | null>(null);

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
  const [promptSnapshot, setPromptSnapshot] = useState<PromptSnapshot | null>(null);
  const [agentCreated, setAgentCreated] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [artifactsOpen, setArtifactsOpen] = useState(false);
  /** 会话内用户上传的文件（左右两侧 ChatComposer 共享，合并入「文件」面板与 @ 引用列表） */
  const [sessionArtifacts, setSessionArtifacts] = useState<Artifact[]>([]);
  const mergedArtifacts = useMemo(() => [...sessionArtifacts, ...mockArtifacts], [sessionArtifacts]);
  /** 用户是否已主动收起过「文件」面板：true 后不再自动弹开 */
  const artifactsAutoOpenedRef = useRef({ upload: false, output: false });
  const handleArtifactsOpenChange = useCallback((v: boolean) => {
    setArtifactsOpen(v);
    if (!v) {
      // 一旦用户关闭，则两个自动触发都视为已经"用过"，后续不再自动弹开
      artifactsAutoOpenedRef.current = { upload: true, output: true };
    }
  }, []);
  const ingestUploads = useCallback((payload: ChatComposerPayload) => {
    if (!payload.attachments?.length) return;
    const now = new Date().toISOString();
    const newOnes: Artifact[] = payload.attachments.map((a) => ({
      id: `up-${a.id}`,
      path: a.name,
      name: a.name,
      type: a.type ?? guessTypeFromName(a.name),
      mime: a.mime ?? "application/octet-stream",
      size: a.size,
      url: a.url ?? "#",
      createdAt: now,
      source: "user_upload",
    }));
    setSessionArtifacts((prev) => {
      // 首次上传 → 自动弹开"文件"侧栏，提示用户文件去了哪里
      if (prev.length === 0 && !artifactsAutoOpenedRef.current.upload) {
        artifactsAutoOpenedRef.current.upload = true;
        setArtifactsOpen(true);
      }
      return [...newOnes, ...prev];
    });
  }, []);
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
      content: "WELCOME_HERO",
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
        setPromptSnapshot({ skills: newConfig.skills, mcpServers: newConfig.mcpServers, subagents: newConfig.subagents });
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
          // Draft 卡片（替代原 markdown 流式文本）
          setMessages((prev) => [...prev, {
            id: uid(),
            role: "assistant",
            content: "",
            type: "draft",
            draft: {
              model: newConfig.model,
              skills: newConfig.skills,
              mcps: newConfig.mcpServers,
              note: "保存后将自动把未添加的 MCP 加入 MCP 管理；如需凭据请前往 MCP 管理配置。",
            },
          }]);
          setIsThinking(false);
          setThinkingStartedAt(null);

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
        // Subsequent messages: 澄清 or 建议变更（采纳/撤销）
        const trimmed = userMsg.trim();

        // ① 澄清：输入过短或仅是疑问词
        if (trimmed.length < 5 || /^(怎么|如何|什么|为什么|可以吗|可以么|\?|？)+$/.test(trimmed)) {
          const clarifyId = uid();
          setMessages((prev) => [...prev, {
            id: clarifyId,
            role: "assistant",
            content: "",
            type: "clarify",
            clarifySteps: [
              { question: "想修改哪一部分？", options: ["MCP", "Skill", "系统提示词"] },
              { question: "期望的操作？", options: ["新增", "替换", "删除"] },
              { question: "具体目标或要求？", placeholder: "例如：加一个网页搜索能力" },
            ],
          }]);
          setIsThinking(false);
          setThinkingStartedAt(null);
          return;
        }

        // ② 生成提案（不直接落到 agentConfig，等用户采纳）
        const lower = trimmed.toLowerCase();
        const allSkills = getActiveSkills().map((s) => s.name);
        const allMcps = getActiveMCPs().map((m) => m.name);
        const pickUnused = (pool: string[], used: string[]) => pool.find((x) => !used.includes(x));

        const diff: ProposalDiff = {
          addedMcps: [], removedMcps: [], addedSkills: [], removedSkills: [],
          promptChanged: false,
        };
        let nextSkills = [...agentConfig.skills];
        let nextMcps = [...agentConfig.mcpServers];
        let nextPrompt = agentConfig.systemPrompt;

        const isRemove = /删除|去掉|移除|去除/.test(trimmed);
        if (lower.includes("mcp")) {
          if (isRemove && nextMcps.length > 0) {
            const target = nextMcps[nextMcps.length - 1];
            nextMcps = nextMcps.filter((x) => x !== target);
            diff.removedMcps.push(target);
          } else {
            const target = pickUnused(allMcps, nextMcps);
            if (target) { nextMcps.push(target); diff.addedMcps.push(target); }
          }
        } else if (lower.includes("skill") || trimmed.includes("技能")) {
          if (isRemove && nextSkills.length > 0) {
            const target = nextSkills[nextSkills.length - 1];
            nextSkills = nextSkills.filter((x) => x !== target);
            diff.removedSkills.push(target);
          } else {
            const target = pickUnused(allSkills, nextSkills);
            if (target) { nextSkills.push(target); diff.addedSkills.push(target); }
          }
        } else {
          // 默认视为提示词调整
          diff.promptChanged = true;
          diff.promptNote = trimmed;
          nextPrompt = `${nextPrompt}\n\n// 用户补充要求：${trimmed}`;
        }

        const hasChange = diff.addedMcps.length || diff.removedMcps.length ||
                          diff.addedSkills.length || diff.removedSkills.length || diff.promptChanged;

        if (!hasChange) {
          setMessages((prev) => [...prev, {
            id: uid(), role: "assistant",
            content: "我没能从你的描述中提取出明确的变更项，可以再具体说明一下要修改什么吗？例如：「添加一个搜索 MCP」「去掉数据分析 Skill」「在提示词里强调要严谨」。",
          }]);
          setIsThinking(false);
          setThinkingStartedAt(null);
          return;
        }

        const proposal: Proposal = {
          diff, nextSkills, nextMcps, nextPrompt, status: "pending",
        };
        setMessages((prev) => [...prev, {
          id: uid(), role: "assistant",
          content: "我建议如下变更，确认后将更新右侧配置：",
          type: "proposal",
          proposal,
        }]);
        setIsThinking(false);
        setThinkingStartedAt(null);
      }
    }, streamDelay);
  };
  handleSendRef.current = handleSend;

  const handleAcceptProposal = (msgId: string) => {
    setMessages((prev) => prev.map((m) => {
      if (m.id !== msgId || !m.proposal || m.proposal.status !== "pending") return m;
      const p = m.proposal;
      setAgentConfig((c) => ({ ...c, skills: p.nextSkills, mcpServers: p.nextMcps, systemPrompt: p.nextPrompt }));
      setDebugEvents((d) => [...d, { id: uid(), type: "update", detail: "已采纳 AI 建议的变更", timestamp: new Date() }]);
      return { ...m, proposal: { ...p, status: "accepted" } };
    }));
  };
  const handleWithdrawProposal = (msgId: string) => {
    setMessages((prev) => prev.map((m) =>
      m.id === msgId && m.proposal && m.proposal.status === "pending"
        ? { ...m, proposal: { ...m.proposal, status: "withdrawn" } }
        : m
    ));
  };



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
    { key: "config" as const, label: "能力配置", icon: Settings2, sub: "MCP / Skill / 子智能体 / 系统提示词" },
    { key: "integration" as const, label: "对外接入", icon: MessageSquare, sub: "丰声 NEXT 机器人（可选）" },
    { key: "debug" as const, label: "调试", icon: Bug, sub: "对话视图 / 调试日志" },
  ];
  const promptDirty = !!diffSnapshot(
    { skills: agentConfig.skills, mcpServers: agentConfig.mcpServers, subagents: agentConfig.subagents },
    promptSnapshot,
  );
  const configSig = JSON.stringify(agentConfig);
  const configDirty = hasSaved && configSig !== savedConfigSnapshot;
  const debugLocked = !hasSaved || configDirty;
  const debugLockedReason = !hasSaved
    ? "请先保存配置后再调试"
    : configDirty
    ? "配置已修改，请重新保存后再调试"
    : undefined;
  const saveDisabledReason = promptDirty ? "请先同步系统提示词后再保存" : undefined;
  const openSaveDialog = () => {
    setSaveName((prev) => prev || agentConfig.name || "");
    setSaveDesc((prev) => prev || initialState.description || "");
    setPublishOpen(true);
  };


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
                  <ToolCallStrip calls={msg.toolCalls} />
                ) : msg.type === "draft" && msg.draft ? (
                  <DraftCard draft={msg.draft} />
                ) : msg.type === "clarify" ? (
                  <ClarifyCard
                    msg={msg}
                    onSubmit={(answers) => {
                      // 标记此 clarify 卡为已完成
                      setMessages((prev) => prev.map((m) =>
                        m.id === msg.id ? { ...m, clarifyAnswers: answers, clarifyDone: true } : m
                      ));
                      // 拼接答案为一条用户消息发给模型
                      const steps = msg.clarifySteps ?? [];
                      const combined = steps
                        .map((s, i) => `${s.question.replace(/[？?]$/, "")}：${answers[i] || "—"}`)
                        .join("；");
                      setInput(combined);
                      setTimeout(() => handleSendRef.current?.(), 0);
                    }}
                  />
                ) : msg.type === "proposal" && msg.proposal ? (
                  <ProposalCardInline
                    msg={msg}
                    onAccept={() => handleAcceptProposal(msg.id)}
                    onWithdraw={() => handleWithdrawProposal(msg.id)}
                  />
                ) : msg.type === "assembly" ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                    {msg.content}
                  </div>
                ) : msg.role === "system" ? (
                  <div>
                    {msg.content === "WELCOME_HERO" ? null : msg.content.includes("\n") ? (
                      <div className="bg-muted/30 border border-border/60 rounded-lg p-3.5 space-y-1">
                        <p className="text-xs font-semibold text-foreground">{msg.content.split("\n")[0]}</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{msg.content.split("\n").slice(1).join("\n")}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">{msg.content}</p>
                    )}
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
          <div className="border-t border-border p-2 space-y-2">
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
            <ChatComposer
              value={input}
              onChange={setInput}
              onSend={(payload) => {
                ingestUploads(payload);
                handleSend();
              }}
              placeholder={agentCreated ? "继续修改或完善智能体…" : "描述你想创建的智能体…"}
              disabled={isThinking}
              compact
              onOpenFiles={() => setArtifactsOpen(true)}
              mentionableFiles={mergedArtifacts}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* ── Right: Workspace ── */}
        <ResizablePanel defaultSize={62} minSize={30} className="flex flex-col min-w-0">
          {/* Header — 数字圆圈 + 箭头 stepper 风格 */}
          <div className="border-b border-border px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center flex-1 min-w-0">
              {rightTabs.map((tab, i) => {
                const Icon = tab.icon;
                const active = rightTab === tab.key;
                const disabled = tab.key === "debug" && debugLocked;
                const sub = tab.sub;
                const dotCls = disabled
                  ? "bg-muted text-muted-foreground border-border"
                  : active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border";
                return (
                  <div key={tab.key} className="flex items-center min-w-0">
                    <button
                      type="button"
                      onClick={() => !disabled && setRightTab(tab.key)}
                      disabled={disabled}
                      title={disabled ? debugLockedReason : undefined}
                      className="flex items-center gap-2 group min-w-0 shrink-0 disabled:cursor-not-allowed"
                    >
                      <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] shrink-0 ${dotCls} ${active ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}>
                        {i + 1}
                      </span>
                      <div className="text-left min-w-0">
                        <div className={`text-[11px] leading-tight truncate flex items-center gap-1 ${active ? "text-primary font-semibold" : disabled ? "text-muted-foreground" : "text-foreground"}`}>
                          <Icon className="w-3 h-3" />
                          {`${i + 1}. ${tab.label}`}
                        </div>
                        <div className="text-[10px] text-muted-foreground leading-tight truncate">{sub}</div>
                      </div>
                    </button>
                    {i < rightTabs.length - 1 && (
                      <div className="mx-3 flex items-center gap-2 min-w-[40px]">
                        <div className="h-px flex-1 bg-border" />
                        <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] gap-1.5 px-2.5 relative"
                onClick={() => setArtifactsOpen(true)}
                title="查看会话内文件（传入 / 产物）"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                文件
                {mergedArtifacts.length > 0 && (
                  <span className="ml-0.5 text-[10px] text-muted-foreground">{mergedArtifacts.length}</span>
                )}
              </Button>
              {rightTab === "debug" && hasSaved && (
                <Button
                  size="sm"
                  className="h-7 text-[11px] gap-1.5 px-3"
                  onClick={() => setPublishDialogOpen(true)}
                >
                  <Rocket className="w-3 h-3" />
                  发布
                </Button>
              )}
            </div>
          </div>

          {/* 测试子视图切换器（左对齐，紧贴 stepper 下方） */}
          {rightTab === "debug" && (
            <div className="border-b border-border px-3 py-2 flex items-center gap-2">
              <div className="inline-flex items-center bg-muted rounded-md p-0.5">
                <button
                  onClick={() => setDebugSubTab("preview")}
                  className={`px-2.5 py-1 text-[11px] rounded transition-colors flex items-center gap-1 ${
                    debugSubTab === "preview"
                      ? "bg-background text-foreground shadow-sm font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                  对话视图
                </button>
                <button
                  onClick={() => setDebugSubTab("logs")}
                  className={`px-2.5 py-1 text-[11px] rounded transition-colors flex items-center gap-1 ${
                    debugSubTab === "logs"
                      ? "bg-background text-foreground shadow-sm font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Terminal className="w-3 h-3" />
                  调试视图
                </button>
              </div>
            </div>
          )}




          {/* Content */}
          {rightTab === "config" ? (
            configViewMode === "structured" ? (
              <StructuredConfigView
                config={agentConfig}
                onConfigChange={setAgentConfig}
                promptSnapshot={promptSnapshot}
                onAcknowledgePrompt={() => setPromptSnapshot({ skills: agentConfig.skills, mcpServers: agentConfig.mcpServers, subagents: agentConfig.subagents })}
                onSave={openSaveDialog}
                saveDisabled={promptDirty}
                saveDisabledReason={saveDisabledReason}
                viewModeSwitcher={
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
                        (configViewMode as string) === "raw" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="代码视图"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                    </button>

                  </div>
                }
                onRegeneratePrompt={async () => {
                  await new Promise((r) => setTimeout(r, 900));
                  const allSkills = agentConfig.skills;
                  const allMCPs = agentConfig.mcpServers;
                  const allSubs = agentConfig.subagents;
                  const newPrompt = `你是一个专业的AI助手。\n\n## 核心能力\n${agentConfig.name || "根据用户描述提供帮助"}\n\n## 工具使用\n${allSkills.length > 0 ? `你可以使用以下技能：${allSkills.join("、")}` : "暂无外部技能"}\n${allMCPs.length > 0 ? `你可以连接以下服务：${allMCPs.join("、")}` : ""}\n${allSubs.length > 0 ? `你可以调用以下子智能体：${allSubs.join("、")}` : ""}\n\n## 行为准则\n- 始终准确、有帮助地回答问题\n- 在需要时主动使用可用工具与子智能体\n- 输出结构化、易读的结果`;
                  setAgentConfig({ ...agentConfig, systemPrompt: newPrompt });
                  setPromptSnapshot({ skills: allSkills, mcpServers: allMCPs, subagents: allSubs });
                  toast({ title: "系统提示词已更新", description: "已根据最新的 MCP / Skill / 子智能体重新生成。" });
                }}
              />
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="border-b border-border px-3 py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 bg-muted/50 rounded p-0.5">
                    <button
                      onClick={() => setConfigViewMode("structured")}
                      className={`p-1 rounded transition-colors ${
                        (configViewMode as string) === "structured" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
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
                  <Button size="sm" className="h-7 text-[11px] gap-1.5 px-3" onClick={openSaveDialog} disabled={promptDirty} title={saveDisabledReason}>
                    <Save className="w-3 h-3" /> 保存并测试
                  </Button>
                </div>
                <RawConfigView config={agentConfig} />
              </div>
            )
          ) : rightTab === "integration" ? (
            <div className="flex-1 overflow-auto p-5">
              <div className="max-w-2xl mx-auto">
                <div className="mb-2">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    对外接入 · 丰声 NEXT
                    <span className="text-[10px] rounded border border-border px-1 text-muted-foreground/80">可选</span>
                  </label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">把智能体接入丰声 NEXT， @ 机器人即可触发；不需要可点击下方「跳过，直接调试」。</p>
                </div>
                {agentConfig.fengsheng.enabled && (
                  <div className="mt-3 space-y-2.5 border border-border rounded-md p-4 bg-muted/20">
                    <div>
                      <label className="text-[11px] text-muted-foreground">Client ID（AppKey）</label>
                      <input
                        className="mt-1 h-8 w-full text-xs font-mono rounded-md border border-input bg-background px-3"
                        placeholder="企业应用 AppKey"
                        value={agentConfig.fengsheng.appKey}
                        onChange={(e) => setAgentConfig({ ...agentConfig, fengsheng: { ...agentConfig.fengsheng, appKey: e.target.value, connected: false } })}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground">Client Secret（AppSecret）</label>
                      <input
                        type="password"
                        className="mt-1 h-8 w-full text-xs font-mono rounded-md border border-input bg-background px-3"
                        placeholder="企业应用 AppSecret"
                        value={agentConfig.fengsheng.appSecret}
                        onChange={(e) => setAgentConfig({ ...agentConfig, fengsheng: { ...agentConfig.fengsheng, appSecret: e.target.value, connected: false } })}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground">Robot Code</label>
                      <input
                        className="mt-1 h-8 w-full text-xs font-mono rounded-md border border-input bg-background px-3"
                        placeholder="机器人编码"
                        value={agentConfig.fengsheng.robotCode}
                        onChange={(e) => setAgentConfig({ ...agentConfig, fengsheng: { ...agentConfig.fengsheng, robotCode: e.target.value, connected: false } })}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className={`text-[10px] inline-flex items-center gap-1 ${agentConfig.fengsheng.connected ? "text-emerald-600" : "text-muted-foreground"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${agentConfig.fengsheng.connected ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
                        {agentConfig.fengsheng.connected ? "已连接" : "未连接"}
                      </span>
                      <button
                        type="button"
                        disabled={!agentConfig.fengsheng.appKey.trim() || !agentConfig.fengsheng.appSecret.trim() || !agentConfig.fengsheng.robotCode.trim() || agentConfig.fengsheng.connected}
                        onClick={() => {
                          setAgentConfig({ ...agentConfig, fengsheng: { ...agentConfig.fengsheng, connected: true } });
                          toast({ title: "丰声 NEXT 机器人已连接", description: `Robot ${agentConfig.fengsheng.robotCode}` });
                        }}
                        className="h-7 px-3 text-[11px] rounded-md bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                      >
                        <Link2 className="w-3 h-3" />{agentConfig.fengsheng.connected ? "已连接" : "连接"}
                      </button>
                    </div>
                  </div>
                )}

                {/* 步骤操作：跳过 or 下一步 */}
                <div className="mt-5 flex items-center justify-between gap-2 pt-4 border-t border-border">
                  <p className="text-[11px] text-muted-foreground">
                    {agentConfig.fengsheng.enabled
                      ? agentConfig.fengsheng.connected
                        ? "已连接丰声 NEXT，可进入调试"
                        : "填写凭证并点击「连接」，或直接跳过"
                      : "已关闭对外接入，可直接进入调试"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => {
                        setAgentConfig({
                          ...agentConfig,
                          fengsheng: { ...agentConfig.fengsheng, enabled: false },
                        });
                        setRightTab("debug");
                        setDebugSubTab("preview");
                      }}
                    >
                      跳过，直接调试
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      disabled={agentConfig.fengsheng.enabled && !agentConfig.fengsheng.connected}
                      onClick={() => {
                        setRightTab("debug");
                        setDebugSubTab("preview");
                      }}
                    >
                      <Bug className="w-3 h-3" />
                      下一步：调试
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : debugSubTab === "preview" ? (
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
              <div className="border-t border-border p-2">
                <ChatComposer
                  value={previewInput}
                  onChange={setPreviewInput}
                  onSend={(payload) => {
                    ingestUploads(payload);
                    setPreviewInput(payload.text);
                    handlePreviewSend();
                  }}
                  placeholder="向智能体发送消息来测试…"
                  disabled={isAgentRunning || debugLocked}
                  compact
                  onOpenFiles={() => setArtifactsOpen(true)}
                  mentionableFiles={mergedArtifacts}
                />
              </div>
            </div>
          ) : (
            /* Logs view */
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
              保存并测试
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              确认基础信息后保存为新版本（{agentConfig.version}），并立即进入测试。如需发布，请在测试页右上角的「发布」按钮中操作。
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
                const saved = { ...agentConfig, name: saveName.trim() };
                setAgentConfig(saved);
                setAgentCreated(true);
                setHasSaved(true);
                setSavedConfigSnapshot(JSON.stringify(saved));
                setPublishOpen(false);
                // 默认进入"对外接入"步骤，让用户先配置丰声 NEXT；不需要可手动跳过
                setRightTab("integration");

                toast({
                  title: "已保存，请配置对外接入",
                  description: `${saveName.trim()} · ${saveCategory}`,
                });
              }}
            >
              <MessageSquare className="w-3 h-3" /> 保存并接入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 发布对话框（与其他入口一致） */}
      <PublishAgentDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        agentName={saveName || agentConfig.name || ""}
        agentDescription={saveDesc}
        agentCategory={saveCategory}
        agentAllowCopy={saveAllowCopy}
      />

      <ArtifactsDrawer open={artifactsOpen} onOpenChange={handleArtifactsOpenChange} title="文件" artifacts={mergedArtifacts} />
    </div>
  );
};

export default CreateAgentPage;
