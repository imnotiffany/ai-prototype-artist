import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Rocket, Plus, X, Settings2, Cpu, Server, Zap, Shield, KeyRound, Bot, MessageSquare, Eye, EyeOff, Link2, CheckCircle2, Sparkles, Loader2, ExternalLink, Play, Send, AlertCircle, Wand2, Bug, FolderKanban, Store, ArrowRight, Mic, MicOff, HelpCircle, FileEdit, Terminal, ChevronDown, ChevronUp, Copy, Brain, Wrench, Info, AlertTriangle } from "lucide-react";
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

  // Debug
  type DebugSuggestion = { kind: "prompt"; updatedPrompt: string; summary: string } | { kind: "clarify"; questions: string[] };
  type DebugMsg = {
    role: "user" | "assistant" | "system";
    content: string;
    status?: "ok" | "error";
    tool?: string;
    suggestion?: DebugSuggestion;
  };
  const [debugInput, setDebugInput] = useState("");
  const [debugMessages, setDebugMessages] = useState<DebugMsg[]>([]);
  const [debugRunning, setDebugRunning] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);

  // Runtime logs (Cloud Code style)
  type LogLevel = "info" | "tool" | "thought" | "warn" | "error" | "result";
  type LogEntry = { id: number; ts: string; level: LogLevel; message: string; meta?: string };
  const [debugLogs, setDebugLogs] = useState<LogEntry[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);
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

  const buildOptimizationSuggestion = (userInput: string): DebugSuggestion => {
    // If user has bound capabilities but their purpose isn't documented in the prompt, ask for clarification
    const undocumented = [
      ...selMCPs.filter((m) => !systemPrompt.includes(m)),
      ...selSkills.filter((s) => !systemPrompt.includes(s)),
    ];
    if (undocumented.length > 0) {
      return {
        kind: "clarify",
        questions: undocumented.slice(0, 3).map(
          (n) => `你绑定了「${n}」，但系统提示词里没有说明它的用途。请用一句话告诉我：在什么场景下应该调用它？`
        ),
      };
    }
    // Otherwise propose a refined system prompt grounded in the test input
    const refined = `${systemPrompt.trim()}\n\n# 来自调试的补充指引\n- 用户曾以「${userInput}」类问题进行测试，遇到该类问题时应优先：\n  1. 拆解任务目标，明确需要哪些 MCP / Skill\n  2. 引用工具返回的数据并标注来源\n  3. 输出结构化结果，避免冗余寒暄`;
    return {
      kind: "prompt",
      updatedPrompt: refined,
      summary: "基于本轮调试反馈，建议在系统提示词中补充任务拆解、来源标注与输出结构化的工作流。",
    };
  };

  const runDebug = (overrideInput?: string) => {
    const text = (overrideInput ?? debugInput).trim();
    if (!text) return;
    const userMsg: DebugMsg = { role: "user", content: text };
    setDebugMessages((m) => [...m, userMsg]);
    setDebugInput("");
    setDebugRunning(true);

    // Simulated Cloud Code runtime trace
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
      const ok: DebugMsg = {
        role: "assistant",
        status: "ok",
        tool,
        content: `已通过 ${tool} 完成响应：根据你的输入「${text}」生成结果（模拟输出）。`,
      };
      const suggestionMsg: DebugMsg = {
        role: "system",
        content: "",
        suggestion: buildOptimizationSuggestion(text),
      };
      setDebugMessages((m) => [...m, ok, suggestionMsg]);
      pushLog("result", `[done] 推理完成 · 用时 698ms · tokens in=312 out=128`);
      setDebugRunning(false);
    }, 700);
  };

  const applyPromptSuggestion = (newPrompt: string, msgIndex: number) => {
    setSystemPrompt(newPrompt);
    setDebugMessages((m) =>
      m.map((msg, i) =>
        i === msgIndex ? { ...msg, suggestion: undefined, content: "✓ 已采纳建议并更新系统提示词" } : msg
      )
    );
    toast({ title: "系统提示词已更新" });
  };

  const dismissSuggestion = (msgIndex: number) => {
    setDebugMessages((m) =>
      m.map((msg, i) => (i === msgIndex ? { ...msg, suggestion: undefined, content: "已忽略本次建议" } : msg))
    );
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
${subLines ? `\n## 可调度的 Subagent\n${subLines}\n` : ""}
# 工作流程
1. 仔细理解用户意图，必要时主动澄清关键信息。
2. 根据任务类型，从上述能力中选择最合适的工具组合。
3. 调用工具前简要说明计划；调用后基于结果迭代下一步。
4. 对涉及外部数据写入或敏感操作的步骤，先与用户确认再执行。

# 输出规范
- 使用清晰的 Markdown 结构组织回答。
- 引用工具返回的数据时，注明来源（Skill / MCP 名称）。
- 遇到不确定或工具不可用时，如实告知，不要编造结果。

# 约束
- 严格遵守公司数据安全与合规要求。
- 不要在回复中暴露密钥、Token 或其他凭证。`;

      setSystemPrompt(generated);
      setGeneratingPrompt(false);
      toast({ title: "已根据当前能力生成系统提示词", description: `Skill ${selSkills.length} · MCP ${selMCPs.length} · Subagent ${selSubagents.length}` });
    }, 800);
  };

  const handleSaveDraft = () => {
    toast({
      title: "草稿已保存",
      description: `${selSkills.length} Skill / ${selMCPs.length} MCP / ${selSubagents.length} Subagent`,
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
      toast({ title: "已发布到应用广场", description: name });
    }, 700);
  };

  const handleSkipMarket = () => {
    setPublishOpen(false);
    navigate("/project-agents");
  };

  const PickerDialog = ({
    items,
    selected,
    onToggle,
    icon,
    label,
    marketLink,
    deployBadge,
  }: {
    items: { name: string; description: string }[];
    selected: string[];
    onToggle: (n: string) => void;
    icon: React.ReactNode;
    label: string;
    marketLink: string;
    deployBadge?: (name: string) => string;
  }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const filtered = items.filter(
      (it) => it.name.toLowerCase().includes(search.toLowerCase()) ||
              it.description.toLowerCase().includes(search.toLowerCase())
    );
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" className="h-7 w-7" title={`添加 ${label}`}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              选择 {label}
              <Badge variant="secondary" className="text-[10px] font-normal">已选 {selected.length}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              className="h-8 text-xs"
              placeholder={`搜索 ${label} 名称或功能描述`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 shrink-0" onClick={() => window.open(marketLink, "_blank")}>
              前往{label === "Skill" ? "Skill 广场" : label === "MCP" ? "MCP 广场" : "智能体广场"}
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
          <div className="overflow-auto -mx-1 px-1 grid grid-cols-2 gap-2.5">
            {filtered.map((it) => {
              const sel = selected.includes(it.name);
              return (
                <div
                  key={it.name}
                  className={`border rounded-lg p-3 transition-colors ${
                    sel ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/40 bg-card"
                  }`}
                >
                  <div className="flex items-start gap-2 mb-1.5">
                    <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${sel ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{it.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {deployBadge && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5">{deployBadge(it.name)}</Badge>
                        )}
                      </div>
                    </div>
                    {sel && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-2.5 min-h-[32px]">
                    {it.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <button
                      className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                      onClick={() => window.open(`${marketLink}#${encodeURIComponent(it.name)}`, "_blank")}
                    >
                      查看详情 <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                    <Button
                      size="sm"
                      variant={sel ? "outline" : "default"}
                      className="h-6 text-[10px] px-2"
                      onClick={() => onToggle(it.name)}
                    >
                      {sel ? "移除" : "添加"}
                    </Button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="col-span-2 text-center text-xs text-muted-foreground py-8">未找到匹配的 {label}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>完成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
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

      <div className="max-w-4xl mx-auto px-6 py-5">
        <Tabs defaultValue="capability">
          <TabsList className="grid grid-cols-5 h-9">
            <TabsTrigger value="capability" className="text-xs">能力配置</TabsTrigger>
            <TabsTrigger value="prompt" className="text-xs">系统提示词</TabsTrigger>
            <TabsTrigger value="env" className="text-xs">凭据配置</TabsTrigger>
            <TabsTrigger value="fengsheng" className="text-xs">丰声 NEXT</TabsTrigger>
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
                <Label className="text-xs">MCP 绑定</Label>
                <PickerDialog items={mcps} selected={selMCPs} onToggle={(n) => toggle(selMCPs, setSelMCPs, n)} icon={<Server className="w-3.5 h-3.5" />} label="MCP" marketLink="/" deployBadge={() => "云端"} />
              </div>
              {selMCPs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">未绑定任何 MCP 服务</p>
              ) : (
                <div className="space-y-1.5">
                  {selMCPs.map((s) => (
                    <div key={s} className="flex items-center justify-between border border-border rounded px-3 py-1.5 text-xs">
                      <span className="flex items-center gap-1.5"><Server className="w-3 h-3 text-primary" />{s}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] h-4">需凭证</Badge>
                        <button onClick={() => toggle(selMCPs, setSelMCPs, s)} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">凭证将从「凭据金库」自动注入；如某 MCP 存在多个凭据，请前往「凭据配置」选择</p>
            </div>

            {/* Skill 绑定 */}
            <div className="border border-border rounded-lg p-5 bg-card">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-xs">Skill 绑定</Label>
                <PickerDialog items={skills} selected={selSkills} onToggle={(n) => toggle(selSkills, setSelSkills, n)} icon={<Zap className="w-3.5 h-3.5" />} label="Skill" marketLink="/" />
              </div>
              {selSkills.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">未绑定任何 Skill</p>
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
                  {generatingPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
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

          {/* Credentials */}
          <TabsContent value="env" className="mt-4 space-y-4">
            <div className="border border-border rounded-lg p-5 bg-card">
              <div className="mb-3">
                <Label className="text-xs flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> MCP 凭据绑定</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">为每个已绑定的 MCP 选择运行时使用的凭据；单凭据 MCP 将自动选中</p>
              </div>
              {selMCPs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">尚未绑定 MCP，请先到「能力配置」中添加</p>
              ) : (
                <div className="space-y-2">
                  {selMCPs.map((mcpName) => {
                    const creds = mockCredentials.filter((c) => c.mcpServer === mcpName);
                    const current = mcpCredentialMap[mcpName] ?? (creds.length === 1 ? creds[0].id : "");
                    return (
                      <div key={mcpName} className="border border-border rounded-lg p-3 flex items-center gap-3">
                        <Server className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-xs font-medium min-w-[120px]">{mcpName}</span>
                        {creds.length === 0 ? (
                          <div className="flex items-center gap-2 ml-auto">
                            <span className="text-[10px] text-amber-600 dark:text-amber-500">尚无可用凭据</span>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate("/vault")}>前往金库添加</Button>
                          </div>
                        ) : creds.length === 1 ? (
                          <div className="flex items-center gap-1.5 ml-auto">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span className="text-xs">{creds[0].name}</span>
                            <Badge variant="outline" className="text-[9px] h-4 ml-1">自动选中</Badge>
                          </div>
                        ) : (
                          <div className="ml-auto w-56">
                            <Select value={current} onValueChange={(v) => setMcpCredentialMap({ ...mcpCredentialMap, [mcpName]: v })}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="选择凭据" /></SelectTrigger>
                              <SelectContent>
                                {creds.map((c) => (
                                  <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}（{c.type}）</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border border-border rounded-lg p-5 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5" /> 持久化文件系统</Label>
                  <p className="text-[10px] text-muted-foreground">容器重启后保留 /workspace 数据</p>
                </div>
                <Switch checked={persistentFs} onCheckedChange={setPersistentFs} />
              </div>
            </div>
          </TabsContent>

          {/* FengSheng NEXT Bot */}
          <TabsContent value="fengsheng" className="mt-4 space-y-4">
            <div className="border border-border rounded-lg px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-primary shrink-0" />
              <p className="text-xs">
                <span className="font-medium">发布为丰声 NEXT 群聊机器人</span>
                <span className="text-muted-foreground"> · 群成员 @ 即可触发对话</span>
              </p>
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
            <div className="border border-border rounded-lg px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 flex items-center gap-2.5">
              <Bug className="w-4 h-4 text-primary shrink-0" />
              <p className="text-xs">
                <span className="font-medium">调试智能体</span>
                <span className="text-muted-foreground"> · 输入示例任务，验证当前配置能否正常运行</span>
              </p>
            </div>

            <div className="border border-border rounded-lg bg-card flex flex-col h-[480px]">
              <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">对话调试</span>
                  <Badge variant="outline" className="text-[10px] h-4">
                    {model} · {selMCPs.length} MCP · {selSkills.length} Skill
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant={logsOpen ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => setLogsOpen((v) => !v)}
                  >
                    <Terminal className="w-3 h-3" />
                    运行日志
                    {debugLogs.length > 0 && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 ml-0.5">{debugLogs.length}</Badge>
                    )}
                    {logsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setDebugMessages([]); setDebugLogs([]); }}>清空</Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-3">
                {debugMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
                    <Play className="w-8 h-8 opacity-30" />
                    <p className="text-xs">输入一个示例任务开始调试</p>
                    <p className="text-[10px]">例如：「帮我查询昨天的快递订单状态」</p>
                  </div>
                )}
                {debugMessages.map((msg, i) => {
                  if (msg.role === "system" && msg.suggestion) {
                    const s = msg.suggestion;
                    return (
                      <div key={i} className="flex justify-start">
                        <div className="max-w-[90%] rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs space-y-2">
                          <div className="flex items-center gap-1.5 font-medium text-primary">
                            <Sparkles className="w-3.5 h-3.5" />
                            AI 优化建议
                          </div>
                          {s.kind === "clarify" ? (
                            <>
                              <p className="text-muted-foreground leading-relaxed">
                                为了让智能体更准确地选择工具，需要你澄清以下能力的实际用途：
                              </p>
                              <ul className="space-y-1.5">
                                {s.questions.map((q, qi) => (
                                  <li key={qi} className="flex gap-1.5">
                                    <HelpCircle className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                                    <span>{q}</span>
                                  </li>
                                ))}
                              </ul>
                              <div className="flex justify-end gap-2 pt-1">
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => dismissSuggestion(i)}>忽略</Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-muted-foreground leading-relaxed">{s.summary}</p>
                              <div className="flex justify-end gap-2 pt-1">
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => dismissSuggestion(i)}>忽略</Button>
                                <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => applyPromptSuggestion(s.updatedPrompt, i)}>
                                  <FileEdit className="w-3 h-3" />
                                  采纳并更新提示词
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap leading-relaxed ${
                        msg.role === "user" ? "bg-primary text-primary-foreground" :
                        msg.role === "system" ? "bg-muted text-muted-foreground italic" :
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
                  );
                })}
                {debugRunning && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> 智能体执行中…
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
                  第 1 步 · 保存到项目管理
                </DialogTitle>
                <DialogDescription className="text-[11px]">
                  确认基础信息后保存到项目管理；保存成功后可继续发布到应用广场
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-1">
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
                  第 2 步 · 发布到应用广场
                </DialogTitle>
                <DialogDescription className="text-[11px]">
                  发布后，团队成员可在应用广场发现并使用该智能体；也可暂不发布，仅保留在项目内部使用
                </DialogDescription>
              </DialogHeader>
              <div className="border border-border rounded-lg p-3 bg-muted/40 my-1 space-y-1">
                <div className="flex items-center gap-1.5 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 已保存到项目管理</div>
                <p className="text-[11px] text-muted-foreground pl-5">{name} · {category}</p>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleSkipMarket}>暂不发布</Button>
                <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handlePublishToMarket} disabled={publishingToMarket}>
                  {publishingToMarket ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
                  发布到应用广场
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
                  「{name}」已发布到应用广场，团队成员现在即可使用
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setPublishOpen(false); navigate("/project-agents"); }}>前往项目管理</Button>
                <Button size="sm" className="h-8 text-xs" onClick={() => { setPublishOpen(false); navigate("/"); }}>查看应用广场</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateAgentManualPage;
