import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import {
  ArrowLeft, MessageSquare, Send, Save, Play, Code2, FormInput,
  History, Server, Wrench, Bot, ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { mockAgents, getActiveMCPs, mockCredentials } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

/* ───────── Built-in tools ───────── */
const builtInTools = [
  { key: "web_search", name: "web_search", desc: "联网搜索：查询实时资讯", default: true },
  { key: "bash", name: "bash", desc: "执行 Shell 命令", default: false },
  { key: "file_io", name: "file_io", desc: "读写工作区文件", default: true },
  { key: "code_exec", name: "code_exec", desc: "Python / Node 代码执行沙箱", default: false },
  { key: "image_gen", name: "image_gen", desc: "图像生成", default: false },
  { key: "fetch_url", name: "fetch_url", desc: "抓取网页内容并转 Markdown", default: true },
];

/* ───────── Mock run history ───────── */
type RunStatus = "success" | "failed" | "running";
interface RunRecord {
  id: string;
  source: "钉钉" | "Web 端" | "API";
  trigger: string;
  startedAt: string;
  duration: string;
  status: RunStatus;
  prompt: string;
}
const mockRuns: RunRecord[] = [
  { id: "run-001", source: "钉钉",  trigger: "廖奕通", startedAt: "2026-04-29 10:24:18", duration: "00:00:42", status: "success", prompt: "帮我整理今天的销售周报，按区域汇总" },
  { id: "run-002", source: "Web 端", trigger: "张毅超", startedAt: "2026-04-29 10:18:03", duration: "00:01:12", status: "success", prompt: "分析一下 Q1 用户留存数据" },
  { id: "run-003", source: "API",    trigger: "system",  startedAt: "2026-04-29 09:55:41", duration: "00:00:08", status: "failed",  prompt: "scheduled job: daily-summary" },
  { id: "run-004", source: "钉钉",  trigger: "杨彪龙", startedAt: "2026-04-29 09:42:11", duration: "00:00:33", status: "success", prompt: "把昨天的会议纪要总结一下" },
  { id: "run-005", source: "Web 端", trigger: "李四",   startedAt: "2026-04-29 09:20:55", duration: "00:02:18", status: "running", prompt: "对比一下竞品最近 3 个月的更新" },
];

/* ───────── Mock transcript / debug ───────── */
const mockTranscript = [
  { role: "user", content: "帮我整理今天的销售周报，按区域汇总" },
  { role: "agent", content: "好的，我先查询今天各区域的销售数据。", tools: [{ name: "web_search", count: 2 }, { name: "BigQuery MCP", count: 1 }] },
  { role: "agent", content: "已汇总完成，华东区 ¥1.2M（环比 +8%）、华南区 ¥0.9M（+3%）、华北区 ¥0.7M（-2%）。\n\n报告已生成 → 销售周报_20260429.md" },
];
const mockDebugEvents = [
  { t: "10:24:18.102", type: "session.start",      data: { session_id: "sess-9f2c", model: "claude-sonnet-4-6" } },
  { t: "10:24:18.245", type: "llm.request",        data: { messages: 1, tokens_in: 1240 } },
  { t: "10:24:19.812", type: "tool.call",          data: { name: "web_search", args: { q: "销售数据 2026-04-29" } } },
  { t: "10:24:21.044", type: "tool.result",        data: { name: "web_search", bytes: 4821, latency_ms: 1232 } },
  { t: "10:24:21.330", type: "tool.call",          data: { name: "BigQuery MCP", args: { sql: "SELECT region, sum(amount) ..." } } },
  { t: "10:24:23.118", type: "tool.result",        data: { name: "BigQuery MCP", rows: 3, latency_ms: 1788 } },
  { t: "10:24:24.501", type: "llm.response",       data: { tokens_out: 312, finish_reason: "stop" } },
  { t: "10:24:24.612", type: "session.end",        data: { status: "success", total_ms: 6510, total_tokens: 1552 } },
];

/* ───────── YAML helpers ───────── */
const buildYaml = (cfg: {
  name: string; description: string; model: string; systemPrompt: string;
  tools: string[]; mcpServers: { name: string; credential: string }[];
  dingtalk: { enabled: boolean; webhook: string };
}) => `# Agent Configuration
name: ${cfg.name}
description: ${cfg.description || ""}
model: ${cfg.model}

system_prompt: |
${cfg.systemPrompt.split("\n").map((l) => "  " + l).join("\n")}

tools:
${cfg.tools.map((t) => `  - ${t}`).join("\n") || "  []"}

mcp_servers:
${cfg.mcpServers.map((m) => `  - name: ${m.name}\n    credential: ${m.credential || "(未绑定)"}`).join("\n") || "  []"}

integrations:
  dingtalk:
    enabled: ${cfg.dingtalk.enabled}
    webhook: ${cfg.dingtalk.webhook || "''"}
`;

const AgentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const agent = mockAgents.find((a) => a.id === id);

  /* ── Online experience state ── */
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "agent"; content: string }[]>([]);

  /* ── Config state (form ⇄ yaml) ── */
  const [editMode, setEditMode] = useState<"form" | "yaml">("form");
  const [name, setName] = useState(agent?.name ?? "");
  const [description, setDescription] = useState(agent?.description ?? "");
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [systemPrompt, setSystemPrompt] = useState(
    "你是一名严谨的业务助理。请根据用户问题，调用合适的工具完成任务，并以结构化方式输出结果。"
  );
  const [enabledTools, setEnabledTools] = useState<string[]>(builtInTools.filter((t) => t.default).map((t) => t.key));
  const [mcpBindings, setMcpBindings] = useState<{ name: string; credential: string }[]>(
    (agent?.mcpServers ?? []).map((m) => ({ name: m, credential: "" }))
  );
  const [dingEnabled, setDingEnabled] = useState(false);
  const [dingWebhook, setDingWebhook] = useState("");
  const [versions, setVersions] = useState([
    { v: "v3", at: "2026-04-25 14:02", by: "廖奕通", note: "新增 BigQuery MCP" },
    { v: "v2", at: "2026-04-18 09:30", by: "廖奕通", note: "调整 system prompt 风格" },
    { v: "v1", at: "2026-04-10 16:45", by: "廖奕通", note: "初始版本" },
  ]);

  const cfgYaml = useMemo(
    () => buildYaml({ name, description, model, systemPrompt, tools: enabledTools, mcpServers: mcpBindings, dingtalk: { enabled: dingEnabled, webhook: dingWebhook } }),
    [name, description, model, systemPrompt, enabledTools, mcpBindings, dingEnabled, dingWebhook]
  );
  const [yamlDraft, setYamlDraft] = useState(cfgYaml);

  /* ── Run history state ── */
  const [activeRun, setActiveRun] = useState<RunRecord | null>(null);
  const [runView, setRunView] = useState<"transcript" | "debug">("transcript");
  const [expandedTools, setExpandedTools] = useState<Record<number, boolean>>({});

  if (!agent) return <div className="p-6">智能体不存在</div>;

  const allMcpOptions = getActiveMCPs().map((m) => m.name);
  const credentialsByMcp = (mcp: string) => mockCredentials.filter((c) => c.mcpServer === mcp);

  const handleSend = () => {
    if (!chatInput.trim()) return;
    setChatMessages([...chatMessages, { role: "user", content: chatInput }, { role: "agent", content: "（演示）已收到，正在调度工具处理…" }]);
    setChatInput("");
  };

  const handleSaveConfig = () => {
    if (editMode === "yaml") {
      // pretend to parse
      toast({ title: "YAML 已应用", description: "已与表单同步" });
    }
    const next = `v${versions.length + 1}`;
    setVersions([{ v: next, at: new Date().toISOString().slice(0, 16).replace("T", " "), by: "廖奕通", note: "更新配置" }, ...versions]);
    toast({ title: "已保存", description: `生成新版本 ${next}` });
  };

  const toggleTool = (k: string) =>
    setEnabledTools(enabledTools.includes(k) ? enabledTools.filter((x) => x !== k) : [...enabledTools, k]);

  const updateMcpCred = (i: number, cred: string) =>
    setMcpBindings(mcpBindings.map((m, idx) => (idx === i ? { ...m, credential: cred } : m)));

  const removeMcp = (i: number) => setMcpBindings(mcpBindings.filter((_, idx) => idx !== i));
  const addMcp = (n: string) => {
    if (mcpBindings.find((m) => m.name === n)) return;
    setMcpBindings([...mcpBindings, { name: n, credential: "" }]);
  };

  const statusBadge = (s: RunStatus) => {
    if (s === "success") return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-[10px] gap-1"><CheckCircle2 className="w-3 h-3" />成功</Badge>;
    if (s === "failed") return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-[10px] gap-1"><XCircle className="w-3 h-3" />失败</Badge>;
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 text-[10px] gap-1"><Clock className="w-3 h-3" />运行中</Badge>;
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <button onClick={() => navigate(-1)} className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          返回
        </button>
        <span>/</span>
        <span className="text-foreground">{agent.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center text-3xl">{agent.avatar}</div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{agent.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{agent.description}</p>
            <div className="flex items-center gap-2 mt-2">
              {agent.tags.map((tag, i) => (
                <Badge key={i} variant={i === 0 ? "default" : "outline"} className="text-xs">{tag}</Badge>
              ))}
              <Badge variant="outline" className="text-xs">
                {agent.status === "published" ? "已发布" : agent.status === "draft" ? "草稿" : "项目"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="experience">
        <TabsList>
          <TabsTrigger value="experience" className="gap-1.5"><MessageSquare className="w-3.5 h-3.5" />在线体验</TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5"><FormInput className="w-3.5 h-3.5" />配置</TabsTrigger>
          <TabsTrigger value="runs" className="gap-1.5"><History className="w-3.5 h-3.5" />运行记录</TabsTrigger>
        </TabsList>

        {/* ───────── 在线体验 ───────── */}
        <TabsContent value="experience" className="mt-4">
          <div className="border border-border rounded-lg bg-card flex flex-col h-[560px]">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium">在线试运行</span>
                <span className="text-[11px] text-muted-foreground">使用当前未保存配置</span>
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setChatMessages([])}>清空对话</Button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-12">
                  在下方输入消息开始体验，对话不会被保存到运行记录
                </div>
              ) : (
                chatMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                    }`}>{m.content}</div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-border p-3 flex items-center gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="输入消息，回车发送…"
                className="h-8 text-xs"
              />
              <Button size="sm" className="h-8 text-xs gap-1" onClick={handleSend}><Send className="w-3 h-3" />发送</Button>
            </div>
          </div>
        </TabsContent>

        {/* ───────── 配置 ───────── */}
        <TabsContent value="config" className="mt-4">
          {/* Mode switcher + actions */}
          <div className="flex items-center justify-between mb-3">
            <div className="inline-flex items-center bg-muted rounded-md p-0.5">
              <button
                onClick={() => setEditMode("form")}
                className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                  editMode === "form" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FormInput className="w-3 h-3" />表单
              </button>
              <button
                onClick={() => { setYamlDraft(cfgYaml); setEditMode("yaml"); }}
                className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                  editMode === "yaml" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Code2 className="w-3 h-3" />YAML
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">当前 {versions[0]?.v}</Badge>
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleSaveConfig}>
                <Save className="w-3.5 h-3.5" />保存为新版本
              </Button>
            </div>
          </div>

          {editMode === "yaml" ? (
            <div className="border border-border rounded-lg bg-card">
              <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">编辑 YAML，保存时将与表单字段同步</span>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setYamlDraft(cfgYaml)}>从表单重新生成</Button>
              </div>
              <Textarea
                value={yamlDraft}
                onChange={(e) => setYamlDraft(e.target.value)}
                className="font-mono text-xs leading-relaxed border-0 rounded-none resize-none focus-visible:ring-0"
                rows={26}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left: main config */}
              <div className="lg:col-span-2 space-y-4">
                {/* 基本信息 */}
                <div className="border border-border rounded-lg p-4 bg-card space-y-3">
                  <h3 className="text-xs font-semibold">基本信息</h3>
                  <div>
                    <Label className="text-xs">名称</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">描述</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1.5 text-xs" />
                  </div>
                </div>

                {/* Model + SP */}
                <div className="border border-border rounded-lg p-4 bg-card space-y-3">
                  <h3 className="text-xs font-semibold">模型与提示词</h3>
                  <div>
                    <Label className="text-xs">Model</Label>
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
                    <Label className="text-xs">System Prompt</Label>
                    <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={8}
                      className="mt-1.5 font-mono text-xs leading-relaxed" />
                  </div>
                </div>

                {/* Tools */}
                <div className="border border-border rounded-lg p-4 bg-card">
                  <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-3"><Wrench className="w-3.5 h-3.5" />Tools 工具集</h3>
                  <div className="space-y-1.5">
                    {builtInTools.map((t) => (
                      <div key={t.key} className="flex items-center justify-between border border-border rounded px-3 py-2">
                        <div>
                          <div className="text-xs font-mono">{t.name}</div>
                          <div className="text-[10px] text-muted-foreground">{t.desc}</div>
                        </div>
                        <Switch checked={enabledTools.includes(t.key)} onCheckedChange={() => toggleTool(t.key)} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* MCP Servers */}
                <div className="border border-border rounded-lg p-4 bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold flex items-center gap-1.5"><Server className="w-3.5 h-3.5" />MCP Servers</h3>
                    <Select value="" onValueChange={addMcp}>
                      <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="+ 添加" /></SelectTrigger>
                      <SelectContent>
                        {allMcpOptions.map((m) => (
                          <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {mcpBindings.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">未绑定任何 MCP 服务</p>
                  ) : (
                    <div className="space-y-2">
                      {mcpBindings.map((b, i) => {
                        const creds = credentialsByMcp(b.name);
                        return (
                          <div key={b.name} className="border border-border rounded p-2.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium flex items-center gap-1.5"><Server className="w-3 h-3 text-primary" />{b.name}</span>
                              <button onClick={() => removeMcp(i)} className="text-[10px] text-muted-foreground hover:text-destructive">移除</button>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-[10px] text-muted-foreground shrink-0">凭据</Label>
                              <Select value={b.credential} onValueChange={(v) => updateMcpCred(i, v)}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={creds.length ? "选择凭据" : "凭据库无可用凭据"} /></SelectTrigger>
                                <SelectContent>
                                  {creds.map((c) => (
                                    <SelectItem key={c.id} value={c.name} className="text-xs">{c.name} <span className="text-muted-foreground">({c.type})</span></SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => navigate("/vault")}>管理</Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* DingTalk */}
                <div className="border border-border rounded-lg p-4 bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold">钉钉机器人接入</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">将 Agent 发布至钉钉群聊，群成员 @ 即可触发</p>
                    </div>
                    <Switch checked={dingEnabled} onCheckedChange={setDingEnabled} />
                  </div>
                  {dingEnabled && (
                    <div>
                      <Label className="text-xs">Webhook 地址</Label>
                      <Input value={dingWebhook} onChange={(e) => setDingWebhook(e.target.value)}
                        placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."
                        className="mt-1.5 h-8 text-xs font-mono" />
                    </div>
                  )}
                </div>
              </div>

              {/* Right: version control */}
              <div className="border border-border rounded-lg bg-card h-fit">
                <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                  <h3 className="text-xs font-semibold flex items-center gap-1.5"><History className="w-3.5 h-3.5" />版本历史</h3>
                  <Badge variant="outline" className="text-[10px]">{versions.length}</Badge>
                </div>
                <div className="divide-y divide-border max-h-[520px] overflow-auto">
                  {versions.map((v, i) => (
                    <div key={v.v} className="px-4 py-2.5 hover:bg-muted/40">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold">{v.v}</span>
                        {i === 0 && <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-0 text-[9px] h-4">当前</Badge>}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{v.at} · {v.by}</div>
                      <div className="text-[11px] text-foreground/80 mt-1">{v.note}</div>
                      {i !== 0 && (
                        <div className="flex gap-1 mt-1.5">
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2">查看</Button>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2">回滚</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
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
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => { setActiveRun(r); setRunView("transcript"); setExpandedTools({}); }}>
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

          {/* Detail sheet */}
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
                    onClick={() => setRunView("transcript")}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      runView === "transcript" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    对话视图
                  </button>
                  <button
                    onClick={() => setRunView("debug")}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      runView === "debug" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    调试视图
                  </button>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-auto p-5">
                {runView === "transcript" ? (
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
      </Tabs>
    </div>
  );
};

export default AgentDetail;
