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
  ArrowLeft, MessageSquare, Send, Save, Bot, ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock,
  History, Server, Sparkles, Bug, Terminal, Loader2, Mic, MicOff, Zap, Plus, X, RotateCcw, Eye, EyeOff, Search, Settings2,
  Brain, Wrench, Info, AlertTriangle, AlertCircle, Copy, Pencil, Rocket, KeyRound,
} from "lucide-react";
import { mockAgents, getActiveMCPs, getActiveSkills, mockCredentials } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import { PublishAgentDialog } from "@/components/PublishAgentDialog";
import { CapabilityPickerDialog } from "@/components/CapabilityPickerDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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

const mockTranscript = [
  { role: "user", content: "帮我整理今天的销售周报，按区域汇总" },
  { role: "agent", content: "好的，我先查询今天各区域的销售数据。", tools: [{ name: "web_search", count: 2 }, { name: "BigQuery MCP", count: 1 }] },
  { role: "agent", content: "已汇总完成，华东区 ¥1.2M（环比 +8%）、华南区 ¥0.9M（+3%）、华北区 ¥0.7M（-2%）。\n\n报告已生成 → 销售周报_20260429.md" },
];
const mockDebugEvents = [
  { t: "10:24:18.102", type: "session.start", data: { session_id: "sess-9f2c", model: "claude-sonnet-4-6" } },
  { t: "10:24:18.245", type: "llm.request",   data: { messages: 1, tokens_in: 1240 } },
  { t: "10:24:19.812", type: "tool.call",     data: { name: "web_search", args: { q: "销售数据 2026-04-29" } } },
  { t: "10:24:21.044", type: "tool.result",   data: { name: "web_search", bytes: 4821, latency_ms: 1232 } },
  { t: "10:24:24.501", type: "llm.response",  data: { tokens_out: 312, finish_reason: "stop" } },
  { t: "10:24:24.612", type: "session.end",   data: { status: "success", total_ms: 6510, total_tokens: 1552 } },
];

type LogLevel = "info" | "tool" | "thought" | "warn" | "error" | "result";
type LogEntry = { id: number; ts: string; level: LogLevel; message: string; meta?: string };

const AgentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "versions" ? "versions" : "debug";
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
  const [savedSnapshot, setSavedSnapshot] = useState(initialSnapshot);

  const [versions, setVersions] = useState([
    { v: "v3", at: "2026-04-25 14:02", by: "廖奕通", note: "新增 BigQuery MCP", current: true },
    { v: "v2", at: "2026-04-18 09:30", by: "廖奕通", note: "调整 system prompt 风格", current: false },
    { v: "v1", at: "2026-04-10 16:45", by: "廖奕通", note: "初始版本", current: false },
  ]);

  const isDirty = useMemo(() => JSON.stringify({
    name, description, model, systemPrompt, skills: selSkills, mcpBindings, fsAppKey, fsAppSecret, fsRobotCode,
  }) !== JSON.stringify(savedSnapshot), [name, description, model, systemPrompt, selSkills, mcpBindings, fsAppKey, fsAppSecret, fsRobotCode, savedSnapshot]);

  /* ── Debug state ── */
  type ChatMsg = { role: "user" | "assistant"; content: string };
  type RunMsg = { role: "user" | "assistant"; content: string; tool?: string; status?: "ok" | "error" };
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<ChatMsg[]>([]);
  const [debugInput, setDebugInput] = useState("");
  const [runMessages, setRunMessages] = useState<RunMsg[]>([]);
  const [debugRunning, setDebugRunning] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [debugLogs, setDebugLogs] = useState<LogEntry[]>([]);
  const [runView, setRunView] = useState<"chat" | "logs">("chat");
  const [logFilter, setLogFilter] = useState<"all" | LogLevel>("all");
  const logIdRef = useRef(0);

  const pushLog = (level: LogLevel, message: string, meta?: string) => {
    const ts = new Date().toLocaleTimeString("zh-CN", { hour12: false }) + "." + String(Date.now() % 1000).padStart(3, "0");
    setDebugLogs((l) => [...l, { id: ++logIdRef.current, ts, level, message, meta }]);
  };

  const sendAssistantMessage = () => {
    if (!assistantInput.trim()) return;
    const text = assistantInput.trim();
    setAssistantMessages((m) => [...m, { role: "user", content: text }]);
    setAssistantInput("");
    setTimeout(() => {
      setAssistantMessages((m) => [...m, { role: "assistant", content: `已记录你的调整建议："${text}"。我会在右侧下一轮调试中应用。` }]);
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
  const [runDetailView, setRunDetailView] = useState<"transcript" | "debug">("transcript");
  const [expandedTools, setExpandedTools] = useState<Record<number, boolean>>({});

  if (!agent) return <div className="p-6">智能体不存在</div>;

  const allMcpOptions = getActiveMCPs().map((m) => m.name);
  const allSkillOptions = getActiveSkills().map((s) => s.name);
  const credentialsByMcp = (mcp: string) => mockCredentials.filter((c) => c.mcpServer === mcp);

  /* ── Config actions ── */
  const handleSave = () => {
    const next = `v${versions.length + 1}`;
    setVersions([
      { v: next, at: new Date().toISOString().slice(0, 16).replace("T", " "), by: "廖奕通", note: "更新配置", current: true },
      ...versions.map((v) => ({ ...v, current: false })),
    ]);
    setSavedSnapshot({ name, description, model, systemPrompt, skills: selSkills, mcpBindings, fsAppKey, fsAppSecret, fsRobotCode });
    toast({ title: "已保存", description: `生成新版本 ${next}` });
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

  const handleRollback = (v: typeof versions[0]) => {
    setVersions(versions.map((x) => ({ ...x, current: x.v === v.v })));
    toast({ title: `已回滚到 ${v.v}`, description: v.note });
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
    if (s === "success") return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-[10px] gap-1"><CheckCircle2 className="w-3 h-3" />成功</Badge>;
    if (s === "failed") return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-[10px] gap-1"><XCircle className="w-3 h-3" />失败</Badge>;
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 text-[10px] gap-1"><Clock className="w-3 h-3" />运行中</Badge>;
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
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center text-2xl shrink-0">{agent.avatar}</div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground truncate">{name}</h1>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {agent.tags.map((tag, i) => (
                <Badge key={i} variant={i === 0 ? "default" : "outline"} className="text-xs">{tag}</Badge>
              ))}
              <Badge variant="outline" className="text-xs">
                {agent.status === "published" ? "已发布" : agent.status === "draft" ? "草稿" : "项目"}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-mono">{versions.find((v) => v.current)?.v}</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={openEditInfo}>
            <Pencil className="w-3.5 h-3.5" />编辑基本信息
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setPublishOpen(true)}>
            <Rocket className="w-3.5 h-3.5" />发布
          </Button>
        </div>
      </div>

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="debug" className="gap-1.5"><Bug className="w-3.5 h-3.5" />调试</TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5"><Settings2 className="w-3.5 h-3.5" />配置</TabsTrigger>
          <TabsTrigger value="runs" className="gap-1.5"><MessageSquare className="w-3.5 h-3.5" />运行记录</TabsTrigger>
          <TabsTrigger value="versions" className="gap-1.5"><History className="w-3.5 h-3.5" />版本</TabsTrigger>
        </TabsList>

        {/* ───────── 调试 ───────── */}
        <TabsContent value="debug" className="mt-4">
          <div className="border border-border rounded-lg px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 mb-4">
            <p className="text-xs">
              <span className="font-medium">调试模式</span>
              <span className="text-muted-foreground"> · 左侧与调试 AI 沟通配置调整，右侧直接与智能体对话验证效果。当前未保存的修改不会影响线上运行。</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Left: assistant */}
            <div className="border border-border rounded-lg bg-card flex flex-col h-[640px]">
              <div className="px-3 h-10 shrink-0 border-b border-border flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold">调试助手</span>
                <Badge variant="outline" className="text-[10px] h-4">AI</Badge>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-3">
                {assistantMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-2 px-4">
                    <Sparkles className="w-7 h-7 opacity-30" />
                    <p className="text-xs">告诉我你想怎么调整这个智能体</p>
                    <p className="text-[10px] leading-relaxed">例如："让回复更简洁"、"补充一下 BigQuery 的用途"</p>
                  </div>
                )}
                {assistantMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap leading-relaxed ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>{msg.content}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-3 flex items-center gap-2">
                <Input
                  className="h-8 text-xs"
                  placeholder='告诉我要怎么调整'
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAssistantMessage(); } }}
                />
                <Button size="sm" className="h-8 text-xs gap-1.5" onClick={sendAssistantMessage} disabled={!assistantInput.trim()}>
                  <Send className="w-3 h-3" />发送
                </Button>
              </div>
            </div>

            {/* Right: agent run with chat/logs tab */}
            <div className="border border-border rounded-lg bg-card flex flex-col h-[640px]">
              <Tabs value={runView} onValueChange={(v) => setRunView(v as "chat" | "logs")} className="flex flex-col flex-1 min-h-0">
                <div className="px-3 h-10 shrink-0 border-b border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Bot className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-xs font-semibold shrink-0">智能体运行</span>
                    {debugRunning && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0 ml-1">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />运行中
                      </span>
                    )}
                  </div>
                  <TabsList className="h-7 p-0.5 shrink-0">
                    <TabsTrigger value="chat" className="text-[11px] h-6 px-2 gap-1">
                      <Bot className="w-3 h-3" />对话
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="text-[11px] h-6 px-2 gap-1">
                      <Terminal className="w-3 h-3" />日志
                      {debugLogs.length > 0 && (
                        <span className="ml-0.5 px-1 rounded bg-muted text-muted-foreground text-[9px] leading-tight">{debugLogs.length}</span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="chat" forceMount className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
                  <div className="flex-1 overflow-auto p-4 space-y-3 min-h-0">
                    {runMessages.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
                        <MessageSquare className="w-7 h-7 opacity-30" />
                        <p className="text-xs">输入测试任务，与智能体真实对话</p>
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
                              <Zap className="w-2.5 h-2.5" />调用：{msg.tool}
                            </div>
                          )}
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {debugRunning && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />智能体执行中…
                        <button type="button" onClick={() => setRunView("logs")} className="text-primary hover:underline">查看运行日志 →</button>
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
                    <Button size="sm" className="h-8 text-xs gap-1.5" onClick={runDebug} disabled={debugRunning || !debugInput.trim()}>
                      <Send className="w-3 h-3" />发送
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
                            info: "text-sky-300", thought: "text-violet-300", tool: "text-emerald-300",
                            warn: "text-amber-300", error: "text-red-400", result: "text-cyan-300",
                          };
                          const iconMap: Record<LogLevel, JSX.Element> = {
                            info: <Info className="w-2.5 h-2.5" />, thought: <Brain className="w-2.5 h-2.5" />,
                            tool: <Wrench className="w-2.5 h-2.5" />, warn: <AlertTriangle className="w-2.5 h-2.5" />,
                            error: <AlertCircle className="w-2.5 h-2.5" />, result: <CheckCircle2 className="w-2.5 h-2.5" />,
                          };
                          return (
                            <div key={l.id} className="flex gap-2 py-0.5">
                              <span className="text-zinc-500 shrink-0">{l.ts}</span>
                              <span className={`shrink-0 flex items-center gap-1 ${colorMap[l.level]}`}>
                                {iconMap[l.level]}{l.level.padEnd(7)}
                              </span>
                              <span className="text-zinc-200 break-all">
                                {l.message}
                                {l.meta && <span className="text-zinc-500 ml-2">{l.meta}</span>}
                              </span>
                            </div>
                          );
                        })
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </TabsContent>

        {/* ───────── 配置 ───────── */}
        <TabsContent value="config" className="mt-4">
          {/* Sticky save bar */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border border-border rounded-lg px-4 py-2.5 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              {isDirty ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="font-medium">有未保存的修改</span>
                  <span className="text-muted-foreground">· 保存后会自动生成新版本，可在「版本」中查看或回滚</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-muted-foreground">当前为已保存版本 {versions.find((v) => v.current)?.v}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5" onClick={handleRevert} disabled={!isDirty}>
                <RotateCcw className="w-3.5 h-3.5" />撤销修改
              </Button>
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleSave} disabled={!isDirty}>
                <Save className="w-3.5 h-3.5" />保存为新版本
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[11px] text-muted-foreground px-1">
              名称、描述等基本信息请通过页面右上角的「编辑基本信息」修改，不会产生新版本。以下配置变更会生成新版本。
            </p>


            {/* 2. 模型与提示词 */}
            <section className="border border-border rounded-lg bg-card">
              <header className="px-4 py-2.5 border-b border-border">
                <h3 className="text-sm font-semibold">模型与提示词</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">决定智能体的"大脑"和工作方式</p>
              </header>
              <div className="p-4 space-y-3">
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
                    className="mt-1.5 font-mono text-xs leading-relaxed" />
                  <p className="text-[10px] text-muted-foreground mt-1.5">告诉智能体"你是谁、要做什么、怎么回答"。</p>
                </div>
              </div>
            </section>

            {/* 3. Skill 绑定 */}
            <section className="border border-border rounded-lg bg-card">
              <header className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-primary" />Skill 绑定</h3>
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
                  <div className="flex flex-wrap gap-2">
                    {selSkills.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs gap-1 pl-2.5 pr-1 py-1">
                        <Sparkles className="w-3 h-3 text-primary" />
                        {s}
                        <button onClick={() => toggleSkill(s)} className="ml-1 p-0.5 rounded hover:bg-muted-foreground/20">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* 4. MCP 绑定 */}
            <section className="border border-border rounded-lg bg-card">
              <header className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5"><Server className="w-3.5 h-3.5 text-primary" />MCP 绑定</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">连接外部系统（数据库、SaaS、内部 API），每个服务需要绑定一个凭据</p>
                </div>
                <CapabilityPickerDialog
                  items={getActiveMCPs()}
                  selected={mcpBindings.map((b) => b.name)}
                  onToggle={(n) => {
                    const idx = mcpBindings.findIndex((b) => b.name === n);
                    if (idx >= 0) removeMcp(idx); else addMcp(n);
                  }}
                  icon={<Server className="w-3.5 h-3.5" />}
                  label="MCP"
                  marketLink="/"
                  deployBadge={() => "云端"}
                  trigger={<Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0"><Plus className="w-3 h-3" />添加 MCP</Button>}
                />
              </header>
              <div className="p-4">
                {mcpBindings.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">尚未绑定任何 MCP。点击右上角「添加 MCP」选择。</p>
                ) : (
                  <div className="space-y-2">
                    {mcpBindings.map((b, i) => {
                      const creds = credentialsByMcp(b.name);
                      const credMissing = !b.credential;
                      return (
                        <div key={b.name} className={`border rounded-md p-3 space-y-2 ${credMissing ? "border-amber-300 bg-amber-50/40" : "border-border"}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium flex items-center gap-1.5">
                              <Server className="w-3 h-3 text-primary" />{b.name}
                              {credMissing && (
                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-[9px] h-4 gap-1">
                                  <AlertTriangle className="w-2.5 h-2.5" />未绑定凭据
                                </Badge>
                              )}
                            </span>
                            <button onClick={() => removeMcp(i)} className="text-muted-foreground hover:text-destructive p-1" title="移除">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-[11px] text-muted-foreground shrink-0">凭据</Label>
                            <Select value={b.credential} onValueChange={(v) => updateMcpCred(i, v)}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={creds.length ? "选择凭据" : "凭据库无可用凭据"} /></SelectTrigger>
                              <SelectContent>
                                {creds.map((c) => (
                                  <SelectItem key={c.id} value={c.name} className="text-xs">
                                    {c.name} <span className="text-muted-foreground ml-1">({c.type})</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => navigate("/vault")}>管理凭据</Button>
                          </div>
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
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">发布为丰声 NEXT 群聊机器人，群成员 @ 即可触发对话</p>
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
                  <p className="text-[10px] text-muted-foreground mt-1.5">在丰声 NEXT 开发者后台「机器人管理」中获取，凭据将通过「凭据金库」加密存储</p>
                </div>
              </div>
            </section>
          </div>
        </TabsContent>

        {/* ───────── 运行记录 ───────── */}
        <TabsContent value="runs" className="mt-4">
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">来源</TableHead>
                  <TableHead>触发人</TableHead>
                  <TableHead>触发内容</TableHead>
                  <TableHead className="w-44">时间</TableHead>
                  <TableHead className="w-24">耗时</TableHead>
                  <TableHead className="w-24">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockRuns.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => { setActiveRun(r); setRunDetailView("transcript"); setExpandedTools({}); }}>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.source}</Badge></TableCell>
                    <TableCell className="text-xs">{r.trigger}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[280px]">{r.prompt}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{r.startedAt}</TableCell>
                    <TableCell className="text-xs font-mono">{r.duration}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Sheet open={!!activeRun} onOpenChange={(o) => !o && setActiveRun(null)}>
            <SheetContent className="w-[640px] sm:max-w-[640px] p-0 flex flex-col">
              <SheetHeader className="px-5 py-3 border-b border-border">
                <SheetTitle className="text-sm flex items-center gap-2">
                  <span>运行详情</span>
                  {activeRun && <span className="text-xs font-mono text-muted-foreground">{activeRun.id}</span>}
                </SheetTitle>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  {activeRun && (
                    <>
                      <span>来源：{activeRun.source}</span>
                      <span>触发人：{activeRun.trigger}</span>
                      <span>耗时：{activeRun.duration}</span>
                      {statusBadge(activeRun.status)}
                    </>
                  )}
                </div>
                <div className="inline-flex items-center bg-muted rounded-md p-0.5 w-fit mt-2">
                  <button
                    onClick={() => setRunDetailView("transcript")}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      runDetailView === "transcript" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >对话视图</button>
                  <button
                    onClick={() => setRunDetailView("debug")}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      runDetailView === "debug" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >调试视图</button>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-auto p-5">
                {runDetailView === "transcript" ? (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl px-3 py-2 text-xs bg-primary text-primary-foreground whitespace-pre-wrap">
                        {activeRun?.prompt}
                      </div>
                    </div>
                    {mockTranscript.slice(1).map((m, i) => (
                      <div key={i} className="flex justify-start">
                        <div className="max-w-[80%] rounded-2xl px-3 py-2 text-xs bg-secondary text-foreground whitespace-pre-wrap">
                          {m.tools && m.tools.length > 0 && (
                            <button
                              onClick={() => setExpandedTools({ ...expandedTools, [i]: !expandedTools[i] })}
                              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground mb-1.5"
                            >
                              {expandedTools[i] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              {m.tools.map((t) => `调用了 ${t.name} ×${t.count}`).join(" · ")}
                            </button>
                          )}
                          {expandedTools[i] && m.tools && (
                            <div className="border border-border rounded bg-background p-2 mb-1.5 space-y-1 font-mono text-[10px] text-muted-foreground">
                              {m.tools.map((t, j) => (
                                <div key={j}>→ {t.name}() · 调用 {t.count} 次 · 平均 1.2s</div>
                              ))}
                            </div>
                          )}
                          {m.content}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="font-mono text-[11px] space-y-1.5">
                    {mockDebugEvents.map((e, i) => (
                      <div key={i} className="border border-border rounded p-2 bg-muted/20">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-muted-foreground">{e.t}</span>
                          <Badge variant="outline" className="text-[9px] h-4 font-mono">{e.type}</Badge>
                        </div>
                        <pre className="text-[10px] text-foreground/80 whitespace-pre-wrap break-all">{JSON.stringify(e.data, null, 2)}</pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </TabsContent>

        {/* ───────── 版本 ───────── */}
        <TabsContent value="versions" className="mt-4">
          <div className="border border-border rounded-lg px-4 py-3 bg-muted/40 mb-4">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">关于版本</span> · 每次在「配置」中点击保存，都会自动生成一个新版本。你可以随时查看历史变更内容，或将当前线上版本回滚到任意历史版本。
            </p>
          </div>
          <div className="border border-border rounded-lg bg-card divide-y divide-border">
            {versions.map((v) => (
              <div key={v.v} className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-muted/30">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-mono font-semibold w-10 shrink-0">{v.v}</span>
                  <div className="min-w-0">
                    <div className="text-xs flex items-center gap-2">
                      <span className="truncate">{v.note}</span>
                      {v.current && <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-0 text-[9px] h-4 shrink-0">当前线上</Badge>}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{v.at} · {v.by}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1"><Eye className="w-3 h-3" />查看</Button>
                  {!v.current && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1"><RotateCcw className="w-3 h-3" />回滚</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>回滚到 {v.v}？</AlertDialogTitle>
                          <AlertDialogDescription>
                            将把当前线上版本切换到 <span className="font-mono">{v.v}</span>（{v.note}）。已发布的接入端会立即使用该版本。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRollback(v)}>确认回滚</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
          </div>
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
              名称与描述是展示给使用者的「门面」，调整这些不会影响智能体行为，因此不会产生新版本。
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
        versions={versions}
      />
    </div>
  );
};

export default AgentDetail;
