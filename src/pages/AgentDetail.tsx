import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  ArrowLeft, MessageSquare, Send, Save, Bot, CheckCircle2, Server, Bug, Mic, MicOff, Zap, Plus, X, RotateCcw, EyeOff, Eye, Settings2,
  AlertTriangle, Copy, Pencil, Rocket, Code2, Layout, Users, KeyRound,
} from "lucide-react";
import { mockAgents, getActiveMCPs, getActiveSkills } from "@/data/mockData";
import { isMcpConfigured, subscribeMcpStore } from "@/data/mcpCredentialStore";
import { toast } from "@/hooks/use-toast";
import { PublishAgentDialog } from "@/components/PublishAgentDialog";
import { AgentRuntimeBadge, type AgentRuntimeStatus } from "@/components/AgentRuntimeBadge";
import { CapabilityPickerDialog } from "@/components/CapabilityPickerDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RunDualView, RunningIndicator, type TranscriptEvent, type DebugEvent } from "@/components/RunViews";

/* ───────── Mock run history ───────── */
type RunStatus = "success" | "failed" | "running";
interface RunRecord {
  id: string;
  source: "丰声 NEXT" | "Web 端" | "API";
  trigger: string;
  startedAt: string;
  duration: string;
  status: RunStatus;
  prompt: string;
}
const mockRuns: RunRecord[] = [
  { id: "run-001", source: "丰声 NEXT",  trigger: "廖奕通", startedAt: "2026-04-29 10:24:18", duration: "00:00:42", status: "success", prompt: "帮我整理今天的销售周报，按区域汇总" },
  { id: "run-002", source: "Web 端", trigger: "张毅超", startedAt: "2026-04-29 10:18:03", duration: "00:01:12", status: "success", prompt: "分析一下 Q1 用户留存数据" },
  { id: "run-003", source: "API",    trigger: "system",  startedAt: "2026-04-29 09:55:41", duration: "00:00:08", status: "failed",  prompt: "scheduled job: daily-summary" },
  { id: "run-004", source: "丰声 NEXT",  trigger: "杨彪龙", startedAt: "2026-04-29 09:42:11", duration: "00:00:33", status: "success", prompt: "把昨天的会议纪要总结一下" },
  { id: "run-005", source: "Web 端", trigger: "李四",   startedAt: "2026-04-29 09:20:55", duration: "00:02:18", status: "running", prompt: "对比一下竞品最近 3 个月的更新" },
];



const buildMockTranscript = (userPrompt: string): TranscriptEvent[] => [
  { id: "s0", type: "system", message: "会话开始 · claude-sonnet-4-6" },
  { id: "u0", type: "user", content: userPrompt },
  { id: "a0", type: "agent", content: "好的，我先查询今天各区域的销售数据。" },
  {
    id: "t0",
    type: "tools",
    calls: [
      { id: "c1", kind: "search", name: "web_search", summary: 'q: "销售数据 2026-04-29"', status: "success",
        input: '{"q":"销售数据 2026-04-29"}', output: '{"results":[{"title":"华东 Q2"},{"title":"华南 Q2"}]}' },
      { id: "c2", kind: "mcp", name: "丰景台数据查询v2", summary: "region=ALL · 412ms", status: "success",
        input: '{"region":"ALL"}', output: '{"east":1200000,"south":900000,"north":700000}' },
    ],
  },
  { id: "a1", type: "agent",
    content: "已汇总完成，华东区 ¥1.2M（环比 +8%）、华南区 ¥0.9M（+3%）、华北区 ¥0.7M（-2%）。\n\n报告已生成 → 销售周报_20260429.md" },
  { id: "s1", type: "system", message: "会话结束 · 1552 tokens" },
];

const mockDebugEvents: DebugEvent[] = [
  { id: "d1", ts: "10:24:18.102", type: "session.start", data: { session_id: "sess-9f2c", model: "claude-sonnet-4-6" } },
  { id: "d2", ts: "10:24:18.245", type: "llm.request",   data: { messages: 1, tokens_in: 1240 } },
  { id: "d3", ts: "10:24:19.812", type: "tool.call",     data: { name: "web_search", args: { q: "销售数据 2026-04-29" } } },
  { id: "d4", ts: "10:24:21.044", type: "tool.result",   data: { name: "web_search", bytes: 4821, latency_ms: 1232 } },
  { id: "d5", ts: "10:24:24.501", type: "llm.response",  data: { tokens_out: 312, finish_reason: "stop" } },
  { id: "d6", ts: "10:24:24.612", type: "session.end",   data: { status: "success", total_ms: 6510, total_tokens: 1552 } },
];

type LogLevel = "info" | "tool" | "thought" | "warn" | "error" | "result";
type LogEntry = { id: number; ts: string; level: LogLevel; message: string; meta?: string };

const AgentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "config" ? "config" : "debug";
  const agent = mockAgents.find((a) => a.id === id);

  /* ── Saved snapshot vs current draft (for "未保存" indicator) ── */
  const initialSnapshot = useMemo(() => ({
    name: agent?.name ?? "",
    description: agent?.description ?? "",
    model: "claude-sonnet-4-6",
    systemPrompt: "你是一名严谨的业务助理。请根据用户问题，调用合适的工具完成任务，并以结构化方式输出结果。",
    skills: [] as string[],
    mcpBindings: ((agent?.mcpServers ?? []) as string[]).map((m) => ({ name: m, credential: "" })),
    fsAppKey: "",
    fsAppSecret: "",
    fsRobotCode: "",
  }), [agent]);

  const [name, setName] = useState(initialSnapshot.name);
  const [description, setDescription] = useState(initialSnapshot.description);
  const [model, setModel] = useState(initialSnapshot.model);
  const [systemPrompt, setSystemPrompt] = useState(initialSnapshot.systemPrompt);
  const [selSkills, setSelSkills] = useState<string[]>(initialSnapshot.skills);
  const [mcpBindings, setMcpBindings] = useState<{ name: string; credential: string }[]>(initialSnapshot.mcpBindings);
  const [fsAppKey, setFsAppKey] = useState(initialSnapshot.fsAppKey);
  const [fsAppSecret, setFsAppSecret] = useState(initialSnapshot.fsAppSecret);
  const [fsRobotCode, setFsRobotCode] = useState(initialSnapshot.fsRobotCode);
  const [fsSecretVisible, setFsSecretVisible] = useState(false);
  const [selSubagents, setSelSubagents] = useState<string[]>(["数据查询子智能体", "报告撰写子智能体"]);
  const [subagentGapDialogOpen, setSubagentGapDialogOpen] = useState(false);
  const [configView, setConfigView] = useState<"form" | "code">("form");
  const [savedSnapshot, setSavedSnapshot] = useState(initialSnapshot);
  const [justSaved, setJustSaved] = useState(false);

  const isDirty = useMemo(() => JSON.stringify({
    name, description, model, systemPrompt, skills: selSkills, mcpBindings, fsAppKey, fsAppSecret, fsRobotCode,
  }) !== JSON.stringify(savedSnapshot), [name, description, model, systemPrompt, selSkills, mcpBindings, fsAppKey, fsAppSecret, fsRobotCode, savedSnapshot]);

  /* ── Debug state ── */
  type PromptSuggestion = { id: string; addition: string; summaryNote: string; status: "pending" | "adopted" | "rejected" };
  type ChatMsg = { role: "user" | "assistant"; content: string; suggestion?: PromptSuggestion };
  type RunMsg = { role: "user" | "assistant"; content: string; tool?: string; status?: "ok" | "error" };
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<ChatMsg[]>([]);
  const [debugInput, setDebugInput] = useState("");
  const [runMessages, setRunMessages] = useState<RunMsg[]>([]);
  const [debugRunning, setDebugRunning] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [debugLogs, setDebugLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);

  const pushLog = (level: LogLevel, message: string, meta?: string) => {
    const ts = new Date().toLocaleTimeString("zh-CN", { hour12: false }) + "." + String(Date.now() % 1000).padStart(3, "0");
    setDebugLogs((l) => [...l, { id: ++logIdRef.current, ts, level, message, meta }]);
  };

  const updateSuggestionStatus = (id: string, status: "adopted" | "rejected") => {
    setAssistantMessages((msgs) =>
      msgs.map((m) => (m.suggestion?.id === id ? { ...m, suggestion: { ...m.suggestion, status } } : m))
    );
  };

  const adoptSuggestion = (s: PromptSuggestion) => {
    if (s.status !== "pending") return;
    setSystemPrompt((p) => p.trim() + s.addition);
    updateSuggestionStatus(s.id, "adopted");
    toast({ title: "已采纳建议", description: "系统提示词已更新" });
  };

  const rejectSuggestion = (s: PromptSuggestion) => {
    if (s.status !== "pending") return;
    updateSuggestionStatus(s.id, "rejected");
  };

  const sendAssistantMessage = () => {
    if (!assistantInput.trim()) return;
    const text = assistantInput.trim();
    setAssistantMessages((m) => [...m, { role: "user", content: text }]);
    setAssistantInput("");
    setTimeout(() => {
      const addition = `\n\n# 用户调试反馈\n- ${text}`;
      const suggestion: PromptSuggestion = {
        id: `s-${Date.now()}`,
        addition,
        summaryNote: text.slice(0, 40),
        status: "pending",
      };
      setAssistantMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `根据你的反馈，建议在系统提示词中追加这段说明。点击「采纳」即可应用。`,
          suggestion,
        },
      ]);
    }, 600);
  };

  const runDebug = () => {
    if (!debugInput.trim() || debugRunning) return;
    const text = debugInput.trim();
    setRunMessages((m) => [...m, { role: "user", content: text }]);
    setDebugInput("");
    setDebugRunning(true);
    pushLog("info", `[runtime] 启动容器 sandbox-${id}`, `image=cloud-code:1.4.2`);
    pushLog("thought", `[reasoning] 解析用户意图：${text.slice(0, 40)}`);
    setTimeout(() => {
      pushLog("tool", `[tool_use] 调用 web_search`, `args={q:"${text.slice(0, 20)}"}`);
    }, 500);
    setTimeout(() => {
      pushLog("result", `[tool_result] web_search 返回 5 条结果`, `latency=820ms`);
      setRunMessages((m) => [...m, { role: "assistant", content: `（调试响应）已根据「${text}」执行任务，详情见左侧运行日志。`, tool: "web_search" }]);
      setDebugRunning(false);
    }, 1500);
  };

  const toggleVoice = () => {
    if (voiceRecording) {
      setVoiceRecording(false);
      setDebugInput((v) => v + (v ? " " : "") + "（语音输入示例文本）");
    } else {
      setVoiceRecording(true);
    }
  };

  /* ── Run history ── */
  const [activeRun, setActiveRun] = useState<RunRecord | null>(null);

  /* ── 订阅 MCP 管理（Vault）配置变化，让本页绑定区实时联动 ── */
  const [, setVaultTick] = useState(0);
  useEffect(() => {
    const unsub = subscribeMcpStore(() => setVaultTick((t) => t + 1));
    return () => { unsub(); };
  }, []);


  if (!agent) return <div className="p-6">智能体不存在</div>;

  const allMcpOptions = getActiveMCPs().map((m) => m.name);
  const allSkillOptions = getActiveSkills().map((s) => s.name);

  /** 在 MCP 管理（Vault）中可用的 MCP：免凭据 + 已在 Vault 中配置好凭据 */
  const isMcpAvailableInVault = (name: string) => {
    const meta = getActiveMCPs().find((m) => m.name === name);
    if (!meta) return false;
    if (!meta.requiresCredential) return true;
    return isMcpConfigured(name);
  };
  const vaultAvailableMcps = getActiveMCPs().filter((m) => isMcpAvailableInVault(m.name));

  /** 智能体广场上、可作为子智能体被引用的 agent（排除当前智能体自身，避免循环） */
  const marketplaceSubagents = useMemo(
    () => mockAgents.filter((a) => a.kind === "agent" && a.publishScope === "marketplace" && a.id !== id),
    [id]
  );

  /* ── Config actions ── */
  const handleSave = () => {
    setSavedSnapshot({ name, description, model, systemPrompt, skills: selSkills, mcpBindings, fsAppKey, fsAppSecret, fsRobotCode });
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 2800);
    toast({ title: "已保存", description: "配置已更新，可点击发布上线" });
  };

  const handleRevert = () => {
    setName(savedSnapshot.name);
    setDescription(savedSnapshot.description);
    setModel(savedSnapshot.model);
    setSystemPrompt(savedSnapshot.systemPrompt);
    setSelSkills(savedSnapshot.skills);
    setMcpBindings(savedSnapshot.mcpBindings);
    setFsAppKey(savedSnapshot.fsAppKey);
    setFsAppSecret(savedSnapshot.fsAppSecret);
    setFsRobotCode(savedSnapshot.fsRobotCode);
    toast({ title: "已撤销修改" });
  };

  const updateMcpCred = (i: number, cred: string) =>
    setMcpBindings(mcpBindings.map((m, idx) => (idx === i ? { ...m, credential: cred } : m)));
  const removeMcp = (i: number) => setMcpBindings(mcpBindings.filter((_, idx) => idx !== i));
  const addMcp = (n: string) => {
    if (mcpBindings.find((m) => m.name === n)) return;
    setMcpBindings([...mcpBindings, { name: n, credential: "" }]);
  };

  const toggleSkill = (s: string) =>
    setSelSkills(selSkills.includes(s) ? selSkills.filter((x) => x !== s) : [...selSkills, s]);

  const statusBadge = (s: RunStatus) => {
    const map: Record<RunStatus, AgentRuntimeStatus> = { success: "done", failed: "failed", running: "running" };
    return <AgentRuntimeBadge status={map[s]} />;
  };

  /* ── Searchable add poppers ── */
  const [mcpSearch, setMcpSearch] = useState("");
  const [skillSearch, setSkillSearch] = useState("");
  const [mcpPopOpen, setMcpPopOpen] = useState(false);
  const [skillPopOpen, setSkillPopOpen] = useState(false);

  /* ── Header actions: edit basic info & publish ── */
  const [publishOpen, setPublishOpen] = useState(false);
  const [editInfoOpen, setEditInfoOpen] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftDesc, setDraftDesc] = useState(description);

  const openEditInfo = () => {
    setDraftName(name);
    setDraftDesc(description);
    setEditInfoOpen(true);
  };
  const saveBasicInfo = () => {
    setName(draftName);
    setDescription(draftDesc);
    setSavedSnapshot((s) => ({ ...s, name: draftName, description: draftDesc }));
    setEditInfoOpen(false);
    toast({ title: "基本信息已更新", description: "名称与描述的修改不会产生新版本" });
  };

  return (
    <div className="p-6 max-w-[1280px] mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <button onClick={() => navigate(-1)} className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />返回
        </button>
        <span>/</span>
        <span className="text-foreground">{agent.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-xl shrink-0">{agent.avatar}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-foreground truncate">{name}</h1>
              {agent.status === "published" ? (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-emerald-300 text-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/30">已发布</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-muted-foreground">未发布</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 max-w-2xl">{description}</p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {agent.tags.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-[10px] h-5 px-1.5 font-normal">{tag}</Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {justSaved && !isDirty ? (
            <div className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] text-emerald-800 dark:text-emerald-200">已保存</span>
            </div>
          ) : null}
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={openEditInfo}>
            <Pencil className="w-3.5 h-3.5" />编辑基本信息
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setPublishOpen(true)}
            disabled={isDirty}
            title={isDirty ? "请先保存当前修改后再发布" : "发布"}
          >
            <Rocket className="w-3.5 h-3.5" />发布
          </Button>
        </div>
      </div>

      <Tabs defaultValue={initialTab}>
        <TabsList className="h-9 bg-transparent border-b border-border w-full justify-start rounded-none p-0 gap-1">
          <TabsTrigger value="debug" className="gap-1.5 text-xs h-9 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary"><Bug className="w-3.5 h-3.5" />调试</TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5 text-xs h-9 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary"><Settings2 className="w-3.5 h-3.5" />配置</TabsTrigger>
          <TabsTrigger value="runs" className="gap-1.5 text-xs h-9 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary"><MessageSquare className="w-3.5 h-3.5" />会话记录</TabsTrigger>
        </TabsList>

        {/* ───────── 调试 ───────── */}
        <TabsContent value="debug" className="mt-4">

          <div className="border border-border rounded-lg bg-card flex flex-col h-[640px]">
            <div className="px-3 h-10 shrink-0 border-b border-border flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs font-semibold shrink-0">智能体运行</span>
              {debugRunning && <RunningIndicator />}
            </div>
            <div className="flex-1 min-h-0">
              <RunDualView
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
                showTranscriptSearch={false}
              />
            </div>
            <div className="border-t border-border p-3 flex items-center gap-2 shrink-0">
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
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={runDebug} disabled={debugRunning || !debugInput.trim()}>
                <Send className="w-3 h-3" />发送
              </Button>
            </div>
          </div>

        </TabsContent>

        {/* ───────── 配置 ───────── */}
        <TabsContent value="config" className="mt-4">
          <div className="space-y-4">
            {isDirty && (
              <div className="border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-4 py-3 flex items-center justify-between gap-3 shadow-sm animate-fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">配置已修改，尚未保存</p>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">保存后才能发布上线，发布按钮在保存前不可用</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 text-amber-900 hover:text-amber-900 hover:bg-amber-100/80 dark:text-amber-200" onClick={handleRevert}>
                    <RotateCcw className="w-3 h-3" />撤销修改
                  </Button>
                  <Button size="sm" className="h-7 text-[11px] gap-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSave}>
                    <Save className="w-3 h-3" />保存
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 px-1">
              <div className="inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5 shrink-0">
                <button
                  onClick={() => setConfigView("form")}
                  className={`inline-flex items-center gap-1 px-2.5 h-7 rounded text-xs transition-colors ${
                    configView === "form" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layout className="w-3 h-3" />表单
                </button>
                <button
                  onClick={() => setConfigView("code")}
                  className={`inline-flex items-center gap-1 px-2.5 h-7 rounded text-xs transition-colors ${
                    configView === "code" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Code2 className="w-3 h-3" />代码
                </button>
              </div>
            </div>

            {configView === "code" ? (
              <section className="border border-border rounded-lg bg-card">
                <header className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5 text-primary" />配置代码</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">以 YAML 形式查看完整配置，便于版本对比与导出</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `name: ${name}\nmodel: ${model}\nsystem_prompt: |\n  ${systemPrompt.split("\n").join("\n  ")}\nskills:\n${selSkills.map((s) => `  - ${s}`).join("\n") || "  []"}\nmcp_bindings:\n${mcpBindings.map((b) => `  - name: ${b.name}\n    credential: ${b.credential || "(未绑定)"}`).join("\n") || "  []"}\nsub_agents:\n${selSubagents.map((s) => `  - ${s}`).join("\n") || "  []"}\nfengsheng:\n  client_id: ${fsAppKey || "(未配置)"}\n  robot_code: ${fsRobotCode || "(未配置)"}`
                      );
                      toast({ title: "已复制配置到剪贴板" });
                    }}
                  >
                    <Copy className="w-3 h-3" />复制
                  </Button>
                </header>
                <pre className="text-[11px] font-mono leading-relaxed p-4 whitespace-pre-wrap break-all max-h-[640px] overflow-auto">
{`name: ${name}
model: ${model}
system_prompt: |
  ${systemPrompt.split("\n").join("\n  ")}
skills:
${selSkills.map((s) => `  - ${s}`).join("\n") || "  []"}
mcp_bindings:
${mcpBindings.map((b) => `  - name: ${b.name}\n    credential: ${b.credential || "(未绑定)"}`).join("\n") || "  []"}
sub_agents:
${selSubagents.map((s) => `  - ${s}`).join("\n") || "  []"}
fengsheng:
  client_id: ${fsAppKey || "(未配置)"}
  robot_code: ${fsRobotCode || "(未配置)"}`}
                </pre>
              </section>
            ) : (
              <>

            {/* 2. 模型与提示词 */}
            <div className="px-1 space-y-3">
              <div>
                <Label className="text-xs">模型</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-sonnet-4-6" className="text-xs">claude-sonnet-4-6（推荐）</SelectItem>
                    <SelectItem value="claude-haiku-3-5" className="text-xs">claude-haiku-3-5（快速）</SelectItem>
                    <SelectItem value="gpt-4o" className="text-xs">gpt-4o</SelectItem>
                    <SelectItem value="gemini-2.5-pro" className="text-xs">gemini-2.5-pro</SelectItem>
                    <SelectItem value="deepseek-v3" className="text-xs">deepseek-v3</SelectItem>
                    <SelectItem value="qwen-max" className="text-xs">qwen-max</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">系统提示词</Label>
                <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={8}
                  className="mt-1.5 font-mono text-xs leading-relaxed bg-card" />
                <p className="text-[10px] text-muted-foreground mt-1.5">告诉智能体"你是谁、要做什么、怎么回答"。</p>
              </div>
            </div>

            {/* 3. MCP 绑定 */}
            <section className="border border-border rounded-lg bg-card">
              <header className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">MCP 绑定</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    仅可绑定已在「<button onClick={() => navigate("/vault")} className="text-primary hover:underline">MCP 管理</button>」中配置的 MCP；凭据由 MCP 管理统一维护
                  </p>
                </div>
                <CapabilityPickerDialog
                  items={vaultAvailableMcps}
                  selected={mcpBindings.map((b) => b.name)}
                  onToggle={(n) => {
                    const idx = mcpBindings.findIndex((b) => b.name === n);
                    if (idx >= 0) removeMcp(idx); else addMcp(n);
                  }}
                  icon={<Server className="w-3.5 h-3.5" />}
                  label="MCP"
                  marketLink="/vault"
                  deployBadge={(n) => getActiveMCPs().find((m) => m.name === n)?.deployment ?? "云端"}
                  trigger={<Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0"><Plus className="w-3 h-3" />添加 MCP</Button>}
                />
              </header>
              <div className="p-4">
                {mcpBindings.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    尚未绑定任何 MCP。如目标 MCP 不在列表中，请先到「<button onClick={() => navigate("/vault")} className="text-primary hover:underline">MCP 管理</button>」中添加并配置凭据。
                  </p>
                ) : (
                  <div className="space-y-2">
                    {mcpBindings.map((b, i) => {
                      const meta = getActiveMCPs().find((m) => m.name === b.name);
                      const needsCred = !!meta?.requiresCredential;
                      const available = isMcpAvailableInVault(b.name);
                      const credMissing = needsCred && !available;
                      return (
                        <div key={b.name} className={`border rounded-md p-3 flex items-center justify-between gap-3 ${credMissing ? "border-amber-300 bg-amber-50/40" : "border-border"}`}>
                          <div className="min-w-0 flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium truncate">{b.name}</span>
                            {!needsCred ? (
                              <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50/60 text-[10px] h-4 px-1.5">免凭据</Badge>
                            ) : credMissing ? (
                              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-[10px] h-4 gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />MCP 管理中已移除或未配置
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-[10px] h-4 gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" />已就绪 · 凭据由 MCP 管理维护
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {credMissing && (
                              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => navigate("/vault")}>
                                前往 MCP 管理
                              </Button>
                            )}
                            <button onClick={() => removeMcp(i)} className="text-muted-foreground hover:text-destructive p-1" title="移除">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* 4. Skill 绑定 */}
            <section className="border border-border rounded-lg bg-card">
              <header className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">Skill 绑定</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">预制的能力包，让智能体掌握特定领域的工作流</p>
                </div>
                <CapabilityPickerDialog
                  items={getActiveSkills()}
                  selected={selSkills}
                  onToggle={toggleSkill}
                  icon={<Zap className="w-3.5 h-3.5" />}
                  label="Skill"
                  marketLink="/"
                  trigger={<Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0"><Plus className="w-3 h-3" />添加 Skill</Button>}
                />
              </header>
              <div className="p-4">
                {selSkills.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">尚未绑定任何 Skill。点击右上角「添加 Skill」选择。</p>
                ) : (
                  <div className="space-y-2">
                    {selSkills.map((s) => {
                      const meta = getActiveSkills().find((x) => x.name === s);
                      return (
                        <div key={s} className="border border-border rounded-md p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 text-primary shrink-0" />
                              <span className="text-xs font-medium truncate">{s}</span>
                              {meta?.scope === "project" && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-border">项目</Badge>
                              )}
                            </div>
                            {meta?.description && (
                              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{meta.description}</p>
                            )}
                          </div>
                          <button onClick={() => toggleSkill(s)} className="text-muted-foreground hover:text-destructive p-1 shrink-0" title="移除">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* 5. 丰声 NEXT 机器人 */}
            <section className="border border-border rounded-lg bg-card">
              <header className="px-4 py-2.5 border-b border-border">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />丰声 NEXT 机器人
                  <span className="text-[10px] px-1.5 h-4 leading-4 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-normal">可选</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">仅在需要把智能体发布为群聊机器人（成员 @ 即可触发）时配置；不配置不影响其他渠道使用</p>
              </header>
              <div className="p-4 space-y-3">
                <div>
                  <Label className="text-xs">Client ID（AppKey） <span className="text-destructive">*</span></Label>
                  <Input
                    className="mt-1.5 h-8 text-xs font-mono"
                    placeholder="企业应用 AppKey"
                    value={fsAppKey}
                    onChange={(e) => setFsAppKey(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Client Secret（AppSecret） <span className="text-destructive">*</span></Label>
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
                  <Label className="text-xs">Robot Code <span className="text-destructive">*</span></Label>
                  <Input
                    className="mt-1.5 h-8 text-xs font-mono"
                    placeholder="机器人编码"
                    value={fsRobotCode}
                    onChange={(e) => setFsRobotCode(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5">在丰声 NEXT 开发者后台「机器人管理」中获取，凭据将通过「凭据管理」加密存储</p>
                </div>
              </div>
            </section>

            {/* 6. 子智能体 */}
            <section className="border border-border rounded-lg bg-card">
              <header className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />子智能体
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    从智能体广场挑选已发布的智能体作为子智能体；它们继承的 Skill / MCP 会一并展示，未配置凭据的 MCP 需在「<button onClick={() => navigate("/vault")} className="text-primary hover:underline">MCP 管理</button>」中补齐
                  </p>
                </div>
                <CapabilityPickerDialog
                  items={marketplaceSubagents.map((a) => ({ name: a.name, description: a.description }))}
                  selected={selSubagents}
                  onToggle={(n) => setSelSubagents((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n])}
                  icon={<Bot className="w-3.5 h-3.5" />}
                  label="子智能体"
                  marketLink="/"
                  trigger={<Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0"><Plus className="w-3 h-3" />添加子智能体</Button>}
                />
              </header>
              <div className="p-4 space-y-3">
                {(() => {
                  // 汇总所有子智能体里"未在 Vault 配置凭据"的 MCP
                  const allMissing = new Set<string>();
                  selSubagents.forEach((name) => {
                    const sub = marketplaceSubagents.find((a) => a.name === name);
                    sub?.mcpServers.forEach((m) => { if (!isMcpAvailableInVault(m)) allMissing.add(m); });
                  });
                  if (allMissing.size === 0) return null;
                  return (
                    <div className="border border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 rounded-md px-3 py-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="text-[11px] text-amber-800 dark:text-amber-300 truncate">
                          有 {allMissing.size} 个子智能体依赖的 MCP 尚未在 MCP 管理中配置凭据
                        </span>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-[11px] border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0" onClick={() => setSubagentGapDialogOpen(true)}>
                        查看并配置
                      </Button>
                    </div>
                  );
                })()}

                {selSubagents.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">尚未配置子智能体。点击右上角「添加子智能体」从广场选择。</p>
                ) : (
                  selSubagents.map((name) => {
                    const sub = marketplaceSubagents.find((a) => a.name === name);
                    if (!sub) return (
                      <div key={name} className="border border-border rounded-md p-3 flex items-center justify-between">
                        <span className="text-xs flex items-center gap-1.5"><Bot className="w-3 h-3 text-primary" />{name}</span>
                        <button onClick={() => setSelSubagents((prev) => prev.filter((x) => x !== name))} className="text-muted-foreground hover:text-destructive p-1"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    );
                    const missingMcps = sub.mcpServers.filter((m) => !isMcpAvailableInVault(m));
                    return (
                      <div key={name} className="border border-border rounded-md p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <Bot className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="text-xs font-medium truncate">{sub.name}</span>
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-border">来自广场</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{sub.description}</p>
                          </div>
                          <button onClick={() => setSelSubagents((prev) => prev.filter((x) => x !== name))} className="text-muted-foreground hover:text-destructive p-1 shrink-0" title="移除">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {(sub.skills.length > 0 || sub.mcpServers.length > 0) && (
                          <div className="border-t border-border pt-2 space-y-1.5">
                            {sub.mcpServers.length > 0 && (
                              <div className="flex items-start gap-2 flex-wrap">
                                <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">继承 MCP</span>
                                {sub.mcpServers.map((m) => {
                                  const ok = isMcpAvailableInVault(m);
                                  return (
                                    <Badge key={m} variant="outline" className={`text-[10px] h-4 px-1.5 gap-1 ${ok ? "border-emerald-300 text-emerald-700 bg-emerald-50/60" : "border-amber-300 text-amber-700 bg-amber-50/60"}`}>
                                      <Server className="w-2.5 h-2.5" />{m}
                                      {!ok && <AlertTriangle className="w-2.5 h-2.5" />}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                            {sub.skills.length > 0 && (
                              <div className="flex items-start gap-2 flex-wrap">
                                <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">继承 Skill</span>
                                {sub.skills.map((s) => (
                                  <Badge key={s} variant="outline" className="text-[10px] h-4 px-1.5 gap-1 border-border">
                                    <Zap className="w-2.5 h-2.5" />{s}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {missingMcps.length > 0 && (
                              <p className="text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {missingMcps.length} 个 MCP 尚未配置凭据，需在 MCP 管理中补齐
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* 子智能体缺口配置 - 独立弹窗，避免在主表单中堆叠 */}
            <Dialog open={subagentGapDialogOpen} onOpenChange={setSubagentGapDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-sm">补齐子智能体所需 MCP 凭据</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 max-h-[60vh] overflow-auto">
                  {(() => {
                    const map = new Map<string, string[]>(); // mcp -> sub-agent names that need it
                    selSubagents.forEach((name) => {
                      const sub = marketplaceSubagents.find((a) => a.name === name);
                      sub?.mcpServers.forEach((m) => {
                        if (!isMcpAvailableInVault(m)) {
                          map.set(m, [...(map.get(m) ?? []), name]);
                        }
                      });
                    });
                    if (map.size === 0) {
                      return <p className="text-xs text-muted-foreground py-4 text-center">所有依赖 MCP 已就绪</p>;
                    }
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
                        <Button size="sm" variant="outline" className="h-7 text-[11px] shrink-0" onClick={() => { setSubagentGapDialogOpen(false); navigate("/vault"); }}>
                          前往配置
                        </Button>
                      </div>
                    ));
                  })()}
                </div>
                <DialogFooter>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSubagentGapDialogOpen(false)}>关闭</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
              </>
            )}
          </div>
        </TabsContent>

        {/* ───────── 会话记录 ───────── */}
        <TabsContent value="runs" className="mt-4">
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">来源</TableHead>
                  <TableHead>触发人</TableHead>
                  <TableHead>触发内容</TableHead>
                  <TableHead className="w-44">时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockRuns.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setActiveRun(r)}>
                    <TableCell><Badge variant="outline" className="text-[10px] whitespace-nowrap">{r.source}</Badge></TableCell>
                    <TableCell className="text-xs">{r.trigger}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[280px]">{r.prompt}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{r.startedAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Sheet open={!!activeRun} onOpenChange={(o) => !o && setActiveRun(null)}>
            <SheetContent className="w-[680px] sm:max-w-[680px] p-0 flex flex-col">
              <SheetHeader className="px-5 py-3 border-b border-border space-y-1.5">
                <SheetTitle className="text-sm flex items-center gap-2">
                  <span>会话详情</span>
                  {activeRun && (
                    <span className="text-[11px] text-muted-foreground">
                      会话 ID：<span className="font-mono text-foreground">{activeRun.id}</span>
                    </span>
                  )}
                </SheetTitle>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  {activeRun && (
                    <>
                      <span>来源：{activeRun.source}</span>
                      <span>触发人：{activeRun.trigger}</span>
                    </>
                  )}
                </div>
              </SheetHeader>
              <div className="flex-1 min-h-0">
                {activeRun && (
                  <RunDualView
                    transcriptEvents={buildMockTranscript(activeRun.prompt)}
                    debugEvents={mockDebugEvents}
                    debugMeta={[
                      { label: "模型", value: "claude-sonnet-4-6" },
                      { label: "总耗时", value: activeRun.duration },
                      { label: "总 tokens", value: "1552" },
                    ]}
                  />
                )}
              </div>
            </SheetContent>
          </Sheet>
        </TabsContent>
      </Tabs>

      {/* Edit basic info dialog */}
      <Dialog open={editInfoOpen} onOpenChange={setEditInfoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />编辑基本信息
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-[11px] text-muted-foreground">
              名称与描述是展示给使用者的「门面」，调整这些不会影响智能体行为。
            </p>
            <div>
              <Label className="text-xs">名称</Label>
              <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} className="mt-1.5 h-9 text-xs" />
            </div>
            <div>
              <Label className="text-xs">描述</Label>
              <Textarea value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} rows={3} className="mt-1.5 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setEditInfoOpen(false)}>取消</Button>
            <Button size="sm" className="h-8 text-xs" onClick={saveBasicInfo} disabled={!draftName.trim()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish dialog */}
      <PublishAgentDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        agentName={name}
        kind={agent.kind}
      />
    </div>
  );
};

export default AgentDetail;
