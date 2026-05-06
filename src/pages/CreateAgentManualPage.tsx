import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Rocket, Plus, X, Settings2, Cpu, Server, Zap, Shield, KeyRound, Bot, MessageSquare, Eye, EyeOff, Link2, CheckCircle2, Wand, Loader2, ExternalLink, Play, Send, AlertCircle, Bug, FolderKanban, Store, ArrowRight, Mic, MicOff, HelpCircle, FileEdit, Terminal, ChevronDown, ChevronUp, Copy, Brain, Wrench, Info, AlertTriangle, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { categories, getActiveSkills, getActiveMCPs, mockAgents, mockCredentials } from "@/data/mockData";
import { CapabilityPickerDialog } from "@/components/CapabilityPickerDialog";

const skills = getActiveSkills();
const mcps = getActiveMCPs();
const subagents = mockAgents.filter((a) => a.kind === "agent").slice(0, 8);

const CreateAgentManualPage = () => {
  const navigate = useNavigate();

  // Basic (filled at publish time)
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [publishOpen, setPublishOpen] = useState(false);
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
  const [model, setModel] = useState("claude-sonnet-4-6");

  // Prompt
  const [systemPrompt, setSystemPrompt] = useState("你是一个专业的 AI 助手，请根据用户需求提供准确、结构化的回答。");
  const [generatingPrompt, setGeneratingPrompt] = useState(false);

  // Bindings
  const [selSkills, setSelSkills] = useState<string[]>([]);
  const [selMCPs, setSelMCPs] = useState<string[]>([]);
  const [selSubagents, setSelSubagents] = useState<string[]>([]);

  // Env
  const [persistentFs, setPersistentFs] = useState(true);
  const [mcpCredentialMap, setMcpCredentialMap] = useState<Record<string, string>>({});

  // Network
  const [networkPolicy, setNetworkPolicy] = useState<"intranet" | "whitelist" | "open">("whitelist");
  const [whitelistInput, setWhitelistInput] = useState("");
  const [whitelist, setWhitelist] = useState<string[]>(["api.sf-express.com"]);

  // FengSheng NEXT bot
  const [fsAppKey, setFsAppKey] = useState("");
  const [fsAppSecret, setFsAppSecret] = useState("");
  const [fsRobotCode, setFsRobotCode] = useState("");
  const [fsSecretVisible, setFsSecretVisible] = useState(false);
  const [fsConnected, setFsConnected] = useState(false);

  // Debug — three streams: assistant chat (left), agent run (right), runtime logs (right bottom)
  type ChatMsg = { role: "user" | "assistant"; content: string };
  type RunMsg = { role: "user" | "assistant"; content: string; tool?: string; status?: "ok" | "error" };
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<ChatMsg[]>([]);
  const [assistantThinking, setAssistantThinking] = useState(false);
  const [debugInput, setDebugInput] = useState("");
  const [runMessages, setRunMessages] = useState<RunMsg[]>([]);
  const [debugRunning, setDebugRunning] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);

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
  const [runView, setRunView] = useState<"chat" | "logs">("chat");
  const [logFilter, setLogFilter] = useState<"all" | LogLevel>("all");
  const logIdRef = (globalThis as any).__logIdRef ?? { current: 0 };
  (globalThis as any).__logIdRef = logIdRef;

  const pushLog = (level: LogLevel, message: string, meta?: string) => {
    const ts = new Date().toLocaleTimeString("zh-CN", { hour12: false }) + "." + String(Date.now() % 1000).padStart(3, "0");
    setDebugLogs((l) => [...l, { id: ++logIdRef.current, ts, level, message, meta }]);
  };

  // Publish flow
  const [publishStage, setPublishStage] = useState<"project" | "marketplace" | "done">("project");
  const [publishingToMarket, setPublishingToMarket] = useState(false);

  // After each run, AI auto-optimizes (silently apply + announce in left chat)
  const autoOptimizeAfterRun = (userInput: string) => {
    setTimeout(() => {
      const undocumented = [
        ...selMCPs.filter((m) => !systemPrompt.includes(m)),
        ...selSkills.filter((s) => !systemPrompt.includes(s)),
      ];
      if (undocumented.length > 0) {
        // Need clarification — ask in left chat
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
      // Otherwise auto-apply optimization and tell user what was changed
      const addition = `\n\n# 来自调试的补充指引\n- 用户曾以「${userInput}」类问题进行测试，遇到该类问题时应优先：\n  1. 拆解任务目标，明确需要哪些 MCP / Skill\n  2. 引用工具返回的数据并标注来源\n  3. 输出结构化结果，避免冗余寒暄`;
      if (!systemPrompt.includes("# 来自调试的补充指引")) {
        setSystemPrompt((p) => p.trim() + addition);
        recordChange("prompt", `补充提示词：基于「${userInput}」类任务，新增"任务拆解 / 来源标注 / 结构化输出"工作流`);
        setAssistantMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: `我已根据本轮调试自动优化了系统提示词：\n\n· 补充了「任务拆解 → 工具选择 → 来源标注 → 结构化输出」的工作流\n· 加入了与「${userInput}」类任务的对齐指引\n\n你可以继续测试其他场景，或在保存时一次性确认所有调试期改动。`,
          },
        ]);
      }
    }, 900);
  };

  const runDebug = (overrideInput?: string) => {
    const text = (overrideInput ?? debugInput).trim();
    if (!text) return;
    setRunMessages((m) => [...m, { role: "user", content: text }]);
    setDebugInput("");
    setDebugRunning(true);

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
    }, 600);
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

  const addWhitelist = () => {
    const w = whitelistInput.trim();
    if (w && !whitelist.includes(w)) setWhitelist([...whitelist, w]);
    setWhitelistInput("");
  };

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
## Skills（原子能力）
${skillLines}

## MCP 服务（外部工具）
${mcpLines}
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
  };

  const handleSaveDraft = () => {
    toast({
      title: "草稿已保存",
      description: `${selMCPs.length} MCP / ${selSkills.length} Skill / ${selSubagents.length} 子智能体`,
    });
  };

  const openPublish = () => {
    handleAutoGenerateMeta();
    setPublishStage("project");
    setPublishOpen(true);
  };

  const handleSaveToProject = () => {
    if (!name.trim()) {
      toast({ title: "请填写智能体名称", variant: "destructive" });
      return;
    }
    toast({ title: "已保存到项目管理", description: `${name} · ${category}` });
    setPublishStage("marketplace");
  };

  const handlePublishToMarket = () => {
    setPublishingToMarket(true);
    setTimeout(() => {
      setPublishingToMarket(false);
      setPublishStage("done");
      toast({ title: "已发布到数字同事", description: name });
    }, 700);
  };

  const handleSkipMarket = () => {
    setPublishOpen(false);
    navigate("/project-agents");
  };

  // PickerDialog moved to shared component: CapabilityPickerDialog


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
            <h1 className="text-sm font-semibold">手动组装智能体</h1>
            <p className="text-[11px] text-muted-foreground">面向开发者的精确配置模式</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={openPublish}>
            <Save className="w-3.5 h-3.5" />
            保存
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-5">
        <Tabs defaultValue="capability">
          <TabsList className="grid grid-cols-4 h-9">
            <TabsTrigger value="capability" className="text-xs">能力配置</TabsTrigger>
            <TabsTrigger value="prompt" className="text-xs">系统提示词</TabsTrigger>
            <TabsTrigger value="fengsheng" className="text-xs gap-1.5">丰声 NEXT<span className="text-[9px] px-1 h-3.5 leading-[14px] rounded bg-muted text-muted-foreground font-normal">可选</span></TabsTrigger>
            <TabsTrigger value="debug" className="text-xs">调试</TabsTrigger>
          </TabsList>

          {/* Capability: 基座模型 + MCP + Skill + Subagent */}
          <TabsContent value="capability" className="mt-4 space-y-4">
            {/* 模型配置 */}
            <div className="border border-border rounded-lg p-5 space-y-5 bg-card">
              <div>
                <Label className="text-xs">模型配置</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-sonnet-4-6" className="text-xs">Claude Sonnet 4.6（推荐）</SelectItem>
                    <SelectItem value="claude-haiku-3-5" className="text-xs">Claude Haiku 3.5（快速）</SelectItem>
                    <SelectItem value="gpt-4o" className="text-xs">GPT-4o</SelectItem>
                    <SelectItem value="gemini-2.5-pro" className="text-xs">Gemini 2.5 Pro</SelectItem>
                    <SelectItem value="deepseek-v3" className="text-xs">DeepSeek V3</SelectItem>
                    <SelectItem value="qwen-max" className="text-xs">Qwen Max</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* MCP 绑定 */}
            <div className="border border-border rounded-lg p-5 bg-card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-xs">MCP 绑定</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">连接外部系统；部分 MCP 需要绑定凭据后才能调用</p>
                </div>
                <CapabilityPickerDialog items={mcps} selected={selMCPs} onToggle={(n) => toggle(selMCPs, setSelMCPs, n)} icon={<Server className="w-3.5 h-3.5" />} label="MCP" marketLink="/" deployBadge={(n) => mcps.find((m) => m.name === n)?.deployment ?? "云端"} trigger={<Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0"><Plus className="w-3 h-3" />添加 MCP</Button>} />
              </div>
              {selMCPs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">尚未绑定任何 MCP。点击右上角「添加 MCP」选择。</p>
              ) : (
                <div className="space-y-2">
                  {selMCPs.map((mcpName) => {
                    const mcpMeta = mcps.find((m) => m.name === mcpName);
                    const needsCred = !!mcpMeta?.requiresCredential;
                    const creds = mockCredentials.filter((c) => c.mcpServer === mcpName);
                    const current = mcpCredentialMap[mcpName] ?? (creds.length === 1 ? creds[0].id : "");
                    const credMissing = needsCred && !current;
                    return (
                      <div key={mcpName} className={`border rounded-md p-3 space-y-2 ${credMissing ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/20" : "border-border"}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium flex items-center gap-1.5">
                            <Server className="w-3 h-3 text-primary" />{mcpName}
                            {!needsCred && (
                              <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/30 text-[9px] h-4 px-1.5">免凭据</Badge>
                            )}
                            {credMissing && (
                              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-[9px] h-4 gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />未绑定凭据
                              </Badge>
                            )}
                          </span>
                          <button onClick={() => toggle(selMCPs, setSelMCPs, mcpName)} className="text-muted-foreground hover:text-destructive p-1" title="移除">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {needsCred && (
                          <div className="flex items-center gap-2">
                            <Label className="text-[11px] text-muted-foreground shrink-0">凭据</Label>
                            {creds.length === 0 ? (
                              <>
                                <span className="text-[11px] text-amber-600 dark:text-amber-500 flex-1">该 MCP 暂无可用凭据</span>
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => navigate("/vault")}>
                                  前往凭据管理 <ExternalLink className="w-3 h-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Select value={current} onValueChange={(v) => setMcpCredentialMap({ ...mcpCredentialMap, [mcpName]: v })}>
                                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="选择凭据" /></SelectTrigger>
                                  <SelectContent>
                                    {creds.map((c) => (
                                      <SelectItem key={c.id} value={c.id} className="text-xs">{c.name} <span className="text-muted-foreground ml-1">({c.type})</span></SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => navigate("/vault")}>凭据管理</Button>
                              </>
                            )}
                          </div>
                        )}
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
                  <Label className="text-xs">Skill 绑定</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">预制能力包，让智能体掌握特定领域的工作流</p>
                </div>
                <CapabilityPickerDialog items={skills} selected={selSkills} onToggle={(n) => toggle(selSkills, setSelSkills, n)} icon={<Zap className="w-3.5 h-3.5" />} label="Skill" marketLink="/" trigger={<Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0"><Plus className="w-3 h-3" />添加 Skill</Button>} />
              </div>
              {selSkills.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">尚未绑定任何 Skill。点击右上角「添加 Skill」选择。</p>
              ) : (
                <div className="space-y-1.5">
                  {selSkills.map((s) => (
                    <div key={s} className="flex items-center justify-between border border-border rounded px-3 py-1.5 text-xs">
                      <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-primary" />{s}</span>
                      <button onClick={() => toggle(selSkills, setSelSkills, s)} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
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
                <Button size="sm" variant="ghost" className="h-7 text-xs">从模板导入</Button>
              </div>
            </div>
          </TabsContent>

          {/* FengSheng NEXT Bot */}
          <TabsContent value="fengsheng" className="mt-4 space-y-4">
            <div className="border border-dashed border-amber-300 rounded-lg px-4 py-3 bg-amber-50/50 dark:bg-amber-950/20 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium">丰声 NEXT 群聊机器人接入</span>
                  <span className="text-[10px] px-1.5 h-4 leading-4 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">可选项</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  仅在需要把智能体发布为群聊机器人（成员 @ 即可触发）时配置。不需要的话可直接跳过此栏目，智能体仍可正常使用。
                </p>
              </div>
            </div>

            <div className="border border-border rounded-lg p-5 bg-card space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  应用凭证
                </h4>
                <Badge
                  variant="outline"
                  className={`text-[10px] gap-1 ${fsConnected ? "text-emerald-600 border-emerald-600/40 bg-emerald-500/10" : "text-muted-foreground"}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${fsConnected ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
                  {fsConnected ? "已连接" : "未连接"}
                </Badge>
              </div>

              <div>
                <Label className="text-xs">
                  Client ID（AppKey） <span className="text-destructive">*</span>
                </Label>
                <Input
                  className="mt-1.5 h-8 text-xs font-mono"
                  placeholder="企业应用 AppKey"
                  value={fsAppKey}
                  onChange={(e) => setFsAppKey(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">
                  Client Secret（AppSecret） <span className="text-destructive">*</span>
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    className="h-8 text-xs font-mono pr-9"
                    type={fsSecretVisible ? "text" : "password"}
                    placeholder="企业应用 AppSecret"
                    value={fsAppSecret}
                    onChange={(e) => setFsAppSecret(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setFsSecretVisible(!fsSecretVisible)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {fsSecretVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-xs">
                  Robot Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  className="mt-1.5 h-8 text-xs font-mono"
                  placeholder="机器人编码"
                  value={fsRobotCode}
                  onChange={(e) => setFsRobotCode(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  在丰声 NEXT 开发者后台「机器人管理」中获取，凭据将通过「凭据金库」加密存储
                </p>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  variant={fsConnected ? "outline" : "default"}
                  className="h-8 text-xs gap-1.5"
                  onClick={() => {
                    if (!fsAppKey || !fsAppSecret || !fsRobotCode) {
                      toast({ title: "请先填写完整的应用凭证", variant: "destructive" });
                      return;
                    }
                    setFsConnected(true);
                    toast({ title: "丰声 NEXT 机器人已连接", description: `Robot ${fsRobotCode}` });
                  }}
                >
                  {fsConnected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                  {fsConnected ? "已连接" : "连接"}
                </Button>
              </div>
            </div>

            <div className="border border-border rounded-lg p-5 bg-card space-y-3">
              <h4 className="text-xs font-semibold">接入说明</h4>
              <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal pl-4 leading-relaxed">
                <li>登录丰声 NEXT 开发者后台，创建企业内部应用并开通「机器人」能力</li>
                <li>复制应用的 AppKey、AppSecret 与 Robot Code，粘贴至上方对应字段</li>
                <li>点击「连接」校验凭证，校验通过后保存并发布智能体</li>
                <li>在目标群聊中添加该机器人，即可通过 @ 机器人触发对话</li>
              </ol>
            </div>
          </TabsContent>

          {/* Debug */}
          <TabsContent value="debug" className="mt-4 space-y-4">
            <div className="border border-border rounded-lg px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Bug className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs">
                  <span className="font-medium">调试智能体</span>
                  <span className="text-muted-foreground"> · 左侧与调试 AI 沟通配置；右侧直接与智能体对话验证</span>
                </p>
              </div>
              {debugChanges.length > 0 && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  调试期已优化 {debugChanges.length} 项
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Left: Debug Assistant */}
              <div className="border border-border rounded-lg bg-card flex flex-col h-[clamp(380px,calc(100vh-260px),560px)]">
                <div className="px-3 h-10 shrink-0 border-b border-border flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold">调试助手</span>
                  <Badge variant="outline" className="text-[10px] h-4">AI</Badge>
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-3">
                  {assistantMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-2 px-4">
                      <Bot className="w-7 h-7 opacity-30" />
                      <p className="text-xs">在右侧发起一轮调试后，我会主动告诉你做了哪些优化</p>
                      <p className="text-[10px] leading-relaxed">你也可以直接和我说："帮我修改提示词"、"补充某个能力的用途"</p>
                    </div>
                  )}
                  {assistantMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap leading-relaxed ${
                        msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {assistantThinking && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" /> 思考中…
                    </div>
                  )}
                </div>
                <div className="border-t border-border p-3 flex items-center gap-2">
                  <Input
                    className="h-8 text-xs"
                    placeholder='告诉我要怎么调整，例如"帮我精简提示词"'
                    value={assistantInput}
                    onChange={(e) => setAssistantInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAssistantMessage(); } }}
                  />
                  <Button size="sm" className="h-8 text-xs gap-1.5" onClick={sendAssistantMessage} disabled={assistantThinking || !assistantInput.trim()}>
                    <Send className="w-3 h-3" /> 发送
                  </Button>
                </div>
              </div>

              {/* Right: Agent Run with tabbed Chat / Logs view */}
              <div className="border border-border rounded-lg bg-card flex flex-col h-[clamp(380px,calc(100vh-260px),560px)]">
                <Tabs value={runView} onValueChange={(v) => setRunView(v as "chat" | "logs")} className="flex flex-col flex-1 min-h-0">
                  <div className="px-3 h-10 shrink-0 border-b border-border flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Bot className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-xs font-semibold shrink-0">智能体运行</span>
                      {debugRunning && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0 ml-1">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" /> 运行中
                        </span>
                      )}
                    </div>
                    <TabsList className="h-7 p-0.5 shrink-0">
                      <TabsTrigger value="chat" className="text-[11px] h-6 px-2 gap-1">
                        <Bot className="w-3 h-3" /> 对话
                      </TabsTrigger>
                      <TabsTrigger value="logs" className="text-[11px] h-6 px-2 gap-1">
                        <Terminal className="w-3 h-3" /> 日志
                        {debugLogs.length > 0 && (
                          <span className="ml-0.5 px-1 rounded bg-muted text-muted-foreground text-[9px] leading-tight">
                            {debugLogs.length}
                          </span>
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="chat" forceMount className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
                    <div className="flex-1 overflow-auto p-4 space-y-3 min-h-0">
                      {runMessages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
                          <Play className="w-7 h-7 opacity-30" />
                          <p className="text-xs">输入示例任务，与智能体真实对话</p>
                          <p className="text-[10px]">例如："帮我查询昨天的快递订单状态"</p>
                        </div>
                      )}
                      {runMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap leading-relaxed ${
                            msg.role === "user" ? "bg-primary text-primary-foreground" :
                            msg.status === "error" ? "bg-destructive/10 border border-destructive/30 text-destructive" :
                            "bg-muted"
                          }`}>
                            {msg.role === "assistant" && msg.tool && (
                              <div className="flex items-center gap-1 mb-1 text-[10px] opacity-70">
                                <Zap className="w-2.5 h-2.5" /> 调用：{msg.tool}
                              </div>
                            )}
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {debugRunning && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" /> 智能体执行中…
                          <button
                            type="button"
                            onClick={() => setRunView("logs")}
                            className="text-primary hover:underline"
                          >
                            查看运行日志 →
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-border p-3 flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant={voiceRecording ? "default" : "outline"}
                        className={`h-8 w-8 shrink-0 ${voiceRecording ? "animate-pulse" : ""}`}
                        onClick={toggleVoice}
                        title={voiceRecording ? "结束语音输入" : "语音输入"}
                      >
                        {voiceRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      </Button>
                      <Input
                        className="h-8 text-xs"
                        placeholder={voiceRecording ? "正在录音…再次点击麦克风结束" : "输入测试任务，回车发送"}
                        value={debugInput}
                        onChange={(e) => setDebugInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runDebug(); } }}
                      />
                      <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => runDebug()} disabled={debugRunning || !debugInput.trim()}>
                        <Send className="w-3 h-3" /> 发送
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="logs" forceMount className="flex-1 flex flex-col min-h-0 mt-0 bg-zinc-950 text-zinc-100 rounded-b-lg overflow-hidden data-[state=inactive]:hidden">
                    <div className="px-3 h-9 shrink-0 border-b border-zinc-800 flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-zinc-300 min-w-0">
                        <Terminal className="w-3 h-3 shrink-0" />
                        <span className="font-mono truncate">runtime.log</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <select
                          value={logFilter}
                          onChange={(e) => setLogFilter(e.target.value as typeof logFilter)}
                          className="bg-zinc-900 border border-zinc-700 text-zinc-200 rounded px-1.5 py-0.5 text-[10px] font-mono focus:outline-none focus:border-zinc-500"
                        >
                          {(["all", "info", "thought", "tool", "warn", "error"] as const).map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(debugLogs.map((l) => `[${l.ts}] ${l.level.toUpperCase()} ${l.message}${l.meta ? ` | ${l.meta}` : ""}`).join("\n"));
                            toast({ title: "日志已复制到剪贴板" });
                          }}
                          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                          title="复制全部日志"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto px-3 py-2 font-mono text-[11px] leading-relaxed">
                      {debugLogs.length === 0 ? (
                        <p className="text-zinc-500 text-center py-3">暂无运行日志，发送一条调试消息即可查看</p>
                      ) : (
                        debugLogs
                          .filter((l) => logFilter === "all" || l.level === logFilter)
                          .map((l) => {
                            const colorMap: Record<LogLevel, string> = {
                              info: "text-sky-300",
                              thought: "text-violet-300",
                              tool: "text-emerald-300",
                              warn: "text-amber-300",
                              error: "text-red-400",
                              result: "text-cyan-300",
                            };
                            const iconMap: Record<LogLevel, JSX.Element> = {
                              info: <Info className="w-2.5 h-2.5" />,
                              thought: <Brain className="w-2.5 h-2.5" />,
                              tool: <Wrench className="w-2.5 h-2.5" />,
                              warn: <AlertTriangle className="w-2.5 h-2.5" />,
                              error: <AlertCircle className="w-2.5 h-2.5" />,
                              result: <CheckCircle2 className="w-2.5 h-2.5" />,
                            };
                            return (
                              <div key={l.id} className="flex gap-2 py-0.5">
                                <span className="text-zinc-500 shrink-0">{l.ts}</span>
                                <span className={`shrink-0 flex items-center gap-1 ${colorMap[l.level]}`}>
                                  {iconMap[l.level]}
                                  {l.level.padEnd(7)}
                                </span>
                                <span className="text-zinc-200 break-all">
                                  {l.message}
                                  {l.meta && <span className="text-zinc-500 ml-2">{l.meta}</span>}
                                </span>
                              </div>
                            );
                          })
                      )}
                      {debugRunning && (
                        <div className="flex items-center gap-2 text-zinc-500 mt-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="animate-pulse">streaming…</span>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="max-w-md">
          {publishStage === "project" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm flex items-center gap-1.5">
                  <FolderKanban className="w-4 h-4 text-primary" />
                  保存到项目管理
                </DialogTitle>
                <DialogDescription className="text-[11px]">
                  确认基础信息后保存到项目管理；保存成功后可继续发布到数字同事
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
                      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                        头像将随智能体一起发布到数字同事
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">名称 <span className="text-destructive">*</span></Label>
                  <Input className="mt-1.5 h-8 text-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：财务月报助手" />
                </div>
                <div>
                  <Label className="text-xs">描述</Label>
                  <Textarea className="mt-1.5 text-xs" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="一句话描述智能体能力" />
                </div>
                <div>
                  <Label className="text-xs">分类</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {debugChanges.length > 0 && (
                  <div className="border border-primary/30 bg-primary/5 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      调试期间已为你优化 {debugChanges.length} 项配置
                    </div>
                    <ul className="text-[11px] text-muted-foreground space-y-1 pl-5 list-disc leading-relaxed">
                      {debugChanges.map((c, i) => (
                        <li key={i}>{c.summary}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPublishOpen(false)}>取消</Button>
                <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleSaveToProject}>
                  保存并继续 <ArrowRight className="w-3 h-3" />
                </Button>
              </DialogFooter>
            </>
          )}

          {publishStage === "marketplace" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-primary" />
                  发布到数字同事
                </DialogTitle>
                <DialogDescription className="text-[11px]">
                  发布后，团队成员可在数字同事发现并使用该智能体；也可暂不发布，仅保留在项目内部使用
                </DialogDescription>
              </DialogHeader>
              <div className="border border-border rounded-lg p-3 bg-muted/40 my-1 flex items-center gap-3">
                <img src={avatarUrl} alt="智能体头像" className="w-10 h-10 rounded-md border border-border bg-background shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 已保存到项目管理</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{name} · {category}</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleSkipMarket}>暂不发布</Button>
                <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handlePublishToMarket} disabled={publishingToMarket}>
                  {publishingToMarket ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
                  发布到数字同事
                </Button>
              </DialogFooter>
            </>
          )}

          {publishStage === "done" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  发布成功
                </DialogTitle>
                <DialogDescription className="text-[11px]">
                  「{name}」已发布到数字同事，团队成员现在即可使用
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setPublishOpen(false); navigate("/project-agents"); }}>前往项目管理</Button>
                <Button size="sm" className="h-8 text-xs" onClick={() => { setPublishOpen(false); navigate("/"); }}>查看数字同事</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateAgentManualPage;
