import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Server, AlertTriangle, Bot, Plug, Loader2, CheckCircle2, XCircle, Link2, X, Search, KeyRound, ShieldCheck, Lock } from "lucide-react";

type McpType = "studio" | "sse" | "http";
import { sharedResources, mockAgents, getCredentialFreeMcps, getCredentialRequiredMcps } from "@/data/mockData";
import { setMcpConfigured, isMcpConfigured, subscribeMcpStore } from "@/data/mcpCredentialStore";
import { toast } from "@/hooks/use-toast";

interface McpEntry {
  id: string;
  name: string;
  identifier: string;
  endpoint: string;
  deployment: string;
  createdAt: string;
  requiresCredential: boolean;
}

// 免凭据 MCP 默认即在列表
const freeMcps: McpEntry[] = getCredentialFreeMcps().map((r, i) => ({
  id: r.id,
  name: r.name,
  identifier: `mcp-${String(i + 1).padStart(2, "0")}`,
  endpoint:
    r.deployment === "本地"
      ? `http://localhost:${3000 + i}/mcp`
      : `https://mcp.example.com/${r.provider ?? "svc"}/${r.id}/http`,
  deployment: r.deployment ?? "云端",
  createdAt: r.addedAt,
  requiresCredential: false,
}));

const VaultPage = () => {
  // 用户已配置凭据 / 手动新增的 MCP
  const [credMcps, setCredMcps] = useState<McpEntry[]>([]);
  // 强制订阅 store（用于跨页面同步显示）
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = subscribeMcpStore(() => setTick((t) => t + 1));
    return () => { unsub(); };
  }, []);

  const mcps = useMemo(() => [...credMcps, ...freeMcps], [credMcps]);

  const [createOpen, setCreateOpen] = useState(false);
  // 来自 MCP 广场的独立配置弹窗
  const [marketFormOpen, setMarketFormOpen] = useState(false);
  const [marketFormItem, setMarketFormItem] = useState<{ id: string; name: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<McpEntry | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, "ok" | "fail">>({});

  // 字段锁定（来自 MCP 广场添加时，地址/名称/标识不可改）
  const [locked, setLocked] = useState(false);

  // 手动创建表单
  const [mcpType, setMcpType] = useState<McpType>("http");
  const [endpoint, setEndpoint] = useState("");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([]);
  const [timeout, setTimeoutVal] = useState("30");
  const [sseTimeout, setSseTimeout] = useState("300");
  const [tab, setTab] = useState<"headers" | "config">("headers");
  const [createMode, setCreateMode] = useState<"market" | "manual">("market");
  const [marketSearch, setMarketSearch] = useState("");
  // Studio 专用
  const [stdioCommand, setStdioCommand] = useState("npx");
  const [stdioArgs, setStdioArgs] = useState("");
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);

  // 市场列表 = 所有需凭据的 MCP
  const marketList = useMemo(() => {
    const q = marketSearch.toLowerCase();
    return getCredentialRequiredMcps().filter(
      (r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
    );
  }, [marketSearch]);

  const reset = () => {
    setEndpoint(""); setName(""); setIdentifier("");
    setHeaders([]); setTimeoutVal("30"); setSseTimeout("300"); setTab("headers");
    setMcpType("http"); setStdioCommand("npx"); setStdioArgs(""); setEnvVars([]);
    setLocked(false);
  };

  const linkedAgents = (mcpName: string) =>
    mockAgents.filter((a) => a.mcpServers?.includes(mcpName)).map((a) => a.name);

  const runTest = (id: string, label: string) => {
    setTestingId(id);
    setTimeout(() => {
      const ok = Math.random() > 0.2;
      setTestResult((r) => ({ ...r, [id]: ok ? "ok" : "fail" }));
      setTestingId(null);
      toast({
        title: ok ? "连接成功" : "连接失败",
        description: ok ? `${label} 已与目标服务完成握手` : `${label} 无法连接，请检查端点 URL 或服务可达性`,
        variant: ok ? "default" : "destructive",
      });
    }, 900);
  };

  const openCreate = () => {
    reset();
    setEditingId(null);
    setCreateMode("market");
    setMarketSearch("");
    setCreateOpen(true);
  };

  const openEdit = (m: McpEntry) => {
    reset();
    setEditingId(m.id);
    setCreateMode("manual");
    setEndpoint(m.endpoint);
    setName(m.name);
    setIdentifier(m.identifier);
    setCreateOpen(true);
  };

  const canSave =
    name.trim() && identifier.trim() &&
    (mcpType === "studio" ? stdioCommand.trim() : endpoint.trim());

  const handleSave = () => {
    if (!name.trim()) return toast({ title: "请填写显示名称", variant: "destructive" });
    if (!identifier.trim()) return toast({ title: "请填写英文标识", variant: "destructive" });
    if (mcpType === "studio") {
      if (!stdioCommand.trim()) return toast({ title: "请填写启动命令", variant: "destructive" });
    } else if (!endpoint.trim()) {
      return toast({ title: "请填写服务地址", variant: "destructive" });
    }

    if (editingId) {
      setCredMcps((arr) => arr.map((m) => m.id === editingId ? { ...m, endpoint, name, identifier } : m));
      toast({ title: "MCP 已更新", description: `${name} 已保存` });
    } else {
      const id = `m_${Date.now()}`;
      setCredMcps((arr) => [{ id, name, identifier, endpoint, deployment: "Remote", createdAt: new Date().toISOString().slice(0, 10), requiresCredential: true }, ...arr]);
      setMcpConfigured(name, true);
      toast({ title: "MCP 已添加", description: `${name} 已加入 MCP 管理` });
    }
    setCreateOpen(false);
    setMarketFormOpen(false);
    setMarketFormItem(null);
    setEditingId(null);
    reset();
  };

  const startAddFromMarket = (it: { id: string; name: string; provider?: string; deployment?: string }) => {
    reset();
    setLocked(true);
    setName(it.name);
    setIdentifier(it.id);
    setEndpoint(`https://mcp.example.com/${it.provider ?? "svc"}/${it.id}/http`);
    setMcpType("http");
    setTab("headers");
    setMarketFormItem({ id: it.id, name: it.name });
    setMarketFormOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setCredMcps((arr) => arr.filter((m) => m.id !== deleteTarget.id));
    setMcpConfigured(deleteTarget.name, false);
    toast({ title: "MCP 已删除", description: `${deleteTarget.name} 已从 MCP 管理中移除` });
    setDeleteTarget(null);
  };

  return (
    <div className="p-6 max-w-[1100px] mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            MCP 管理
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            免凭据 MCP 已默认接入；需凭据 MCP 请通过「新增 MCP」配置凭据后启用
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="w-4 h-4" />
          新增 MCP
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden mt-5">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs h-9 whitespace-nowrap">名称</TableHead>
              <TableHead className="text-xs h-9 whitespace-nowrap">标识符</TableHead>
              <TableHead className="text-xs h-9 whitespace-nowrap">服务端点</TableHead>
              <TableHead className="text-xs h-9 whitespace-nowrap w-[110px]">凭据</TableHead>
              <TableHead className="text-xs h-9 whitespace-nowrap w-[110px]">使用情况</TableHead>
              <TableHead className="text-xs h-9 whitespace-nowrap w-[100px]">创建时间</TableHead>
              <TableHead className="text-xs h-9 whitespace-nowrap w-[140px]">测试连接</TableHead>
              
            </TableRow>
          </TableHeader>
          <TableBody>
            {mcps.map((m) => {
              const agents = linkedAgents(m.name);
              return (
                <TableRow key={m.id}>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <Server className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-xs font-medium truncate" title={m.name}>{m.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-[11px] text-muted-foreground font-mono whitespace-nowrap">{m.identifier}</TableCell>
                  <TableCell className="py-2 text-[11px] text-muted-foreground font-mono max-w-[240px]">
                    <div className="flex items-center gap-1 min-w-0">
                      <Link2 className="w-3 h-3 shrink-0" />
                      <span className="truncate" title={m.endpoint}>{m.endpoint}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 whitespace-nowrap">
                    {m.requiresCredential ? (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-[10px] gap-1"><KeyRound className="w-3 h-3" />已配置</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-[10px] gap-1"><ShieldCheck className="w-3 h-3" />免凭据</Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-2 whitespace-nowrap">
                    {agents.length > 0 ? (
                      <Badge variant="secondary" className="text-[11px] gap-1 font-normal">
                        <Bot className="w-3 h-3" />
                        {agents.length} 个智能体
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">未使用</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-[11px] text-muted-foreground whitespace-nowrap">{m.createdAt}</TableCell>
                  <TableCell className="py-2 whitespace-nowrap">
                    {testingId === m.id ? (
                      <Button size="sm" variant="outline" className="h-7 text-[11px] px-2 gap-1" disabled>
                        <Loader2 className="w-3 h-3 animate-spin" />测试中
                      </Button>
                    ) : testResult[m.id] === "ok" ? (
                      <button
                        onClick={() => runTest(m.id, m.name)}
                        className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-emerald-100 text-emerald-700 text-[11px] hover:bg-emerald-200 transition-colors"
                        title="重新测试"
                      >
                        <CheckCircle2 className="w-3 h-3" />已连通
                      </button>
                    ) : testResult[m.id] === "fail" ? (
                      <button
                        onClick={() => runTest(m.id, m.name)}
                        className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-red-100 text-red-700 text-[11px] hover:bg-red-200 transition-colors"
                        title="重新测试"
                      >
                        <XCircle className="w-3 h-3" />连接失败
                      </button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] px-2 gap-1"
                        onClick={() => runTest(m.id, m.name)}
                      >
                        <Plug className="w-3 h-3" />测试连接
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>


      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-[560px] p-5">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-sm">{editingId ? "编辑 MCP 服务" : "新增 MCP"}</DialogTitle>
            <DialogDescription className="text-[11px]">
              免凭据 MCP 已自动接入，无需手动添加；这里仅用于配置「需凭据」的 MCP 或手动接入自有 MCP
            </DialogDescription>
          </DialogHeader>

          <Tabs value={createMode} onValueChange={(v) => setCreateMode(v as "market" | "manual")} className="w-full">
            {!editingId && (
              <TabsList className="grid grid-cols-2 w-full bg-muted/40 h-8 mb-3">
                <TabsTrigger value="market" className="text-xs h-6">从 MCP 广场配置</TabsTrigger>
                <TabsTrigger value="manual" className="text-xs h-6">手动创建</TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="market" className="mt-0 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-8 text-xs pl-8 bg-muted/30"
                  placeholder="搜索 MCP 名称或功能描述"
                  value={marketSearch}
                  onChange={(e) => setMarketSearch(e.target.value)}
                />
              </div>
              <div className="max-h-[420px] overflow-auto -mx-1 px-1 space-y-2">
                {marketList.length === 0 ? (
                  <p className="text-center text-[11px] text-muted-foreground py-8">未找到匹配的 MCP</p>
                ) : marketList.map((it) => {
                  const done = isMcpConfigured(it.name);
                  return (
                    <div
                      key={it.id}
                      className={`border rounded-lg p-2.5 transition-colors ${done ? "border-emerald-300/60 bg-emerald-50/40 dark:bg-emerald-950/10" : "border-border bg-card"}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${done ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                          <Server className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold truncate">{it.name}</p>
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-0.5 border-amber-300 text-amber-700 bg-amber-50/60">
                              <KeyRound className="w-2.5 h-2.5" />需凭据
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{it.description}</p>
                        </div>
                        {done ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-[10px] gap-1 shrink-0 mt-1">
                            <CheckCircle2 className="w-3 h-3" />已配置
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            className="h-7 text-[11px] px-2 shrink-0 gap-1"
                            onClick={() => startAddFromMarket(it)}
                          >
                            <Plus className="w-3 h-3" />添加
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="manual" className="mt-0 space-y-3 max-h-[520px] overflow-auto -mx-1 px-1">
            {locked && (
              <div className="flex items-start gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5">
                <Lock className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  来自 MCP 广场，服务地址、显示名称与英文标识已自动填入且不可修改；请在下方完成类型与请求头等配置。
                </p>
              </div>
            )}

            <div>
              <Label className="text-[11px] font-medium">类型</Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">不同类型对应不同的接入与配置格式</p>
              <div className="mt-1.5 flex items-center gap-5">
                {([
                  { v: "studio", label: "STDIO" },
                  { v: "sse", label: "SSE" },
                  { v: "http", label: "StreamableHTTP" },
                ] as { v: McpType; label: string }[]).map((opt) => {
                  const active = mcpType === opt.v;
                  return (
                    <label key={opt.v} className="flex items-center gap-1.5 cursor-pointer text-xs">
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${active ? "border-primary" : "border-muted-foreground/40"}`}>
                        {active && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      </span>
                      <input
                        type="radio"
                        name="mcp-type"
                        className="sr-only"
                        checked={active}
                        onChange={() => setMcpType(opt.v)}
                      />
                      <span className={active ? "text-foreground" : "text-muted-foreground"}>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {mcpType !== "studio" && (
              <div>
                <Label className="text-[11px] font-medium flex items-center gap-1">
                  服务地址
                  {locked && <Lock className="w-2.5 h-2.5 text-muted-foreground" />}
                </Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">MCP 服务的访问链接，由服务提供方给出</p>
                <Input
                  className="mt-1 h-8 text-xs bg-muted/30"
                  value={endpoint}
                  readOnly={locked}
                  disabled={locked}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder={mcpType === "sse" ? "例如 https://mcp.example.com/xxx/sse" : "例如 https://mcp.example.com/xxx"}
                />
              </div>
            )}

            <div>
              <Label className="text-[11px] font-medium flex items-center gap-1">
                显示名称
                {locked && <Lock className="w-2.5 h-2.5 text-muted-foreground" />}
              </Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">展示在列表与智能体里的名字，方便识别</p>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  className="h-8 text-xs bg-muted/30 flex-1"
                  value={name}
                  readOnly={locked}
                  disabled={locked}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如 钉钉文档"
                />
                <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shrink-0" title="图标">
                  <Server className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-medium flex items-center gap-1">
                英文标识
                {locked && <Lock className="w-2.5 h-2.5 text-muted-foreground" />}
              </Label>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                供系统内部调用的英文别名，创建后不可修改；仅支持小写字母、数字、下划线和连字符，最多 24 个字符
              </p>
              <Input
                className="mt-1 h-8 text-xs bg-muted/30 font-mono"
                value={identifier}
                maxLength={24}
                readOnly={locked}
                disabled={locked}
                onChange={(e) => setIdentifier(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="例如 my-mcp-server"
              />
            </div>

            {/* Studio：命令 + 参数 */}
            {mcpType === "studio" && (
              <div className="space-y-2 rounded-md border border-border bg-muted/20 p-2.5">
                <div>
                  <Label className="text-[11px] font-medium">启动命令</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">本地可执行命令，例如 npx / uvx / node</p>
                  <Input
                    className="mt-1 h-8 text-xs bg-background font-mono"
                    value={stdioCommand}
                    onChange={(e) => setStdioCommand(e.target.value)}
                    placeholder="npx"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-medium">参数</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">每行一个参数，将依次传给命令</p>
                  <Textarea
                    className="mt-1 text-xs bg-background font-mono min-h-[64px]"
                    value={stdioArgs}
                    onChange={(e) => setStdioArgs(e.target.value)}
                    placeholder={"-y\n@modelcontextprotocol/server-xxx"}
                  />
                </div>
              </div>
            )}

            <Tabs value={tab} onValueChange={(v) => setTab(v as "headers" | "config")} className="w-full">
              <TabsList className="grid grid-cols-2 w-full bg-muted/40 h-8">
                <TabsTrigger value="headers" className="text-xs h-6">
                  {mcpType === "studio" ? "环境变量" : "请求头"}
                </TabsTrigger>
                <TabsTrigger value="config" className="text-xs h-6">配置</TabsTrigger>
              </TabsList>

              <TabsContent value="headers" className="space-y-2 mt-3">
                {mcpType === "studio" ? (
                  <>
                    <div>
                      <div className="text-[11px] font-medium">环境变量</div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        启动命令时注入的环境变量（如 API Key、Token 等）
                      </p>
                    </div>
                    {envVars.length === 0 ? (
                      <div className="text-[10px] text-muted-foreground">未配置环境变量</div>
                    ) : (
                      <div className="space-y-1.5">
                        {envVars.map((h, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <Input className="h-7 text-xs flex-1 font-mono" placeholder="KEY" value={h.key}
                              onChange={(e) => setEnvVars((arr) => arr.map((x, idx) => idx === i ? { ...x, key: e.target.value } : x))} />
                            <Input className="h-7 text-xs flex-1 font-mono" placeholder="value" value={h.value}
                              onChange={(e) => setEnvVars((arr) => arr.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))} />
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEnvVars((arr) => arr.filter((_, idx) => idx !== i))}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1 border-dashed"
                      onClick={() => setEnvVars((arr) => [...arr, { key: "", value: "" }])}>
                      <Plus className="w-3 h-3" /> 添加环境变量
                    </Button>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="text-[11px] font-medium">请求头</div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        发送到 MCP 服务器的额外 HTTP 请求头（如 Authorization、X-API-Key 等）
                      </p>
                    </div>
                    {headers.length === 0 ? (
                      <div className="text-[10px] text-muted-foreground">未配置自定义请求头</div>
                    ) : (
                      <div className="space-y-1.5">
                        {headers.map((h, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <Input className="h-7 text-xs flex-1" placeholder="Header" value={h.key}
                              onChange={(e) => setHeaders((arr) => arr.map((x, idx) => idx === i ? { ...x, key: e.target.value } : x))} />
                            <Input className="h-7 text-xs flex-1" placeholder="Value" value={h.value}
                              onChange={(e) => setHeaders((arr) => arr.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))} />
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setHeaders((arr) => arr.filter((_, idx) => idx !== i))}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1 border-dashed"
                      onClick={() => setHeaders((arr) => [...arr, { key: "", value: "" }])}>
                      <Plus className="w-3 h-3" /> 添加请求头
                    </Button>
                  </>
                )}
              </TabsContent>

              <TabsContent value="config" className="space-y-2 mt-3">
                <div>
                  <Label className="text-[11px] font-medium">超时时间（秒）</Label>
                  <Input className="mt-1 h-8 text-xs bg-muted/30" value={timeout} onChange={(e) => setTimeoutVal(e.target.value)} />
                </div>
                {mcpType === "sse" && (
                  <div>
                    <Label className="text-[11px] font-medium">SSE 读取超时时间（秒）</Label>
                    <Input className="mt-1 h-8 text-xs bg-muted/30" value={sseTimeout} onChange={(e) => setSseTimeout(e.target.value)} />
                  </div>
                )}
              </TabsContent>
            </Tabs>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {createMode === "market" && !editingId ? "完成" : "取消"}
            </Button>
            {(createMode === "manual" || editingId) && (
              <Button onClick={handleSave} disabled={!canSave}>
                {editingId ? "保存" : "添加并授权"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              确认删除 MCP
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-xs">
                <p>
                  即将删除 MCP「<span className="font-medium text-foreground">{deleteTarget?.name}</span>」。
                  删除后无法恢复，且会立即从所有正在使用的智能体中移除。
                </p>
                {deleteTarget && (() => {
                  const agents = linkedAgents(deleteTarget.name);
                  if (agents.length === 0) {
                    return <p className="text-muted-foreground">该 MCP 当前未被任何智能体使用，可以安全删除。</p>;
                  }
                  return (
                    <div className="border border-destructive/30 bg-destructive/5 rounded-md p-3">
                      <div className="flex items-center gap-1.5 text-destructive font-medium mb-2">
                        <Bot className="w-3.5 h-3.5" />
                        以下 {agents.length} 个智能体正在使用，删除后将无法调用对应 MCP：
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {agents.map((n) => (
                          <Badge key={n} variant="outline" className="text-[10px]">{n}</Badge>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VaultPage;
