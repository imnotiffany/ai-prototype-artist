import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Rocket, Plus, X, Settings2, Cpu, Server, Zap, Shield, KeyRound, Bot, MessageSquare, Eye, EyeOff, Link2, CheckCircle2, Wand, Loader2, ExternalLink, Play, Send, AlertCircle, Bug, FolderKanban, Store, ArrowRight, Mic, MicOff, HelpCircle, FileEdit, Terminal, ChevronDown, ChevronUp, Copy, Brain, Wrench, Info, AlertTriangle, Trash2, RefreshCw, Code2, FileCode, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { categories, getActiveSkills, getActiveMCPs, mockAgents, mockCredentials, mockApiKeys } from "@/data/mockData";
import { projectImages, DU_OPTIONS } from "@/data/environments";
import { HardDrive } from "lucide-react";
import { isMcpConfigured, subscribeMcpStore } from "@/data/mcpCredentialStore";
import { CapabilityPickerDialog } from "@/components/CapabilityPickerDialog";
import { AIStatusPill } from "@/components/AIStatusPill";
import { RunDualView, RunningIndicator, type TranscriptEvent } from "@/components/RunViews";
import { PublishAgentDialog } from "@/components/PublishAgentDialog";
import { AvatarPicker } from "@/components/AvatarPicker";
import { FengshengIncompleteDialog, type FsAlertStatus } from "@/components/FengshengIncompleteDialog";
import { FengshengHowToCard } from "@/components/FengshengHowToCard";
import { ChatComposer } from "@/components/ChatComposer";
import { mockArtifacts } from "@/data/artifacts";

// 基于 Anthropic 对 Claude 的 prompting 最佳实践，提供一份"脚手架"模板，
// 帮助用户按结构补全自己的提示词，而不是套用某个具体行业的成品。
const promptScaffold = `# 角色与目标
你是 <在这里写明角色，例如：资深的 XX 专家>，主要服务对象是 <用户画像>。
你的核心目标是 <用一句话写清交付什么结果，例如：在 5 分钟内输出可执行的 XX 报告>。

# 背景与上下文
- 业务场景：<这个 Agent 会被在什么场景下调用>
- 关键术语：<列出 3~5 个领域内必须正确使用的术语及其含义>
- 已知约束：<时间、数据范围、合规要求等>

# 你拥有的能力
- MCP / Skill 列表会在运行时由系统注入，请优先使用工具而非凭记忆作答。
- 调用工具前，先用一句话说明"为什么调用、期望得到什么"。
- 工具失败或返回为空时，主动说明并尝试备选方案，不要伪造数据。

# 思考方式（重要）
在回答复杂问题前，请先在 <thinking> 标签内完成以下步骤，再给出最终答复：
1. 拆解用户意图，识别隐含前提
2. 列出可选方案并比较权衡
3. 选择方案并规划工具调用顺序

# 输出规范
- 使用 Markdown 组织结构，关键信息加粗
- 引用工具返回的数据时，注明来源（MCP / Skill 名称）
- 数字、日期、专有名词与原始数据保持一致
- 默认使用与用户相同的语言

# 边界与拒答
- 涉及 <敏感操作 / 写库 / 外发> 时，必须先与用户二次确认
- 不在回复中暴露密钥、Token、内部链接
- 超出能力范围时，明确告知并推荐替代方案

# 示例（可选但强烈推荐）
<example>
用户：<典型问题>
助手：<期望的回答样式，包含工具调用与最终输出>
</example>`;


const skills = getActiveSkills();
const mcps = getActiveMCPs();
const subagents = mockAgents
  .filter((a) => a.kind === "agent" && (a.publishScope === "marketplace" || a.status === "project"))
  .map((a) => ({
    name: a.name,
    description: a.description,
    skills: a.skills,
    mcpServers: a.mcpServers,
    scope: (a.publishScope === "marketplace" ? "market" : "project") as "market" | "project",
  }));

const CreateAgentManualPage = () => {
  const navigate = useNavigate();

  // Basic (filled at publish time)
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [publishOpen, setPublishOpen] = useState(false);
  const [specOpen, setSpecOpen] = useState(false);
  const [specFormat, setSpecFormat] = useState<"yaml" | "json">("yaml");
  const [generatingMeta, setGeneratingMeta] = useState(false);
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

  // Model
  const [model, setModel] = useState("aliyun/qwen3.6-plus");
  const [apiKey, setApiKey] = useState("");
  // 环境配置
  const [envSpec, setEnvSpec] = useState<"1C2G" | "2C4G" | "4C8G">("4C8G");
  const [envImage, setEnvImage] = useState("img-default");
  const [envDuMode, setEnvDuMode] = useState<"new" | "existing">("new");
  const [envDu, setEnvDu] = useState("");
  const [envInstances, setEnvInstances] = useState(2);
  const [envRedisUrl, setEnvRedisUrl] = useState("");

  // Prompt
  const [systemPrompt, setSystemPrompt] = useState("");
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [promptAutoGenerated, setPromptAutoGenerated] = useState(false);

  // Bindings
  const [selSkills, setSelSkills] = useState<string[]>([]);
  const [selMCPs, setSelMCPs] = useState<string[]>([]);
  const [selSubagents, setSelSubagents] = useState<string[]>([]);
  const [selBuiltinTools, setSelBuiltinTools] = useState<string[]>(["Bash", "Read", "Write", "Edit"]);
  const [subagentGapOpen, setSubagentGapOpen] = useState(false);

  // Subscribe to MCP vault store so missing-credential badges live update
  const [, setVaultTick] = useState(0);
  useEffect(() => {
    const unsub = subscribeMcpStore(() => setVaultTick((t) => t + 1));
    return () => { unsub(); };
  }, []);

  const isMcpAvailableInVault = (name: string) => {
    const meta = mcps.find((m) => m.name === name);
    if (!meta) return false;
    if (!meta.requiresCredential) return true;
    return isMcpConfigured(name);
  };

  // Env
  const [persistentFs, setPersistentFs] = useState(true);
  const [mcpCredentialMap, setMcpCredentialMap] = useState<Record<string, string>>({});

  // FengSheng NEXT bot
  const [fsAppKey, setFsAppKey] = useState("");
  const [fsAppSecret, setFsAppSecret] = useState("");
  const [fsRobotCode, setFsRobotCode] = useState("");
  const [fsSecretVisible, setFsSecretVisible] = useState(false);
  type FsStatus = "empty" | "draft" | "connecting" | "connected" | "failed";
  const [fsStatus, setFsStatus] = useState<FsStatus>("empty");
  const [fsFailMsg, setFsFailMsg] = useState("");
  const fsConnected = fsStatus === "connected";
  const onFsFieldChange = (next: { appKey?: string; appSecret?: string; robotCode?: string }) => {
    const appKey = next.appKey ?? fsAppKey;
    const appSecret = next.appSecret ?? fsAppSecret;
    const robotCode = next.robotCode ?? fsRobotCode;
    setFsStatus(!appKey && !appSecret && !robotCode ? "empty" : "draft");
    setFsFailMsg("");
  };

  // Agent Hub publishing (optional) — 仅控制是否发布到 Hub 进行可视化监控
  const [hubEnabled, setHubEnabled] = useState(false);

  // Controlled tab (so we can jump users between steps)
  const [currentTab, setCurrentTab] = useState("basic");
  const [uploadedAvatar, setUploadedAvatar] = useState<string | null>(null);
  const [fsAlertOpen, setFsAlertOpen] = useState(false);
  const [fsAlertStatus, setFsAlertStatus] = useState<FsAlertStatus>("draft");

  // Debug — three streams: assistant chat (left), agent run (right), runtime logs (right bottom)
  type PromptSuggestion = { id: string; addition: string; summaryNote: string; status: "pending" | "adopted" | "rejected" };
  type ChatMsg = { role: "user" | "assistant"; content: string; suggestion?: PromptSuggestion };
  type RunMsg = { role: "user" | "assistant"; content: string; tool?: string; status?: "ok" | "error" };
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<ChatMsg[]>([]);
  const [assistantThinking, setAssistantThinking] = useState(false);
  const [debugInput, setDebugInput] = useState("");
  const [runMessages, setRunMessages] = useState<RunMsg[]>([]);
  const [debugRunning, setDebugRunning] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);

  // Mandatory debug gating
  const [debugPassed, setDebugPassed] = useState(false);
  const [debugAttempted, setDebugAttempted] = useState(false);
  const [debugLastError, setDebugLastError] = useState(false);


  // Track all changes auto-applied during debugging — surfaced at save time
  type DebugChange = { ts: string; summary: string; field: "prompt" | "binding" | "model" | "credential" };
  const [debugChanges, setDebugChanges] = useState<DebugChange[]>([]);
  const recordChange = (field: DebugChange["field"], summary: string) => {
    setDebugChanges((c) => [...c, { ts: new Date().toLocaleTimeString("zh-CN", { hour12: false }), field, summary }]);
  };

  // Runtime logs (Cloud Code style) — persistent panel, user can collapse
  type LogLevel = "info" | "tool" | "thought" | "warn" | "error" | "result";
  type LogEntry = { id: number; ts: string; level: LogLevel; message: string; meta?: string };
  const [debugLogs, setDebugLogs] = useState<LogEntry[]>([]);
  const logIdRef = (globalThis as any).__logIdRef ?? { current: 0 };
  (globalThis as any).__logIdRef = logIdRef;

  const pushLog = (level: LogLevel, message: string, meta?: string) => {
    const ts = new Date().toLocaleTimeString("zh-CN", { hour12: false }) + "." + String(Date.now() % 1000).padStart(3, "0");
    setDebugLogs((l) => [...l, { id: ++logIdRef.current, ts, level, message, meta }]);
  };

  // Publish flow (single-step save)

  // ── 保存门禁 ── 用于"未保存不能调试/接入"的硬约束
  const [hasSaved, setHasSaved] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);



  // After each run, AI proposes optimization (user must adopt to apply)
  const autoOptimizeAfterRun = (userInput: string) => {
    setTimeout(() => {
      const undocumented = [
        ...selMCPs.filter((m) => !systemPrompt.includes(m)),
        ...selSkills.filter((s) => !systemPrompt.includes(s)),
      ];
      if (undocumented.length > 0) {
        const target = undocumented[0];
        setAssistantMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: `我注意到你绑定了「${target}」，但系统提示词里没有说明它的用途。\n\n请用一句话告诉我：在什么场景下应该调用「${target}」？我会据此完善提示词。`,
          },
        ]);
        return;
      }
      if (systemPrompt.includes("# 来自调试的补充指引")) return;
      const addition = `\n\n# 来自调试的补充指引\n- 用户曾以「${userInput}」类问题进行测试，遇到该类问题时应优先：\n  1. 拆解任务目标，明确需要哪些 MCP / Skill\n  2. 引用工具返回的数据并标注来源\n  3. 输出结构化结果，避免冗余寒暄`;
      const suggestion: PromptSuggestion = {
        id: `s-${Date.now()}`,
        addition,
        summaryNote: `补充提示词：基于「${userInput}」类任务，新增"任务拆解 / 来源标注 / 结构化输出"工作流`,
        status: "pending",
      };
      setAssistantMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `根据本轮调试，我建议在系统提示词中补充「任务拆解 → 工具选择 → 来源标注 → 结构化输出」的工作流，以更好地匹配「${userInput}」类任务。`,
          suggestion,
        },
      ]);
    }, 900);
  };

  const updateSuggestionStatus = (id: string, status: "adopted" | "rejected") => {
    setAssistantMessages((msgs) =>
      msgs.map((m) => (m.suggestion?.id === id ? { ...m, suggestion: { ...m.suggestion, status } } : m))
    );
  };

  const adoptSuggestion = (s: PromptSuggestion) => {
    if (s.status !== "pending") return;
    setSystemPrompt((p) => p.trim() + s.addition);
    recordChange("prompt", s.summaryNote);
    updateSuggestionStatus(s.id, "adopted");
    toast({ title: "已采纳建议", description: "系统提示词已更新" });
  };

  const rejectSuggestion = (s: PromptSuggestion) => {
    if (s.status !== "pending") return;
    updateSuggestionStatus(s.id, "rejected");
  };

  const runDebug = (overrideInput?: string) => {
    const text = (overrideInput ?? debugInput).trim();
    if (!text) return;
    setRunMessages((m) => [...m, { role: "user", content: text }]);
    setDebugInput("");
    setDebugRunning(true);
    setDebugAttempted(true);
    setDebugLastError(false);

    const tool = selMCPs[0] || selSkills[0] || "内置推理";
    pushLog("info", `[session] 接收用户输入`, `text="${text}"`);
    pushLog("info", `[runtime] 启动容器 sandbox-${Math.random().toString(36).slice(2, 6)}`, `image=cloud-code:1.4.2 · workspace=/workspace`);
    pushLog("info", `[model] ${model} · stream=true · context=${4096 + text.length}`);

    setTimeout(() => pushLog("thought", `[reasoning] 解析用户意图：识别到任务类型，准备调用 ${tool}`), 120);
    setTimeout(() => pushLog("tool", `[tool_use] 调用 ${tool}`, `args={"query":"${text.slice(0, 40)}"} · timeout=30s`), 280);
    setTimeout(() => pushLog("info", `[mcp] ↔ ${tool} HTTP 200 · 142ms`), 460);
    setTimeout(() => pushLog("tool", `[tool_result] ${tool} 返回 1 条结果`, `bytes=312`), 520);
    setTimeout(() => pushLog("thought", `[reasoning] 整合工具返回，生成结构化回复`), 600);

    setTimeout(() => {
      setRunMessages((m) => [
        ...m,
        {
          role: "assistant",
          status: "ok",
          tool,
          content: `已通过 ${tool} 完成响应：根据你的输入「${text}」生成结果（模拟输出）。`,
        },
      ]);
      pushLog("result", `[done] 推理完成 · 用时 698ms · tokens in=312 out=128`);
      setDebugRunning(false);
      setDebugPassed(true);
      autoOptimizeAfterRun(text);
    }, 700);
  };

  const sendAssistantMessage = () => {
    const text = assistantInput.trim();
    if (!text) return;
    setAssistantMessages((m) => [...m, { role: "user", content: text }]);
    setAssistantInput("");
    setAssistantThinking(true);
    setTimeout(() => {
      // Heuristic: detect intents like "改提示词" / "绑定 X" / general clarification reply
      let reply = "";
      if (/提示词|prompt/i.test(text)) {
        const note = `\n\n# 用户调试反馈\n- ${text}`;
        setSystemPrompt((p) => p + note);
        recordChange("prompt", `根据你的反馈追加到提示词："${text.slice(0, 30)}${text.length > 30 ? "…" : ""}"`);
        reply = `好的，我已经把这条要求追加到系统提示词里了。可以在右侧继续发起一轮调试验证效果。`;
      } else if (/绑定|添加.*MCP|加上.*Skill/i.test(text)) {
        reply = `好的。请在「能力配置」里勾选具体的 MCP / Skill；如果你告诉我服务名称，我也可以直接帮你添加。`;
      } else {
        // Treat as clarification answer for purpose of an MCP/Skill
        const undocumented = [
          ...selMCPs.filter((m) => !systemPrompt.includes(m)),
          ...selSkills.filter((s) => !systemPrompt.includes(s)),
        ];
        if (undocumented[0]) {
          const target = undocumented[0];
          const addition = `\n\n# 能力说明\n- 「${target}」：${text}`;
          setSystemPrompt((p) => p + addition);
          recordChange("prompt", `补充「${target}」的用途说明：${text.slice(0, 40)}${text.length > 40 ? "…" : ""}`);
          reply = `已记录「${target}」的用途，并写入系统提示词。如果还有其他工具需要说明，告诉我即可。`;
        } else {
          reply = `收到。你可以让我"修改提示词"、"补充某个能力的用途"，或在右侧直接发起一轮调试。`;
        }
      }
      setAssistantMessages((m) => [...m, { role: "assistant", content: reply }]);
      setAssistantThinking(false);
    }, 1600);
  };

  const toggleVoice = () => {
    if (voiceRecording) {
      setVoiceRecording(false);
      // Mock transcription
      const mockText = "帮我查询昨天的快递订单状态";
      setDebugInput((prev) => (prev ? `${prev} ${mockText}` : mockText));
      toast({ title: "语音已转写", description: mockText });
    } else {
      setVoiceRecording(true);
      toast({ title: "开始语音输入", description: "再次点击结束录音" });
    }
  };

  const handleAutoGenerateMeta = () => {
    setGeneratingMeta(true);
    setTimeout(() => {
      const skillNames = selSkills.slice(0, 2).join("、");
      const mcpNames = selMCPs.slice(0, 2).join("、");
      const capSummary = [skillNames, mcpNames].filter(Boolean).join(" + ") || "通用对话";
      const guessedName = selMCPs[0]
        ? `${selMCPs[0]} 助手`
        : selSkills[0]
        ? `${selSkills[0]} 智能体`
        : "通用 AI 助手";
      const guessedDesc = `基于 ${capSummary} 的智能体，可根据用户输入自动调用对应能力完成任务。`;
      const guessedCategory =
        selMCPs.some((m) => /邮件|mail/i.test(m)) ? "办公协作" :
        selMCPs.some((m) => /数据|db|sql/i.test(m)) ? "数据分析" :
        selSkills.some((s) => /代码|code/i.test(s)) ? "研发提效" :
        categories[0];
      if (!name) setName(guessedName);
      if (!description) setDescription(guessedDesc);
      setCategory(guessedCategory);
      setGeneratingMeta(false);
      toast({ title: "已根据当前配置生成基础信息" });
    }, 600);
  };

  const toggle = (list: string[], setList: (v: string[]) => void, name: string) =>
    setList(list.includes(name) ? list.filter((x) => x !== name) : [...list, name]);



  const handleAutoGeneratePrompt = () => {
    setGeneratingPrompt(true);
    setTimeout(() => {
      const roleLine = name.trim() ? `你是「${name.trim()}」` : "你是一个专业的 AI 智能体";
      const descLine = description.trim() ? `，${description.trim()}。` : "，致力于高质量地完成用户交付的任务。";

      const skillLines = selSkills.length
        ? selSkills.map((s) => {
            const meta = skills.find((x) => x.name === s);
            return `- ${s}${meta ? `：${meta.description}` : ""}`;
          }).join("\n")
        : "- （未绑定 Skill）";

      const mcpLines = selMCPs.length
        ? selMCPs.map((s) => {
            const meta = mcps.find((x) => x.name === s);
            return `- ${s}${meta ? `：${meta.description}` : ""}`;
          }).join("\n")
        : "- （未绑定 MCP 服务）";

      const subLines = selSubagents.length
        ? selSubagents.map((s) => `- ${s}`).join("\n")
        : "";

      const generated = `# 角色
${roleLine}${descLine}

# 你拥有的能力
## MCP 服务（外部工具）
${mcpLines}

## Skills（原子能力）
${skillLines}
${subLines ? `\n## 可调度的子智能体\n${subLines}\n` : ""}
# 工作流程
1. 仔细理解用户意图，必要时主动澄清关键信息。
2. 根据任务类型，从上述能力中选择最合适的工具组合。
3. 调用工具前简要说明计划；调用后基于结果迭代下一步。
4. 对涉及外部数据写入或敏感操作的步骤，先与用户确认再执行。

# 输出规范
- 使用清晰的 Markdown 结构组织回答。
- 引用工具返回的数据时，注明来源（MCP / Skill 名称）。
- 遇到不确定或工具不可用时，如实告知，不要编造结果。

# 约束
- 严格遵守公司数据安全与合规要求。
- 不要在回复中暴露密钥、Token 或其他凭证。`;

      setSystemPrompt(generated);
      setGeneratingPrompt(false);
      toast({ title: "已根据当前能力生成系统提示词", description: `MCP ${selMCPs.length} · Skill ${selSkills.length} · 子智能体 ${selSubagents.length}` });
    }, 800);
    setPromptAutoGenerated(true);
  };

  // 进入「系统提示词」步骤时，若尚未生成过，自动用 AI 生成一版供用户修改
  useEffect(() => {
    if (currentTab === "prompt" && !promptAutoGenerated && !generatingPrompt && !systemPrompt.trim()) {
      handleAutoGeneratePrompt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab]);

  // ── Step validation ──────────────────────────────────────────────
  const basicComplete = !!name.trim();
  const promptComplete = systemPrompt.trim().length >= 20;
  const debugComplete = debugPassed && !debugLastError;
  const channelsValid = fsConnected || (!fsAppKey && !fsAppSecret && !fsRobotCode);

  // ── Dirty 检测：step 1-3 任一字段变了 → 重置 hasSaved/调试状态，重新上锁 4/5 ──
  const currentSig = JSON.stringify({
    name, avatar: uploadedAvatar, category, description,
    model, apiKey,
    envSpec, envImage, envDuMode, envDu, envInstances, envRedisUrl,
    systemPrompt,
    selSkills, selMCPs, selSubagents, mcpCredentialMap,
  });
  const configDirty = hasSaved && currentSig !== savedSnapshot;
  const savedAndClean = hasSaved && !configDirty;

  useEffect(() => {
    if (!hasSaved) return;
    if (currentSig === savedSnapshot) return;
    setHasSaved(false);
    setSavedSnapshot(null);
    setDebugPassed(false);
    setDebugAttempted(false);
    setDebugLastError(false);
    setDebugChanges([]);
    if (currentTab === "channels" || currentTab === "debug") {
      setCurrentTab("prompt");
      toast({ title: "配置已修改", description: "请回到「系统提示词」重新保存，再进入对外接入和调试", variant: "destructive" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSig]);

  const handleSaveAndContinue = () => {
    if (!basicComplete) { toast({ title: "请填写智能体名称", variant: "destructive" }); setCurrentTab("basic"); return; }
    if (!promptComplete) { toast({ title: "请完善系统提示词（不少于 20 字）", variant: "destructive" }); return; }
    setSavedSnapshot(currentSig);
    setHasSaved(true);
    toast({ title: "已保存", description: "现在可以配置对外接入或开始调试了" });
    setCurrentTab("channels");
  };

  const stepStatus = {
    basic: basicComplete ? "done" : "todo",
    capability: basicComplete ? "done" : "locked",
    prompt: basicComplete ? (promptComplete ? "done" : "todo") : "locked",
    channels: savedAndClean ? "todo" : "locked",
    debug: savedAndClean ? (debugComplete ? "done" : debugAttempted ? (debugLastError ? "warn" : "todo") : "todo") : "locked",
  } as const;

  const blockingReasons: { msg: string; jumpTo: string }[] = [];
  if (!basicComplete) blockingReasons.push({ msg: "请填写智能体名称", jumpTo: "basic" });
  if (!promptComplete) blockingReasons.push({ msg: "请完善系统提示词（不少于 20 字）", jumpTo: "prompt" });
  if (!hasSaved || configDirty) blockingReasons.push({ msg: configDirty ? "配置已修改，请回到「系统提示词」重新保存" : "请先在「系统提示词」点击保存", jumpTo: "prompt" });
  if (!channelsValid) blockingReasons.push({ msg: "已启用的对外接入尚未完成连接，请补齐或关闭", jumpTo: "channels" });
  if (!debugComplete) blockingReasons.push({ msg: debugLastError ? "上一次调试出现错误，请修复后重新调试" : "发布前必须在「调试」中完成至少一次成功运行", jumpTo: "debug" });
  const canSave = blockingReasons.length === 0;

  const fsBlocking: FsAlertStatus | null =
    fsStatus === "draft" ? "draft" : fsStatus === "connecting" ? "connecting" : fsStatus === "failed" ? "failed" : null;

  const focusFengshengCard = () => {
    setCurrentTab("channels");
    setTimeout(() => {
      const el = document.getElementById("fs-app-key");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLInputElement | null)?.focus();
    }, 100);
  };

  /** 拦截：丰声处于 draft/connecting/failed 时弹窗并返回 false */
  const guardFengsheng = (): boolean => {
    if (fsBlocking) {
      setFsAlertStatus(fsBlocking);
      setFsAlertOpen(true);
      return false;
    }
    return true;
  };

  const openPublish = () => {
    if (!guardFengsheng()) return;
    if (!canSave) {
      const first = blockingReasons[0];
      toast({ title: "无法保存", description: first.msg, variant: "destructive" });
      setCurrentTab(first.jumpTo);
      return;
    }
    handleAutoGenerateMeta();
    setPublishOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: "请填写智能体名称", variant: "destructive" });
      return;
    }
    if (!guardFengsheng()) return;
    toast({ title: "已保存到项目管理", description: `${name} · ${category}（如需发布，请前往项目管理或详情页发布）` });
    setPublishOpen(false);
    navigate("/project-agents");
  };



  // PickerDialog moved to shared component: CapabilityPickerDialog

  // Build spec for YAML / JSON viewer
  const specObject = {
    name: name || "未命名智能体",
    description: description || "",
    category,
    model: { id: model, speed: "standard" },
    system_prompt: systemPrompt,
    skills: selSkills,
    mcp_servers: selMCPs.map((m) => ({
      name: m,
      credential: mcpCredentialMap[m] || null,
    })),
    subagents: selSubagents,
    environment: {
      spec: envSpec,
      image: envImage,
      du: envDu,
      du_mode: envDuMode,
      instances: envInstances,
      storage: { type: "redis", url: envRedisUrl },
    },
    fengsheng_next: {
      enabled: fsConnected,
      app_key: fsAppKey || null,
      robot_code: fsRobotCode || null,
      persistent: persistentFs,
    },
  };
  const specJson = JSON.stringify(specObject, null, 2);
  const toYaml = (obj: unknown, indent = 0): string => {
    const pad = "  ".repeat(indent);
    if (obj === null || obj === undefined) return "null";
    if (typeof obj === "string") {
      if (obj.includes("\n")) return `|-\n${obj.split("\n").map((l) => pad + "  " + l).join("\n")}`;
      return /[:#&*!|>'"%@`]/.test(obj) ? JSON.stringify(obj) : obj;
    }
    if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
    if (Array.isArray(obj)) {
      if (obj.length === 0) return "[]";
      return "\n" + obj.map((item) => {
        if (typeof item === "object" && item !== null) {
          const inner = toYaml(item, indent + 1).trimStart();
          return `${pad}- ${inner}`;
        }
        return `${pad}- ${toYaml(item, indent + 1)}`;
      }).join("\n");
    }
    if (typeof obj === "object") {
      const entries = Object.entries(obj as Record<string, unknown>);
      if (entries.length === 0) return "{}";
      return entries.map(([k, v]) => {
        const val = toYaml(v, indent + 1);
        if (val.startsWith("\n")) return `${pad}${k}:${val}`;
        return `${pad}${k}: ${val}`;
      }).join("\n");
    }
    return String(obj);
  };
  const specYaml = toYaml(specObject).replace(/^\n/, "");
  const specContent = specFormat === "yaml" ? specYaml : specJson;

  const copySpec = async () => {
    await navigator.clipboard.writeText(specContent);
    toast({ title: "已复制到剪贴板" });
  };
  const downloadSpec = () => {
    const blob = new Blob([specContent], { type: specFormat === "yaml" ? "text/yaml" : "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(name || "agent").replace(/\s+/g, "-")}.${specFormat}`;
    a.click();
    URL.revokeObjectURL(url);
  };


  return (
    <div className="flex-1 overflow-auto animate-fade-in">
      {/* Header */}
      <div className="border-b border-border bg-card/40 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回
          </button>
          <div>
            <h1 className="text-sm font-semibold leading-tight">手动组装智能体</h1>
            <p className="text-[10px] text-muted-foreground">面向开发者的精确配置模式</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setSpecOpen(true)}>
            <FileCode className="w-3.5 h-3.5" />
            查看配置文档
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={openPublish}
            disabled={!canSave}
            title={canSave ? "发布智能体" : blockingReasons[0]?.msg}
          >
            <Rocket className="w-3.5 h-3.5" />
            发布
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-5">
        {/* 步骤指引 */}
        {(() => {
          const steps: { key: string; label: string; sub: string }[] = [
            { key: "basic", label: "1. 基础信息", sub: "名称 / 头像 / 分类" },
            { key: "capability", label: "2. 能力配置", sub: "选择模型 / MCP / Skill" },
            { key: "prompt", label: "3. 系统提示词", sub: "定义角色与工作方式" },
            { key: "channels", label: "4. 对外接入", sub: "丰声 NEXT（可选）" },
            { key: "debug", label: "5. 调试", sub: "可选，验证智能体运行效果" },
          ];
          return (
            <div className="mb-4 rounded-lg border border-border bg-card p-3">
              <div className="flex items-center w-full">
                {steps.map((s, i) => {
                  const status = (stepStatus as Record<string, string>)[s.key] ?? "todo";
                  const active = currentTab === s.key;
                  const dotCls =
                    status === "done" ? "bg-emerald-500 text-white border-emerald-500" :
                    status === "warn" ? "bg-amber-500 text-white border-amber-500" :
                    status === "locked" ? "bg-muted text-muted-foreground border-border" :
                    active ? "bg-primary text-primary-foreground border-primary" :
                    "bg-background text-foreground border-border";
                  const labelCls =
                    status === "locked" ? "text-muted-foreground" :
                    active ? "text-foreground font-medium" : "text-foreground";
                  const connectorCls =
                    status === "done" ? "bg-emerald-500/60" : "bg-border";
                  return (
                    <div key={s.key} className="flex items-center flex-1 last:flex-none min-w-0">
                      <button
                        type="button"
                        onClick={() => setCurrentTab(s.key)}
                        disabled={status === "locked"}
                        className="flex items-center gap-2 group min-w-0 shrink-0"
                      >
                        <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] shrink-0 ${dotCls} ${active ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}>
                          {status === "done" ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                           status === "warn" ? <AlertTriangle className="w-3.5 h-3.5" /> :
                           i + 1}
                        </span>
                        <div className="text-left min-w-0">
                          <div className={`text-[11px] leading-tight truncate ${active ? "text-primary font-semibold" : labelCls}`}>{s.label}</div>
                          <div className="text-[10px] text-muted-foreground leading-tight truncate">{s.sub}</div>
                        </div>
                      </button>
                      {i < steps.length - 1 && (
                        <div className="flex-1 mx-3 flex items-center gap-2 min-w-[24px]">
                          <div className={`h-px flex-1 ${connectorCls}`} />
                          <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                          <div className={`h-px flex-1 ${connectorCls}`} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <Tabs value={currentTab} onValueChange={setCurrentTab}>

          {/* Basic: 名称 / 头像 / 描述 / 分类 */}
          <TabsContent value="basic" className="mt-3 space-y-3">
            <div className="border border-border rounded-lg p-4 space-y-3 bg-card">
              <div>
                <h2 className="text-sm font-semibold">基础信息</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">定义智能体的名称、头像和分类，后续步骤将基于此生成配置</p>
              </div>

              <AvatarPicker
                uploadedAvatar={uploadedAvatar}
                onUploadedAvatarChange={setUploadedAvatar}
                seed={avatarSeed}
                onSeedChange={setAvatarSeed}
                noun="智能体"
              />

              <div>
                <Label className="text-xs">名称 <span className="text-destructive">*</span></Label>
                <Input
                  className="mt-1 h-8 text-xs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：财务月报助手"
                />
              </div>

              <div>
                <Label className="text-xs">描述</Label>
                <Textarea
                  className="mt-1 text-xs"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 100))}
                  placeholder="一句话描述智能体能力"
                />
              </div>


              <div>
                <Label className="text-xs">分类</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="选择分类" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                disabled={!basicComplete}
                onClick={() => setCurrentTab("capability")}
                title={basicComplete ? "下一步：能力配置" : "请填写智能体名称"}
              >
                下一步：能力配置 <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </TabsContent>

          {/* Capability: 基座模型 + MCP + Skill + Subagent */}
          <TabsContent value="capability" className="mt-4 space-y-4">
            {/* 模型配置 */}
            <div className="border border-border rounded-lg p-5 space-y-5 bg-card">
              <div>
                <Label className="text-xs">模型配置</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aliyun/qwen3.6-plus" className="text-xs">aliyun/qwen3.6-plus</SelectItem>
                    <SelectItem value="aliyun/deepseek-v4-pro" className="text-xs">aliyun/deepseek-v4-pro</SelectItem>
                    <SelectItem value="aliyun/deepseek-v4-flash" className="text-xs">aliyun/deepseek-v4-flash</SelectItem>
                    <SelectItem value="aiplat/GLM-5.1" className="text-xs">aiplat/GLM-5.1</SelectItem>
                  </SelectContent>
                </Select>

                {/* API Key */}
                <Label className="text-xs mt-3 block">API Key</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="mt-1.5 h-8 w-full justify-between text-xs font-normal px-3"
                    >
                      {apiKey
                        ? mockApiKeys.find((k) => k.id === apiKey)?.name ?? "选择 API Key"
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
                                setApiKey(k.id);
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

            </div>

            {/* 内置工具 */}
            <div className="border border-border rounded-lg p-5 bg-card">
              <div className="mb-3">
                <Label className="text-xs flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5 text-muted-foreground" />内置工具</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">智能体可直接调用的基础工具，运行在 Agent 沙箱环境中</p>
              </div>
              <TooltipProvider delayDuration={200}>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: "Bash", desc: "运行系统命令，如启动程序、安装组件", icon: Terminal },
                    { name: "Read", desc: "查看某个文件里的内容", icon: FileCode },
                    { name: "Write", desc: "创建新文件或覆盖已有文件", icon: FileEdit },
                    { name: "Edit", desc: "修改文件中的部分内容", icon: FileEdit },
                    { name: "Glob", desc: "按名称规则批量查找文件", icon: Search },
                    { name: "Grep", desc: "在文件里搜索指定文字", icon: Search },
                    { name: "WebFetch", desc: "读取指定网页的内容", icon: ExternalLink },
                    { name: "WebSearch", desc: "上网搜索相关资料", icon: Search },
                  ].map((t) => {
                    const sel = selBuiltinTools.includes(t.name);
                    const Icon = t.icon;
                    return (
                      <Tooltip key={t.name}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => toggle(selBuiltinTools, setSelBuiltinTools, t.name)}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 h-7 text-xs transition-colors cursor-pointer ${sel ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
                          >
                            <Icon className="w-3 h-3" />
                            <span className="font-medium">{t.name}</span>
                            {sel && <CheckCircle2 className="w-3 h-3" />}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px]">
                          <p className="text-xs">{t.desc}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>
            </div>

            {/* MCP 绑定 */}
            <div className="border border-border rounded-lg p-5 bg-card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-xs flex items-center gap-1.5"><Server className="w-3.5 h-3.5 text-muted-foreground" />MCP 绑定</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">连接外部系统；部分 MCP 需要绑定凭据后才能调用</p>
                </div>
                <CapabilityPickerDialog items={mcps} selected={selMCPs} onToggle={(n) => toggle(selMCPs, setSelMCPs, n)} icon={<Server className="w-3.5 h-3.5" />} label="MCP" marketLink="/" deployBadge={(n) => mcps.find((m) => m.name === n)?.deployment ?? "云端"} trigger={<Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0"><Plus className="w-3 h-3" />添加 MCP</Button>} />
              </div>
              {selMCPs.length === 0 ? null : (
                <div className="flex flex-wrap gap-2">
                  {selMCPs.map((mcpName) => {
                    const mcpMeta = mcps.find((m) => m.name === mcpName);
                    const needsCred = !!mcpMeta?.requiresCredential;
                    const creds = mockCredentials.filter((c) => c.mcpServer === mcpName);
                    const current = mcpCredentialMap[mcpName] ?? (creds.length === 1 ? creds[0].id : "");
                    const credMissing = needsCred && !current;
                    return (
                      <div key={mcpName} className={`inline-flex items-center gap-1.5 rounded-md border pl-2 pr-1 py-1 text-xs ${credMissing ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/20" : "border-border bg-card"}`}>
                        <Server className="w-3 h-3 text-primary shrink-0" />
                        <span className="font-medium max-w-[140px] truncate">{mcpName}</span>
                        {needsCred && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className={`inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded ${credMissing ? "text-amber-700 hover:bg-amber-100" : "text-emerald-700 hover:bg-emerald-100"}`} title="凭据">
                                {credMissing ? <AlertTriangle className="w-2.5 h-2.5" /> : <KeyRound className="w-2.5 h-2.5" />}
                                {credMissing ? "未绑定" : "已绑定"}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3" align="start">
                              <Label className="text-[11px] text-muted-foreground">选择凭据</Label>
                              {creds.length === 0 ? (
                                <div className="mt-2 space-y-2">
                                  <p className="text-[11px] text-amber-600">该 MCP 暂无可用凭据</p>
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 w-full" onClick={() => navigate("/vault")}>
                                    前往凭据管理 <ExternalLink className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Select value={current} onValueChange={(v) => setMcpCredentialMap({ ...mcpCredentialMap, [mcpName]: v })}>
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
                        )}
                        <button onClick={() => toggle(selMCPs, setSelMCPs, mcpName)} className="text-muted-foreground hover:text-destructive p-0.5" title="移除">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Skill 绑定 */}
            <div className="border border-border rounded-lg p-5 bg-card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-xs flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-muted-foreground" />Skill 绑定</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">预制能力包，让智能体掌握特定领域的工作流</p>
                </div>
                <CapabilityPickerDialog items={skills} selected={selSkills} onToggle={(n) => toggle(selSkills, setSelSkills, n)} icon={<Zap className="w-3.5 h-3.5" />} label="Skill" marketLink="/" trigger={<Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0"><Plus className="w-3 h-3" />添加 Skill</Button>} />
              </div>
              {selSkills.length === 0 ? null : (
                <div className="flex flex-wrap gap-2">
                  {selSkills.map((s) => {
                    const meta = skills.find((x) => x.name === s);
                    return (
                      <div key={s} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card pl-2 pr-1 py-1 text-xs" title={meta?.description}>
                        <Zap className="w-3 h-3 text-primary shrink-0" />
                        <span className="font-medium max-w-[160px] truncate">{s}</span>
                        {meta?.scope === "project" && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 border-border">项目</Badge>
                        )}
                        <button onClick={() => toggle(selSkills, setSelSkills, s)} className="text-muted-foreground hover:text-destructive p-0.5" title="移除">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 子智能体绑定 */}
            <div className="border border-border rounded-lg p-5 bg-card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-xs flex items-center gap-1.5"><Bot className="w-3.5 h-3.5 text-muted-foreground" />子智能体绑定</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">从智能体广场挑选已发布的智能体作为子智能体，主智能体可调度它们协同完成任务（可选）</p>
                </div>
                <CapabilityPickerDialog
                  items={subagents.map((a) => ({ name: a.name, description: a.description, scope: a.scope }))}
                  selected={selSubagents}
                  onToggle={(n) => toggle(selSubagents, setSelSubagents, n)}
                  icon={<Bot className="w-3.5 h-3.5" />}
                  label="子智能体"
                  marketLink="/"
                  trigger={<Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0"><Plus className="w-3 h-3" />添加子智能体</Button>}
                />
              </div>
              {(() => {
                const allMissing = new Set<string>();
                selSubagents.forEach((name) => {
                  const sub = subagents.find((a) => a.name === name);
                  sub?.mcpServers.forEach((m) => { if (!isMcpAvailableInVault(m)) allMissing.add(m); });
                });
                if (allMissing.size === 0) return null;
                return (
                  <div className="border border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 rounded-md px-3 py-2 mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="text-[11px] text-amber-800 dark:text-amber-300 truncate">
                        有 {allMissing.size} 个子智能体依赖的 MCP 尚未在 MCP 管理中配置凭据
                      </span>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0" onClick={() => setSubagentGapOpen(true)}>
                      查看并配置
                    </Button>
                  </div>
                );
              })()}
              {selSubagents.length === 0 ? null : (
                <div className="flex flex-wrap gap-2">
                  {selSubagents.map((name) => {
                    const sub = subagents.find((a) => a.name === name);
                    const missingMcps = sub ? sub.mcpServers.filter((m) => !isMcpAvailableInVault(m)) : [];
                    const hasMissing = missingMcps.length > 0;
                    return (
                      <div key={name} className={`inline-flex items-center gap-1.5 rounded-md border pl-2 pr-1 py-1 text-xs ${hasMissing ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/20" : "border-border bg-card"}`} title={sub?.description}>
                        <Bot className="w-3 h-3 text-primary shrink-0" />
                        <span className="font-medium max-w-[160px] truncate">{name}</span>
                        {sub?.scope === "project" && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 border-border">项目</Badge>
                        )}
                        {hasMissing && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700">
                            <AlertTriangle className="w-2.5 h-2.5" />{missingMcps.length} 个 MCP 缺凭据
                          </span>
                        )}
                        <button onClick={() => toggle(selSubagents, setSelSubagents, name)} className="text-muted-foreground hover:text-destructive p-0.5" title="移除">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 子智能体缺口配置 - 独立弹窗 */}
            <Dialog open={subagentGapOpen} onOpenChange={setSubagentGapOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-sm">补齐子智能体所需 MCP 凭据</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 max-h-[60vh] overflow-auto">
                  {(() => {
                    const map = new Map<string, string[]>();
                    selSubagents.forEach((name) => {
                      const sub = subagents.find((a) => a.name === name);
                      sub?.mcpServers.forEach((m) => {
                        if (!isMcpAvailableInVault(m)) map.set(m, [...(map.get(m) ?? []), name]);
                      });
                    });
                    if (map.size === 0) return <p className="text-xs text-muted-foreground py-4 text-center">所有依赖 MCP 已就绪</p>;
                    return Array.from(map.entries()).map(([mcp, owners]) => (
                      <div key={mcp} className="border border-border rounded-md p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Server className="w-3 h-3 text-primary shrink-0" />
                            <span className="text-xs font-medium truncate">{mcp}</span>
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-[10px] h-4">未配置</Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">被以下子智能体使用：{owners.join("、")}</p>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-[11px] shrink-0" onClick={() => { setSubagentGapOpen(false); navigate("/vault"); }}>
                          前往配置
                        </Button>
                      </div>
                    ));
                  })()}
                </div>
                <DialogFooter>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSubagentGapOpen(false)}>关闭</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* 环境配置 */}
            <div className="border border-border rounded-lg p-5 bg-card space-y-4">
              <div>
                <Label className="text-xs flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-muted-foreground" />环境配置</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">智能体运行时使用的资源、镜像与部署单元</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">资源规格</Label>
                  <Select value={envSpec} onValueChange={(v) => setEnvSpec(v as typeof envSpec)}>
                    <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1C2G" className="text-xs">1 核 2G</SelectItem>
                      <SelectItem value="2C4G" className="text-xs">2 核 4G</SelectItem>
                      <SelectItem value="4C8G" className="text-xs">4 核 8G</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">运行镜像</Label>
                  <Select value={envImage} onValueChange={setEnvImage}>
                    <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {projectImages.map((img) => (
                        <SelectItem key={img.id} value={img.id} className="text-xs">
                          <span className="font-mono">{img.name}</span>
                          {img.isDefault && <span className="ml-2 text-[10px] text-muted-foreground">默认</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">实例数量</Label>
                  <Select value={String(envInstances)} onValueChange={(v) => setEnvInstances(Number(v))}>
                    <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4].map((n) => (
                        <SelectItem key={n} value={String(n)} className="text-xs">{n} 个</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs flex items-center gap-1.5">
                  <Server className="w-3 h-3" />关联 DU <span className="text-destructive">*</span>
                </Label>
                <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1">线上生产服务需关联顺丰云 DU，便于出现问题时追溯定位</p>
                <div className="flex items-center gap-4 mt-1.5">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="radio" name="manual-du-mode" value="existing" checked={envDuMode === "existing"} onChange={() => { setEnvDuMode("existing"); setEnvDu(DU_OPTIONS[0]); }} className="accent-primary" />
                    选择已有
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="radio" name="manual-du-mode" value="new" checked={envDuMode === "new"} onChange={() => { setEnvDuMode("new"); setEnvDu(""); }} className="accent-primary" />
                    新建 DU
                  </label>
                </div>
                {envDuMode === "existing" ? (
                  <Select value={envDu} onValueChange={setEnvDu}>
                    <SelectTrigger className="mt-2 h-8 text-xs"><SelectValue placeholder="请选择" /></SelectTrigger>
                    <SelectContent>
                      {DU_OPTIONS.map((d) => (
                        <SelectItem key={d} value={d} className="text-xs font-mono">{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input className="mt-2 h-8 text-xs font-mono" placeholder="请输入新 DU 名称" value={envDu} onChange={(e) => setEnvDu(e.target.value)} />
                )}
              </div>

              <div>
                <Label className="text-xs flex items-center gap-1.5"><HardDrive className="w-3 h-3" />存储 <span className="text-destructive">*</span></Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">持久化存储，目前仅支持 Redis</p>
                <Input
                  className="mt-1.5 h-8 text-xs font-mono"
                  placeholder="redis://:password@host:6379/0"
                  value={envRedisUrl}
                  onChange={(e) => setEnvRedisUrl(e.target.value)}
                />
              </div>
            </div>



            <div className="flex justify-between">
              <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={() => setCurrentTab("basic")}>
                <ArrowLeft className="w-3 h-3" /> 上一步
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setCurrentTab("prompt")}
                title="下一步：系统提示词"
              >
                下一步：系统提示词 <ArrowRight className="w-3 h-3" />
              </Button>
            </div>

          </TabsContent>

          {/* Prompt */}
          <TabsContent value="prompt" className="mt-4">
            <div className="border border-border rounded-lg p-5 bg-card">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <Label className="text-xs">系统提示词</Label>
                  <p className="text-[10px] text-muted-foreground">定义智能体身份、行为约束和输出格式</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                  onClick={handleAutoGeneratePrompt}
                  disabled={generatingPrompt}
                >
                  {generatingPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand className="w-3 h-3" />}
                  AI 自动生成
                </Button>
              </div>
              <Textarea className="font-mono text-xs leading-relaxed" rows={18} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} />
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-muted-foreground">
                  {systemPrompt.length} 字符 · 将根据已绑定的 {selSkills.length} 个 Skill 与 {selMCPs.length} 个 MCP 生成
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1"
                  onClick={() => {
                    if (systemPrompt.trim() && !window.confirm("将用提示词脚手架覆盖当前内容，是否继续？")) return;
                    setSystemPrompt(promptScaffold);
                    toast({
                      title: "已导入提示词脚手架",
                      description: "按段落把 < > 占位符替换为你 Agent 的实际信息",
                    });
                  }}
                >
                  <FileEdit className="w-3 h-3" />
                  使用提示词脚手架
                </Button>
              </div>
            </div>
            <div className="flex justify-between mt-3">
              <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={() => setCurrentTab("capability")}>
                <ArrowLeft className="w-3 h-3" /> 上一步
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                disabled={!basicComplete || !promptComplete}
                onClick={() => { savedAndClean ? setCurrentTab("channels") : handleSaveAndContinue(); }}
                title={!promptComplete ? "请完善系统提示词（不少于 20 字）" : savedAndClean ? "配置未变更，进入下一步" : "保存配置并进入对外接入"}
              >
                {savedAndClean ? <><ArrowRight className="w-3 h-3" /> 下一步：对外接入</> : <><Save className="w-3 h-3" /> 保存并继续</>}
              </Button>
            </div>
          </TabsContent>

          {/* 对外接入：子智能体 + 丰声 NEXT + Agent Hub */}
          <TabsContent value="channels" className="mt-4 space-y-4">

            {/* 丰声 NEXT 群聊机器人 */}
            <div className="border border-border rounded-lg bg-card">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    丰声 NEXT 群聊机器人
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground">可选</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">把智能体接入丰声 NEXT， @ 机器人即可触发</p>
                </div>
                {(() => {
                  const cfg: Record<FsStatus, { dot: string; cls: string; label: string }> = {
                    empty: { dot: "bg-muted-foreground/50", cls: "text-muted-foreground", label: "未配置" },
                    draft: { dot: "bg-muted-foreground/50", cls: "text-muted-foreground", label: "未连接" },
                    connecting: { dot: "bg-primary animate-pulse", cls: "text-primary border-primary/40 bg-primary/10", label: "连接中…" },
                    connected: { dot: "bg-emerald-500", cls: "text-emerald-600 border-emerald-600/40 bg-emerald-500/10", label: "已连接" },
                    failed: { dot: "bg-destructive", cls: "text-destructive border-destructive/40 bg-destructive/10", label: "连接失败" },
                  };
                  const c = cfg[fsStatus];
                  return (
                    <Badge variant="outline" className={`text-[10px] gap-1 ${c.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                      {c.label}
                    </Badge>
                  );
                })()}
              </div>
              <div className="p-5 space-y-3">
                <FengshengHowToCard />
                <div>
                  <Label className="text-xs">Client ID（AppKey）</Label>
                  <Input id="fs-app-key" className="mt-1.5 h-8 text-xs font-mono" placeholder="企业应用 AppKey" value={fsAppKey} onChange={(e) => { setFsAppKey(e.target.value); onFsFieldChange({ appKey: e.target.value }); }} />
                </div>
                <div>
                  <Label className="text-xs">Client Secret（AppSecret）</Label>
                  <div className="relative mt-1.5">
                    <Input className="h-8 text-xs font-mono pr-9" type={fsSecretVisible ? "text" : "password"} placeholder="企业应用 AppSecret" value={fsAppSecret} onChange={(e) => { setFsAppSecret(e.target.value); onFsFieldChange({ appSecret: e.target.value }); }} />
                    <button type="button" onClick={() => setFsSecretVisible(!fsSecretVisible)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {fsSecretVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Robot Code</Label>
                  <Input className="mt-1.5 h-8 text-xs font-mono" placeholder="机器人编码" value={fsRobotCode} onChange={(e) => { setFsRobotCode(e.target.value); onFsFieldChange({ robotCode: e.target.value }); }} />
                </div>

                {fsStatus === "failed" && (
                  <div className="border border-destructive/40 bg-destructive/5 rounded px-2.5 py-2 text-[11px] text-destructive flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{fsFailMsg || "凭证校验未通过，请检查 Client ID / Client Secret / Robot Code 是否正确"}</span>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    variant={fsStatus === "connected" ? "outline" : "default"}
                    className="h-8 text-xs gap-1.5"
                    disabled={!fsAppKey.trim() || !fsAppSecret.trim() || !fsRobotCode.trim() || fsStatus === "connecting" || fsStatus === "connected"}
                    onClick={() => {
                      setFsStatus("connecting");
                      setFsFailMsg("");
                      setTimeout(() => {
                        const ok = !fsRobotCode.endsWith("_fail") && fsAppKey.length >= 4 && fsAppSecret.length >= 4 && fsRobotCode.length >= 4;
                        if (ok) {
                          setFsStatus("connected");
                          toast({ title: "丰声 NEXT 机器人已连接", description: `Robot ${fsRobotCode}` });
                        } else {
                          setFsStatus("failed");
                          setFsFailMsg("凭证校验未通过：请检查 Client ID / Client Secret / Robot Code 是否正确");
                          toast({ title: "连接失败", description: "凭证校验未通过，请检查后重试", variant: "destructive" });
                        }
                      }, 800);
                    }}
                  >
                    {fsStatus === "connecting" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : fsStatus === "connected" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                    {fsStatus === "connected" ? "已连接" : fsStatus === "connecting" ? "连接中…" : fsStatus === "failed" ? "重新连接" : "连接"}
                  </Button>
                </div>
              </div>
            </div>


            {/* Agent Hub 发布 */}
            <div className="border border-border rounded-lg bg-card">
              <div className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-primary" />
                    Agent Hub
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground">可选</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">开启后，智能体保存时将同步发布到 Agent Hub，提供运行状态、调用次数、错误率等可视化监控</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={hubEnabled}
                    onCheckedChange={(v) => {
                      setHubEnabled(v);
                      toast({ title: v ? "已开启 Agent Hub 同步" : "已关闭 Agent Hub 同步" });
                    }}
                  />
                  <Badge
                    variant="outline"
                    className={`text-[10px] gap-1 ${hubEnabled ? "text-emerald-600 border-emerald-600/40 bg-emerald-500/10" : "text-muted-foreground"}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${hubEnabled ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
                    {hubEnabled ? "已开启" : "未开启"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-3">
              <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={() => setCurrentTab("prompt")}>
                <ArrowLeft className="w-3 h-3" /> 上一步
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                disabled={!channelsValid}
                onClick={() => setCurrentTab("debug")}
                title={channelsValid ? "下一步：调试" : "已启用的接入项尚未完成连接"}
              >
                下一步：调试 <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </TabsContent>

          {/* Debug */}
          <TabsContent value="debug" className="mt-4 space-y-4">
            <div className="border border-border rounded-lg bg-card flex flex-col h-[clamp(380px,calc(100vh-260px),560px)]">
              <div className="px-3 h-10 shrink-0 border-b border-border flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-semibold shrink-0">智能体运行</span>
                {debugRunning && <RunningIndicator />}
              </div>
              <div className="flex-1 min-h-0">
                <RunDualView
                  showTranscriptSearch={false}
                  transcriptEvents={(() => {
                    const evs: TranscriptEvent[] = [];
                    runMessages.forEach((m, i) => {
                      if (m.role === "user") evs.push({ id: `u${i}`, type: "user", content: m.content });
                      else if (m.status === "error") evs.push({ id: `e${i}`, type: "error", message: m.content });
                      else {
                        if (m.tool) evs.push({
                          id: `t${i}`, type: "tools",
                          calls: [{ id: `c${i}`, kind: "mcp", name: m.tool, summary: "调用成功", status: "success" }],
                        });
                        evs.push({ id: `a${i}`, type: "agent", content: m.content });
                      }
                    });
                    return evs;
                  })()}
                  debugEvents={debugLogs.map((l) => ({
                    id: String(l.id),
                    ts: l.ts,
                    type: `log.${l.level}`,
                    data: { message: l.message, ...(l.meta ? { meta: l.meta } : {}) },
                  }))}
                  debugMeta={[
                    { label: "模型", value: model },
                    { label: "事件数", value: String(debugLogs.length) },
                  ]}
                />
              </div>
              <div className="border-t border-border p-2 shrink-0">
                <ChatComposer
                  value={debugInput}
                  onChange={setDebugInput}
                  onSend={() => runDebug()}
                  isStreaming={debugRunning}
                  placeholder="输入测试任务，回车发送（支持文件 / 图片 / 语音）"
                  compact
                  mentionableFiles={mockArtifacts}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <PublishAgentDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        agentName={name}
        agentDescription={description}
        agentCategory={category}
      />

      <FengshengIncompleteDialog
        open={fsAlertOpen}
        onOpenChange={setFsAlertOpen}
        status={fsAlertStatus}
        onReturn={focusFengshengCard}
      />


      {/* 配置文档查看 */}
      <Dialog open={specOpen} onOpenChange={setSpecOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-sm">智能体配置文档</DialogTitle>
            <DialogDescription className="text-xs">
              当前组装结果的结构化描述，可用于版本管理或外部导入
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex gap-1">
              {(["yaml", "json"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setSpecFormat(f)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    specFormat === f ? "bg-secondary text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={copySpec}>
                <Copy className="w-3 h-3" />复制
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={downloadSpec}>
                <ArrowRight className="w-3 h-3 rotate-90" />下载
              </Button>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-auto bg-muted/30 rounded border border-border">
            <div className="flex min-h-full">
              <div className="select-none text-right pr-3 pl-3 py-3 text-[10px] font-mono text-muted-foreground/50 leading-relaxed shrink-0">
                {specContent.split("\n").map((_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              <pre className="flex-1 py-3 pr-4 text-[11px] font-mono leading-relaxed text-foreground whitespace-pre-wrap break-all">
                {specContent}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateAgentManualPage;
