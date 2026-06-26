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
import { Plus, Pencil, Trash2, Server, AlertTriangle, Bot, Plug, Loader2, CheckCircle2, XCircle, Link2, X, Search, KeyRound, ShieldCheck, Lock, Tag, ExternalLink, Activity, RefreshCw, User, Users } from "lucide-react";

type McpType = "studio" | "sse" | "http";
import { sharedResources, mockAgents, getCredentialFreeMcps, getCredentialRequiredMcps } from "@/data/mockData";
import { setMcpConfigured, isMcpConfigured, subscribeMcpStore } from "@/data/mcpCredentialStore";
import { toast } from "@/hooks/use-toast";

type McpScope = "personal" | "project";

interface McpEntry {
  id: string;
  name: string;
  identifier: string;
  endpoint: string;
  deployment: string;
  createdAt: string;
  requiresCredential: boolean;
  type: McpType;
  /** 是否来自 MCP 广场（true 时部分字段不可编辑） */
  fromMarket?: boolean;
  description?: string;
  headers?: { key: string; value: string }[];
  stdioCommand?: string;
  stdioArgs?: string;
  envVars?: { key: string; value: string }[];
  scope?: McpScope;
}

const typeLabel = (t: McpType) => (t === "studio" ? "STDIO" : t === "sse" ? "SSE" : "StreamableHTTP");

// 免凭据 MCP 默认即在列表（视为来自 MCP 广场的预置条目）
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
  type: r.deployment === "本地" ? "studio" : "http",
  fromMarket: true,
}));


const VaultPage = () => {
  // 用户可见的所有 MCP（含预置免凭据条目 + 用户添加的）
  const [credMcps, setCredMcps] = useState<McpEntry[]>(() => [...freeMcps]);
  // 强制订阅 store（用于跨页面同步显示）
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = subscribeMcpStore(() => setTick((t) => t + 1));
    return () => { unsub(); };
  }, []);

  // 顶部模糊搜索：按名称或标识符过滤
  const [listSearch, setListSearch] = useState("");
  const mcps = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return credMcps;
    return credMcps.filter(
      (m) => m.name.toLowerCase().includes(q) || m.identifier.toLowerCase().includes(q),
    );
  }, [credMcps, listSearch]);

  const [createOpen, setCreateOpen] = useState(false);
  // 来自 MCP 广场的独立配置弹窗
  const [marketFormOpen, setMarketFormOpen] = useState(false);
  const [marketFormItem, setMarketFormItem] = useState<{ id: string; name: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<McpEntry | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, "ok" | "fail">>(() => {
    // 预置一些示例：让列表里同时存在「连接成功」「连接失败」状态，方便演示
    const r: Record<string, "ok" | "fail"> = {};
    freeMcps.forEach((m, i) => {
      if (i % 3 === 0) r[m.id] = "fail";
      else r[m.id] = "ok";
    });
    return r;
  });


  // 字段锁定（来自 MCP 广场添加时，地址/名称/标识不可改）
  const [locked, setLocked] = useState(false);
  // 编辑模式下仅可改请求头（用于 MCP 广场来源的条目）
  const [headersOnly, setHeadersOnly] = useState(false);
  const [docUrl, setDocUrl] = useState<string>("");

  // 手动创建表单
  const [mcpType, setMcpType] = useState<McpType>("http");
  const [endpoint, setEndpoint] = useState("");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [description, setDescription] = useState("");
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([]);
  const [scope, setScope] = useState<McpScope>("personal");
  const [createMode, setCreateMode] = useState<"market" | "dingtalk" | "manual">("market");
  const [marketSearch, setMarketSearch] = useState("");
  const [marketTag, setMarketTag] = useState<string>("__all__");
  const [dingtalkSearch, setDingtalkSearch] = useState("");
  // 钉钉 MCP URL 配置弹窗
  const [dingFormOpen, setDingFormOpen] = useState(false);
  const [dingFormItem, setDingFormItem] = useState<{ id: string; name: string; identifier: string; getUrlHref: string } | null>(null);
  const [dingUrl, setDingUrl] = useState("");
  const dingtalkMcps = useMemo(
    () => [
      { id: "dingtalk-doc", name: "钉钉文档MCP", identifier: "dingtalk-doc", description: "读写钉钉文档内容，支持新建、检索、编辑钉钉文档。", getUrlHref: "https://open.dingtalk.com/document/orgapp/dingtalk-doc-mcp" },
      { id: "dingtalk-sheet", name: "钉钉表格MCP", identifier: "dingtalk-sheet", description: "操作钉钉表格数据，支持单元格读写、批量更新与公式计算。", getUrlHref: "https://open.dingtalk.com/document/orgapp/dingtalk-sheet-mcp" },
      { id: "dingtalk-ai-sheet", name: "AI表格MCP", identifier: "dingtalk-ai-sheet", description: "调用钉钉 AI 表格能力，支持智能填充、字段分析与自动化生成。", getUrlHref: "https://open.dingtalk.com/document/orgapp/dingtalk-ai-sheet-mcp" },
    ],
    [],
  );
  const dingtalkList = useMemo(() => {
    const q = dingtalkSearch.trim().toLowerCase();
    if (!q) return dingtalkMcps;
    return dingtalkMcps.filter((m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
  }, [dingtalkMcps, dingtalkSearch]);
  // Studio 专用
  const [stdioCommand, setStdioCommand] = useState("npx");
  const [stdioArgs, setStdioArgs] = useState("");
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);

  // 市场列表 = 所有需凭据的 MCP
  const allMarketMcps = useMemo(() => getCredentialRequiredMcps(), []);
  const marketTags = useMemo(() => {
    const set = new Set<string>();
    allMarketMcps.forEach((m) => set.add(m.tag));
    return Array.from(set).sort();
  }, [allMarketMcps]);
  const marketList = useMemo(() => {
    const q = marketSearch.toLowerCase();
    return allMarketMcps.filter(
      (r) =>
        (marketTag === "__all__" || r.tag === marketTag) &&
        (r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)),
    );
  }, [marketSearch, marketTag, allMarketMcps]);

  const reset = () => {
    setEndpoint(""); setName(""); setIdentifier(""); setDescription("");
    setHeaders([]);
    setMcpType("http"); setStdioCommand("npx"); setStdioArgs(""); setEnvVars([]);
    setLocked(false);
    setHeadersOnly(false);
    setDocUrl("");
    setScope("personal");
  };

  const linkedAgents = (mcpName: string) =>
    mockAgents.filter((a) => a.mcpServers?.includes(mcpName)).map((a) => a.name);

  const runTest = (id: string, label: string) => {
    setTestingId(id);
    setTimeout(() => {
      // 演示用：服务地址包含 fail / invalid / error 关键字时强制返回失败，便于复现 badcase
      const entry = credMcps.find((m) => m.id === id);
      const forceFail = !!entry?.endpoint && /(fail|invalid|error|broken)/i.test(entry.endpoint);
      const ok = forceFail ? false : Math.random() > 0.3;
      setTestResult((r) => ({ ...r, [id]: ok ? "ok" : "fail" }));
      setTestingId(null);
      if (!ok) {
        toast({
          title: "✗ 连接失败",
          description: `${label} 无法连接：请检查服务地址是否可达、请求头/凭据是否正确`,
          variant: "destructive",
        });
      }
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
    setEndpoint(m.endpoint);
    setName(m.name);
    setIdentifier(m.identifier);
    setDescription(m.description ?? "");
    setMcpType(m.type);
    setHeaders(m.headers ?? []);
    setStdioCommand(m.stdioCommand ?? "npx");
    setStdioArgs(m.stdioArgs ?? "");
    setEnvVars(m.envVars ?? []);
    setLocked(!!m.fromMarket);
    setHeadersOnly(false);
    setScope(m.scope ?? "personal");

    // 钉钉 MCP：复用钉钉添加弹窗（仅 URL 可编辑）
    const ding = dingtalkMcps.find((d) => d.identifier === m.identifier);
    if (ding) {
      setDingFormItem(ding);
      setDingUrl(m.endpoint);
      setDingFormOpen(true);
      return;
    }
    // 来自 MCP 广场：复用广场配置弹窗（与添加一致，含锁定字段）
    if (m.fromMarket) {
      setMarketFormItem({ id: m.id, name: m.name });
      setMarketFormOpen(true);
      return;
    }
    // 手动创建：原表单
    setCreateMode("manual");
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
      setCredMcps((arr) => arr.map((m) => m.id === editingId ? {
        ...m,
        // 来自广场的不允许覆盖锁定字段
        ...(m.fromMarket ? {} : { name, identifier, description, type: mcpType }),
        endpoint,
        headers,
        stdioCommand,
        stdioArgs,
        envVars,
        scope,
      } : m));
      const editedId = editingId;
      setTimeout(() => runTest(editedId, name), 200);
    } else {

      const id = `m_${Date.now()}`;
      const newEntry: McpEntry = {
        id, name, identifier, endpoint, deployment: "Remote",
        createdAt: new Date().toISOString().slice(0, 10),
        requiresCredential: true, type: mcpType,
        fromMarket: locked, description, headers, stdioCommand, stdioArgs, envVars,
        scope,
      };
      setCredMcps((arr) => [newEntry, ...arr]);
      setMcpConfigured(name, true);
      
      // 创建后自动触发一次连通性测试
      setTimeout(() => runTest(id, name), 200);

    }
    setCreateOpen(false);
    setMarketFormOpen(false);
    setMarketFormItem(null);
    setEditingId(null);
    reset();
  };

  const startAddFromMarket = (it: { id: string; name: string; provider?: string; deployment?: string; description?: string }) => {
    reset();
    setLocked(true);
    setName(it.name);
    setIdentifier(it.id);
    setDescription(it.description ?? "");
    setEndpoint(`https://mcp.example.com/${it.provider ?? "svc"}/${it.id}/http`);
    setMcpType("http");
    setMarketFormItem({ id: it.id, name: it.name });
    setMarketFormOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setCredMcps((arr) => arr.filter((m) => m.id !== deleteTarget.id));
    setMcpConfigured(deleteTarget.name, false);
    
    setDeleteTarget(null);
  };

  const renderHeadersOnly = () => (
    <div className="space-y-3 max-h-[440px] overflow-auto -mx-1 px-1">
      <div className="flex items-start gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5">
        <Lock className="w-3 h-3 text-primary mt-0.5 shrink-0" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          来自 MCP 广场的条目，基础信息已固定，仅可编辑下方「请求头」。
        </p>
      </div>
      <div className="rounded-md border border-border bg-muted/30 p-2.5 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">名称</span>
          <span className="text-xs font-medium truncate">{name}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">标识</span>
          <span className="text-[11px] font-mono truncate">{identifier}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">类型</span>
          <span className="text-[11px] font-mono">{typeLabel(mcpType)}</span>
        </div>
        {endpoint && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">服务地址</span>
            <span className="text-[11px] font-mono truncate max-w-[280px]" title={endpoint}>{endpoint}</span>
          </div>
        )}
      </div>
      <div>
        <Label className="text-[11px] font-medium">请求头</Label>
        <p className="text-[10px] text-muted-foreground mt-0.5">发送到该 MCP 服务的额外 HTTP 请求头（如 Authorization、X-API-Key 等）</p>
        {headers.length > 0 && (
          <div className="space-y-1.5 mt-1.5">
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
        <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1 border-dashed mt-1.5"
          onClick={() => setHeaders((arr) => [...arr, { key: "", value: "" }])}>
          <Plus className="w-3 h-3" /> 添加请求头
        </Button>
      </div>
    </div>
  );

  const renderForm = () => (
    <div className="space-y-3 max-h-[440px] overflow-auto -mx-1 px-1">
      {locked && (
        <div className="flex items-start gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5">
          <Lock className="w-3 h-3 text-primary mt-0.5 shrink-0" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            来自 MCP 广场，显示名称、英文标识、简介与类型已自动填入且不可修改；请在下方完成凭据等配置。
          </p>
        </div>
      )}

      {/* 1. 显示名称 */}
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

      {/* 2. 英文标识 */}
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

      {/* 3. 简介 */}
      <div>
        <Label className="text-[11px] font-medium flex items-center gap-1">
          简介
          {locked && <Lock className="w-2.5 h-2.5 text-muted-foreground" />}
        </Label>
        <p className="text-[10px] text-muted-foreground mt-0.5">一句话说明该 MCP 的用途，便于在列表中识别</p>
        <Textarea
          className="mt-1 text-xs bg-muted/30 min-h-[60px]"
          value={description}
          readOnly={locked}
          disabled={locked}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="例如 提供钉钉文档的读写与搜索能力"
        />
      </div>

      {/* 4. 类型 */}
      <div>
        <Label className="text-[11px] font-medium flex items-center gap-1">
          类型
          {locked && <Lock className="w-2.5 h-2.5 text-muted-foreground" />}
        </Label>
        <p className="text-[10px] text-muted-foreground mt-0.5">不同类型对应不同的接入与配置格式</p>
        <div className="mt-1.5 flex items-center gap-5">
          {([
            { v: "studio", label: "STDIO" },
            { v: "sse", label: "SSE" },
            { v: "http", label: "StreamableHTTP" },
          ] as { v: McpType; label: string }[]).map((opt) => {
            const active = mcpType === opt.v;
            return (
              <label key={opt.v} className={`flex items-center gap-1.5 text-xs ${locked ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${active ? "border-primary" : "border-muted-foreground/40"}`}>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </span>
                <input type="radio" name="mcp-type" className="sr-only" checked={active} disabled={locked} onChange={() => !locked && setMcpType(opt.v)} />
                <span className={active ? "text-foreground" : "text-muted-foreground"}>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 5. 其他内容（按类型） */}
      {mcpType === "studio" && (
        <div className="space-y-2 rounded-md border border-border bg-muted/20 p-2.5">
          <div>
            <Label className="text-[11px] font-medium">启动命令</Label>
            <p className="text-[10px] text-muted-foreground mt-0.5">本地可执行命令，例如 npx / uvx / node</p>
            <Input className="mt-1 h-8 text-xs bg-background font-mono" value={stdioCommand} onChange={(e) => setStdioCommand(e.target.value)} placeholder="npx" />
          </div>
          <div>
            <Label className="text-[11px] font-medium">参数</Label>
            <p className="text-[10px] text-muted-foreground mt-0.5">每行一个参数，将依次传给命令</p>
            <Textarea className="mt-1 text-xs bg-background font-mono min-h-[64px]" value={stdioArgs} onChange={(e) => setStdioArgs(e.target.value)} placeholder={"-y\n@modelcontextprotocol/server-xxx"} />
          </div>
          <div>
            <Label className="text-[11px] font-medium">环境变量</Label>
            <p className="text-[10px] text-muted-foreground mt-0.5">启动命令时注入的环境变量（如 API Key、Token 等）</p>
            {envVars.length > 0 && (
              <div className="space-y-1.5 mt-1.5">
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
            <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1 border-dashed mt-1.5"
              onClick={() => setEnvVars((arr) => [...arr, { key: "", value: "" }])}>
              <Plus className="w-3 h-3" /> 添加环境变量
            </Button>
          </div>
        </div>
      )}

      {mcpType === "sse" && (
        <div>
          <Label className="text-[11px] font-medium flex items-center gap-1">
            服务地址
            {locked && <Lock className="w-2.5 h-2.5 text-muted-foreground" />}
          </Label>
          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
            <span>SSE MCP 服务的访问链接，由服务提供方给出</span>
            {docUrl && (
              <a href={docUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                获取地址 <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </p>
          <Input
            className="mt-1 h-8 text-xs bg-muted/30"
            value={endpoint}
            readOnly={locked}
            disabled={locked}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="例如 https://mcp.example.com/xxx/sse"
          />
        </div>
      )}

      {mcpType === "http" && (
        <>
          <div>
            <Label className="text-[11px] font-medium flex items-center gap-1">
              服务地址
              {locked && <Lock className="w-2.5 h-2.5 text-muted-foreground" />}
            </Label>
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
              <span>MCP 服务的访问链接，由服务提供方给出</span>
              {docUrl && (
                <a href={docUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                  获取地址 <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </p>
            <Input
              className="mt-1 h-8 text-xs bg-muted/30"
              value={endpoint}
              readOnly={locked}
              disabled={locked}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="例如 https://mcp.example.com/xxx"
            />
          </div>

          <div>
            <Label className="text-[11px] font-medium">请求头</Label>
            <p className="text-[10px] text-muted-foreground mt-0.5">发送到 MCP 服务器的额外 HTTP 请求头（如 Authorization、X-API-Key 等）</p>
            {headers.length > 0 && (
              <div className="space-y-1.5 mt-1.5">
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
            <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1 border-dashed mt-1.5"
              onClick={() => setHeaders((arr) => [...arr, { key: "", value: "" }])}>
              <Plus className="w-3 h-3" /> 添加请求头
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="p-6 max-w-[1100px] mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            MCP 管理
          </h1>
        </div>
        <Button size="sm" onClick={openCreate} className="h-8 text-xs gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          新增 MCP
        </Button>
      </div>

      <div className="mt-4 relative max-w-[320px]">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-8 text-xs pl-8 bg-muted/30"
          placeholder="搜索 MCP 名称或标识符"
          value={listSearch}
          onChange={(e) => setListSearch(e.target.value)}
        />
      </div>

      <div className="mt-3">
        {mcps.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-16 text-center text-[11px] text-muted-foreground">
            未找到匹配的 MCP
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {mcps.map((m) => {
              const status = testResult[m.id];
              const testing = testingId === m.id;
              const statusStyle =
                testing
                  ? "bg-muted text-muted-foreground ring-border"
                  : status === "ok"
                  ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20"
                  : status === "fail"
                  ? "bg-destructive/10 text-destructive ring-destructive/20"
                  : "bg-muted/60 text-muted-foreground ring-border";
              const statusLabel =
                testing ? "测试中…" : status === "ok" ? "连接成功" : status === "fail" ? "连接失败" : "未测试";
              const StatusIcon = testing ? Loader2 : status === "ok" ? CheckCircle2 : status === "fail" ? XCircle : Activity;
              return (
                <div
                  key={m.id}
                  className="group relative rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-[0_4px_16px_-6px_hsl(var(--primary)/0.18)] transition-all cursor-pointer overflow-hidden"
                  onClick={() => openEdit(m)}
                >
                  {/* Header */}
                  <div className="p-3.5 flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10 flex items-center justify-center shrink-0">
                      <Server className="w-[18px] h-[18px] text-primary" />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-[13px] font-semibold leading-tight truncate" title={m.name}>{m.name}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground min-w-0">
                        <span className="font-mono truncate">{m.identifier}</span>
                        <span className="text-border shrink-0">·</span>
                        <span className="font-mono whitespace-nowrap shrink-0">{typeLabel(m.type)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 -mr-1 -mt-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground [&_svg]:size-3.5" title="编辑"
                        onClick={(e) => { e.stopPropagation(); openEdit(m); }}>
                        <Pencil />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 [&_svg]:size-3.5" title="删除"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(m); }}>
                        <Trash2 />
                      </Button>
                    </div>
                  </div>

                  {/* Footer: status + test action */}
                  <div className="px-3.5 py-2 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${statusStyle}`}
                    >
                      <StatusIcon className={`w-2.5 h-2.5 ${testing ? "animate-spin" : ""}`} />
                      {statusLabel}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={testing}
                      className="h-6 px-2 text-[11px] gap-1 text-primary hover:text-primary hover:bg-primary/10 [&_svg]:size-3"
                      onClick={(e) => { e.stopPropagation(); runTest(m.id, m.name); }}
                    >
                      {testing ? <Loader2 className="animate-spin" /> : <Plug />}
                      {testing ? "测试中" : "测试连通性"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className={(createMode === "market" || createMode === "dingtalk") && !editingId ? "max-w-[760px] p-4" : "max-w-[520px] p-4"}>
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-sm">{editingId ? "编辑 MCP 服务" : "新增 MCP"}</DialogTitle>
          </DialogHeader>

          <Tabs value={createMode} onValueChange={(v) => setCreateMode(v as "market" | "dingtalk" | "manual")} className="w-full">
            {!editingId && (
              <TabsList className="grid grid-cols-3 w-full bg-muted/40 h-8 mb-3">
                <TabsTrigger value="market" className="text-xs h-6">领慧MCP</TabsTrigger>
                <TabsTrigger value="dingtalk" className="text-xs h-6">钉钉 MCP</TabsTrigger>
                <TabsTrigger value="manual" className="text-xs h-6">手动创建</TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="market" className="mt-0 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-8 text-xs pl-8 bg-muted/30"
                    placeholder="搜索 MCP 名称或功能描述"
                    value={marketSearch}
                    onChange={(e) => setMarketSearch(e.target.value)}
                  />
                </div>
                <Select value={marketTag} onValueChange={setMarketTag}>
                  <SelectTrigger className="h-8 w-[130px] text-xs shrink-0 gap-1">
                    <Tag className="w-3 h-3 text-muted-foreground" />
                    <SelectValue placeholder="标签" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__" className="text-xs">全部标签</SelectItem>
                    {marketTags.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium">可选</span>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">{marketList.length}</Badge>
                <span className="text-muted-foreground">需凭据</span>
              </div>

              <div className="max-h-[400px] overflow-auto -mx-1 px-1">
                {marketList.length === 0 ? (
                  <p className="text-center text-[11px] text-muted-foreground py-8">未找到匹配的 MCP</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {marketList.map((it) => {
                      const done = isMcpConfigured(it.name);
                      return (
                        <div
                          key={it.id}
                          className={`border rounded-lg p-3 transition-colors flex flex-col ${done ? "border-emerald-300/60 bg-emerald-50/40 dark:bg-emerald-950/10" : "border-border bg-card"}`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${done ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                              <Server className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold truncate" title={it.name}>{it.name}</p>
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal text-muted-foreground">
                                  {it.tag}
                                </Badge>
                              </div>
                            </div>
                          </div>


                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-2 min-h-[32px]">{it.description}</p>
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/60">
                            <button className="text-[11px] text-primary hover:underline">查看详情</button>
                            {done ? (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-[10px] gap-1">
                                <CheckCircle2 className="w-3 h-3" />已配置
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                className="h-7 text-[11px] px-3"
                                onClick={() => startAddFromMarket(it)}
                              >
                                添加
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="dingtalk" className="mt-0 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-8 text-xs pl-8 bg-muted/30"
                    placeholder="搜索 钉钉 MCP 名称或功能描述"
                    value={dingtalkSearch}
                    onChange={(e) => setDingtalkSearch(e.target.value)}
                  />
                </div>
              </div>


              <div className="max-h-[400px] overflow-auto -mx-1 px-1">
                {dingtalkList.length === 0 ? (
                  <p className="text-center text-[11px] text-muted-foreground py-8">未找到匹配的钉钉 MCP</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5">
                    {dingtalkList.map((it) => {
                      const done = isMcpConfigured(it.name);
                      return (
                        <div
                          key={it.id}
                          className={`border rounded-lg p-3 transition-colors flex flex-col ${done ? "border-emerald-300/60 bg-emerald-50/40 dark:bg-emerald-950/10" : "border-border bg-card"}`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate" title={it.name}>{it.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">{it.identifier}</p>
                          </div>

                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-2 min-h-[32px]">{it.description}</p>
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/60">
                            <button className="text-[11px] text-primary hover:underline">查看详情</button>
                            {done ? (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-[10px] gap-1">
                                <CheckCircle2 className="w-3 h-3" />已配置
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                className="h-7 text-[11px] px-3"
                                onClick={() => {
                                  setDingFormItem(it);
                                  setDingUrl("");
                                  setDingFormOpen(true);
                                }}
                              >
                                添加
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="manual" className="mt-0">
              {headersOnly ? renderHeadersOnly() : renderForm()}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {(createMode === "market" || createMode === "dingtalk") && !editingId ? "完成" : "取消"}
            </Button>
            {(createMode === "manual" || editingId) && (
              <Button onClick={handleSave} disabled={!canSave}>
                {editingId ? "保存并测试" : "添加并连接"}
              </Button>
            )}

          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 来自 MCP 广场的独立配置弹窗 */}
      <Dialog open={marketFormOpen} onOpenChange={(o) => { if (!o) { setMarketFormOpen(false); setMarketFormItem(null); setEditingId(null); reset(); } }}>
        <DialogContent className="max-w-[520px] p-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-sm">{editingId ? "编辑" : "配置"} MCP{marketFormItem ? ` · ${marketFormItem.name}` : ""}</DialogTitle>
            <DialogDescription className="text-[11px]">
              来自 MCP 广场，服务地址、显示名称与英文标识已自动填入；请完成类型、请求头等凭据配置后保存
            </DialogDescription>
          </DialogHeader>

          {renderForm()}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setMarketFormOpen(false); setMarketFormItem(null); setEditingId(null); reset(); }}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {editingId ? "保存并测试" : "添加并连接"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* 钉钉 MCP URL 配置弹窗 */}
      <Dialog
        open={dingFormOpen}
        onOpenChange={(o) => {
          if (!o) { setDingFormOpen(false); setDingFormItem(null); setDingUrl(""); setEditingId(null); }
        }}
      >
        <DialogContent className="max-w-[480px] p-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-sm">{editingId ? "编辑" : "配置"}钉钉 MCP{dingFormItem ? ` · ${dingFormItem.name}` : ""}</DialogTitle>
          </DialogHeader>

          {dingFormItem && (
            <div className="space-y-3">

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">服务 URL <span className="text-destructive">*</span></Label>
                  <a
                    href={dingFormItem.getUrlHref}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    获取 URL <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <Input
                  className="h-8 text-xs font-mono"
                  placeholder="https://api.dingtalk.com/v1/mcp/..."
                  value={dingUrl}
                  onChange={(e) => setDingUrl(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">
                  请在钉钉开放平台开通后复制专属 URL 粘贴至此处。
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDingFormOpen(false); setDingFormItem(null); setDingUrl(""); setEditingId(null); }}>
              取消
            </Button>
            <Button
              disabled={!dingUrl.trim() || !dingFormItem}
              onClick={() => {
                if (!dingFormItem || !dingUrl.trim()) return;
                if (editingId) {
                  setCredMcps((arr) => arr.map((m) => m.id === editingId ? { ...m, endpoint: dingUrl.trim() } : m));
                  setTimeout(() => runTest(editingId, dingFormItem.name), 200);
                } else {
                  const id = `m_${Date.now()}`;
                  const newEntry: McpEntry = {
                    id,
                    name: dingFormItem.name,
                    identifier: dingFormItem.identifier,
                    endpoint: dingUrl.trim(),
                    deployment: "Remote",
                    createdAt: new Date().toISOString().slice(0, 10),
                    requiresCredential: true,
                    type: "http",
                    fromMarket: true,
                    description: "钉钉 MCP 服务",
                    headers: [],
                  };
                  setCredMcps((arr) => [newEntry, ...arr]);
                  setMcpConfigured(dingFormItem.name, true);
                  setTimeout(() => runTest(id, dingFormItem.name), 200);
                }
                setDingFormOpen(false);
                setCreateOpen(false);
                setDingFormItem(null);
                setDingUrl("");
                setEditingId(null);
              }}
            >
              {editingId ? "保存并测试" : "添加并连接"}
            </Button>
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
